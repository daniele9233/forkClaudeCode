mod sidecar;

use sidecar::Sidecar;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct AppState {
    pub sidecar: Arc<Sidecar>,
}

/// Returns the `base_url` of the running opencode sidecar.
/// Called once by the frontend on startup.
#[tauri::command]
async fn get_opencode_url(state: tauri::State<'_, AppState>) -> Result<String, String> {
    state
        .sidecar
        .state()
        .map(|s| s.base_url)
        .ok_or_else(|| "opencode sidecar not running".into())
}

/// Gracefully shuts down the opencode sidecar (called before app exit if needed).
#[tauri::command]
async fn stop_opencode(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.sidecar.stop();
    Ok(())
}

/// Restart the sidecar (used by the UI's "Reconnect" action after a crash).
/// Re-emits `opencode-ready` / `opencode-error` so the frontend re-initializes.
#[tauri::command]
async fn restart_opencode(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let sidecar = state.sidecar.clone();
    match sidecar.restart().await {
        Ok(s) => {
            let _ = app.emit("opencode-ready", s.base_url.clone());
            spawn_health_monitor(app, sidecar);
            Ok(s.base_url)
        }
        Err(e) => {
            let _ = app.emit("opencode-error", e.clone());
            Err(e)
        }
    }
}

/// Poll the sidecar's health endpoint; if it stops responding while we still
/// believe it is up, tell the UI so it can offer a reconnect instead of
/// silently failing every request. Stops itself once a restart supersedes it.
fn spawn_health_monitor(handle: AppHandle, sidecar: Arc<Sidecar>) {
    use std::time::Duration;
    let generation = sidecar.generation();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(3)).await;
            // Superseded by a restart, or deliberately stopped → end this monitor.
            if sidecar.generation() != generation || sidecar.state().is_none() {
                return;
            }
            if sidecar.is_healthy().await {
                continue;
            }
            // Re-check after a short delay to avoid reacting to transient blips.
            tokio::time::sleep(Duration::from_secs(1)).await;
            if sidecar.generation() != generation || sidecar.state().is_none() {
                return;
            }
            if !sidecar.is_healthy().await {
                sidecar.stop();
                let _ = handle.emit(
                    "opencode-error",
                    "opencode sidecar stopped responding".to_string(),
                );
                return;
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar = Arc::new(Sidecar::new());
    let sidecar_clone = sidecar.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { sidecar })
        .setup(move |app| {
            let sidecar = sidecar_clone.clone();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match sidecar.start().await {
                    Ok(state) => {
                        // Notify the frontend that the sidecar is ready.
                        let _ = handle.emit("opencode-ready", state.base_url);
                        // Watch for unexpected exits and report them.
                        spawn_health_monitor(handle, sidecar);
                    }
                    Err(e) => {
                        let _ = handle.emit("opencode-error", e);
                    }
                }
            });
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Sidecar has kill_on_drop, so it will stop automatically.
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_opencode_url,
            stop_opencode,
            restart_opencode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
