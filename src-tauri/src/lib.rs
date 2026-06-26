mod sidecar;

use sidecar::Sidecar;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::OnceCell;

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
        .invoke_handler(tauri::generate_handler![get_opencode_url, stop_opencode])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
