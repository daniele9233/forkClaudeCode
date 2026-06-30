mod config_store;
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

/// Returns the engine version string (`opencode --version`) for the UI's
/// version-compatibility check against the pinned SDK.
#[tauri::command]
async fn opencode_version(state: tauri::State<'_, AppState>) -> Result<String, String> {
    state.sidecar.version().await
}

/// Persist a provider definition (added from the GUI) into the global
/// opencode config on disk, so it survives engine/app restarts. `entry_json`
/// is the JSON for `provider.<id>`. Returns the written file path.
#[tauri::command]
fn persist_opencode_provider(id: String, entry_json: String) -> Result<String, String> {
    config_store::persist_provider(&id, &entry_json)
}

/// Verify an API key against an OpenAI-compatible provider by listing models
/// (`GET {base_url}/models` with a Bearer token). Done from Rust so it bypasses
/// webview CORS and the engine entirely — pure key validation. `Ok` means the
/// provider accepted the key; `Err` carries the provider's rejection detail.
#[tauri::command]
async fn test_provider_key(base_url: String, api_key: String) -> Result<String, String> {
    let base = base_url.trim().trim_end_matches('/');
    let url = format!("{base}/models");
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("http client error: {e}"))?;

    let resp = client
        .get(&url)
        .bearer_auth(api_key.trim())
        .send()
        .await
        .map_err(|e| format!("could not reach {base}: {e}"))?;

    let status = resp.status();
    if status.is_success() {
        return Ok(format!("ok ({})", status.as_u16()));
    }
    let body = resp.text().await.unwrap_or_default();
    let snippet: String = body.chars().take(180).collect();
    Err(format!("HTTP {} — {}", status.as_u16(), snippet.trim()))
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
            restart_opencode,
            opencode_version,
            persist_opencode_provider,
            test_provider_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
