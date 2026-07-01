mod config_store;
mod preview_server;
mod sidecar;

use preview_server::PreviewServer;
use sidecar::Sidecar;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct AppState {
    pub sidecar: Arc<Sidecar>,
    /// Built-in static file server for the web preview (None if it failed to
    /// bind — preview is then unavailable but the app still works).
    pub preview: Option<Arc<PreviewServer>>,
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

/// Inject a provider API key into the engine's environment (e.g.
/// `DEEPSEEK_API_KEY`) and restart the sidecar so the engine's native provider
/// picks it up — this is opencode's primary, well-tested key mechanism.
/// Re-emits `opencode-ready` with the new URL so the frontend re-initializes.
#[tauri::command]
async fn set_provider_key(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    env_var: String,
    key: String,
) -> Result<String, String> {
    let sidecar = state.sidecar.clone();
    sidecar.set_env(env_var.trim().to_string(), key.trim().to_string());
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

/// The project directory the engine is currently running in (its cwd). Falls
/// back to the app's launch cwd when no project was explicitly opened.
#[tauri::command]
async fn get_working_dir(state: tauri::State<'_, AppState>) -> Result<String, String> {
    if let Some(dir) = state.sidecar.working_dir() {
        return Ok(dir.display().to_string());
    }
    std::env::current_dir()
        .map(|d| d.display().to_string())
        .map_err(|e| format!("cwd error: {e}"))
}

/// Switch the project: point the engine at `path`, restart it there, remember
/// it for next launch, and re-emit `opencode-ready` with the new URL.
#[tauri::command]
async fn set_working_dir(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    let dir = PathBuf::from(path.trim());
    if !dir.is_dir() {
        return Err(format!("not a folder: {}", dir.display()));
    }
    let sidecar = state.sidecar.clone();
    sidecar.set_working_dir(Some(dir.clone()));
    // Point the static preview server at the new project too.
    if let Some(preview) = &state.preview {
        preview.set_root(Some(dir.clone()));
    }
    let _ = config_store::save_last_project(&dir.display().to_string());
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

/// Derive the destination folder name from a git URL
/// (`…/foo.git` or `…/foo` → `foo`).
fn repo_dir_name(url: &str) -> String {
    let trimmed = url.trim().trim_end_matches('/');
    let last = trimmed.rsplit('/').next().unwrap_or("repo");
    last.strip_suffix(".git").unwrap_or(last).to_string()
}

/// Clone a git repository into `parent_dir`. Uses the system `git` (so it reuses
/// whatever credentials git already has for private repos). Returns the absolute
/// path of the cloned folder; the caller then opens it via `set_working_dir`.
#[tauri::command]
async fn clone_repo(url: String, parent_dir: String) -> Result<String, String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("empty repository URL".into());
    }
    let parent = PathBuf::from(parent_dir.trim());
    if !parent.is_dir() {
        return Err(format!("not a folder: {}", parent.display()));
    }
    let name = repo_dir_name(&url);
    let dest = parent.join(&name);
    if dest.exists() {
        return Err(format!("'{name}' already exists in that folder"));
    }
    let out = tokio::process::Command::new("git")
        .arg("clone")
        .arg(&url)
        .arg(&dest)
        .output()
        .await
        .map_err(|e| format!("could not run git (is it installed?): {e}"))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(format!("git clone failed: {}", err.trim()));
    }
    Ok(dest.display().to_string())
}

/// Create a new empty project folder under `parent_dir`, optionally running
/// `git init`. Returns the absolute path; the caller opens it via `set_working_dir`.
#[tauri::command]
async fn create_project(
    parent_dir: String,
    name: String,
    git_init: bool,
) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("empty project name".into());
    }
    let parent = PathBuf::from(parent_dir.trim());
    if !parent.is_dir() {
        return Err(format!("not a folder: {}", parent.display()));
    }
    let dest = parent.join(name);
    if dest.exists() {
        return Err(format!("'{name}' already exists in that folder"));
    }
    std::fs::create_dir_all(&dest).map_err(|e| format!("mkdir {}: {e}", dest.display()))?;
    if git_init {
        let out = tokio::process::Command::new("git")
            .arg("init")
            .current_dir(&dest)
            .output()
            .await
            .map_err(|e| format!("could not run git init: {e}"))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr);
            return Err(format!("git init failed: {}", err.trim()));
        }
    }
    Ok(dest.display().to_string())
}

/// URL of the built-in static preview server for the current project — but only
/// if the project actually has a servable entry page (`index.html`). Returns
/// `null` otherwise, so the UI can show its "no page yet" state instead of an
/// empty server root. This is what makes "ask for a page → see it" work with no
/// dev server: the agent writes index.html, we serve it.
#[tauri::command]
async fn preview_url(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let Some(preview) = &state.preview else {
        return Ok(None);
    };
    Ok(if preview.has_index() {
        Some(format!("{}/", preview.base_url()))
    } else {
        None
    })
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
    // Built-in static preview server (best-effort; None if it can't bind).
    let preview = PreviewServer::start().map(Arc::new);
    let preview_clone = preview.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState { sidecar, preview })
        .setup(move |app| {
            let sidecar = sidecar_clone.clone();
            let handle = app.handle().clone();
            // Reopen the last project (if it still exists) so the engine starts
            // in the folder the user was working on, not the app's launch dir.
            if let Some(dir) = config_store::load_last_project() {
                sidecar.set_working_dir(Some(dir.clone()));
                if let Some(preview) = &preview_clone {
                    preview.set_root(Some(dir));
                }
            }
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
            test_provider_key,
            set_provider_key,
            get_working_dir,
            set_working_dir,
            clone_repo,
            create_project,
            preview_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
