mod config_store;
mod dev_runner;
mod preview_server;
mod process;
mod sidecar;

use dev_runner::{DevRunner, DevStatus};
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
    /// kikkoCode-managed dev server (runs the project's dev command).
    pub dev: Arc<DevRunner>,
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

/// Verify an API key by listing models (`GET {base_url}/models`). Done from Rust
/// so it bypasses webview CORS and the engine entirely — pure key validation.
/// `Ok` means the provider accepted the key; `Err` carries the rejection detail.
///
/// Most providers are OpenAI-compatible (Bearer token). Anthropic is the
/// exception: it authenticates with an `x-api-key` header and requires an
/// `anthropic-version` header, so we special-case its host.
#[tauri::command]
async fn test_provider_key(base_url: String, api_key: String) -> Result<String, String> {
    let base = base_url.trim().trim_end_matches('/');
    let url = format!("{base}/models");
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("http client error: {e}"))?;

    let req = if base.contains("anthropic.com") {
        client
            .get(&url)
            .header("x-api-key", api_key.trim())
            .header("anthropic-version", "2023-06-01")
    } else {
        client.get(&url).bearer_auth(api_key.trim())
    };

    let resp = req
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
    let out = crate::process::hide_console(
        tokio::process::Command::new("git")
            .arg("clone")
            .arg(&url)
            .arg(&dest),
    )
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
        let out = crate::process::hide_console(
            tokio::process::Command::new("git")
                .arg("init")
                .current_dir(&dest),
        )
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

/// Start the project's dev server (managed by kikkoCode). Returns the command
/// line being run. Output streams as `dev-server-log` events; the frontend reads
/// the real URL from that output — no port guessing.
#[tauri::command]
async fn start_dev_server(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let dir = state
        .sidecar
        .working_dir()
        .ok_or("no project open — open a folder first")?;
    state.dev.start(app, &dir).await
}

/// Stop the kikkoCode-managed dev server.
#[tauri::command]
async fn stop_dev_server(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.dev.stop();
    Ok(())
}

/// Current dev-server status (running + command line).
#[tauri::command]
async fn dev_server_status(state: tauri::State<'_, AppState>) -> Result<DevStatus, String> {
    Ok(state.dev.status())
}

/// The dev command kikkoCode would run for the current project (e.g.
/// "pnpm run dev"), or null if the project has no dev/start script. Lets the UI
/// show a "Run dev server" button only when it makes sense.
#[tauri::command]
async fn dev_command_info(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let Some(dir) = state.sidecar.working_dir() else {
        return Ok(None);
    };
    Ok(dev_runner::detect_dev_command(&dir).map(|(_dir, pm, script)| format!("{pm} run {script}")))
}

/// Find a running local dev server on ANY port — not just the common defaults.
///
/// It enumerates the ports actually LISTENING on the machine (via `netstat`/`ss`)
/// and HTTP-probes them (plus the well-known dev ports as a safety net), then
/// returns the first that answers. This is what makes the preview find the site
/// automatically whatever port/framework it uses. `exclude` lets the caller drop
/// kikkoCode's own ports (UI dev server, engine, preview server).
#[tauri::command]
async fn find_dev_server(
    state: tauri::State<'_, AppState>,
    exclude: Vec<u16>,
) -> Result<Option<String>, String> {
    // Preference order for tie-breaking: well-known dev ports first, then any
    // other listening port ascending.
    const COMMON: [u16; 14] = [
        3000, 5173, 5174, 4173, 4200, 4321, 8080, 3001, 8000, 8081, 1234, 5000, 3333, 8888,
    ];

    let mut listening = listening_ports();
    for &p in &COMMON {
        if !listening.contains(&p) {
            listening.push(p);
        }
    }
    // Never mistake kikkoCode's own servers for the user's site: the UI dev
    // server (1420), the engine, and the built-in static preview server.
    let mut excluded: std::collections::HashSet<u16> =
        exclude.into_iter().chain(std::iter::once(1420u16)).collect();
    if let Some(s) = state.sidecar.state() {
        excluded.insert(s.port);
    }
    if let Some(preview) = &state.preview {
        excluded.insert(preview.port());
    }
    let candidates: Vec<u16> = listening
        .into_iter()
        .filter(|p| *p >= 1000 && !excluded.contains(p))
        .collect();

    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_millis(500))
        .build()
        .map_err(|e| format!("http client error: {e}"))?;

    let mut set = tokio::task::JoinSet::new();
    for &port in &candidates {
        let client = client.clone();
        set.spawn(async move {
            // Probe BOTH IPv4 and IPv6 loopback: on Windows `localhost` often
            // resolves to ::1, and Vite/Next bind there — an IPv4-only probe
            // would miss a server that's actually up. Only accept a real page
            // (status < 400): a 404/500 means "something is listening" but it's
            // not the site we want (this is how a stray service on some port
            // used to get picked by mistake).
            for host in ["127.0.0.1", "[::1]"] {
                let url = format!("http://{host}:{port}/");
                if let Ok(resp) = client.get(&url).send().await {
                    if resp.status().as_u16() < 400 {
                        return Some(port);
                    }
                }
            }
            None
        });
    }
    let mut live = std::collections::HashSet::new();
    while let Some(res) = set.join_next().await {
        if let Ok(Some(port)) = res {
            live.insert(port);
        }
    }
    if live.is_empty() {
        return Ok(None);
    }

    // Prefer a well-known dev port; otherwise the lowest live port.
    let chosen = COMMON
        .iter()
        .copied()
        .find(|p| live.contains(p))
        .or_else(|| {
            let mut v: Vec<u16> = live.iter().copied().collect();
            v.sort_unstable();
            v.first().copied()
        });
    // Return the URL as `localhost` so the webview resolves it the same way the
    // dev server expects (and passes any Host-header checks).
    Ok(chosen.map(|p| format!("http://localhost:{p}/")))
}

/// Enumerate TCP ports in a LISTENING state on this machine, best-effort. Parses
/// `netstat` (Windows) or `ss`/`netstat` (unix); returns an empty vec if neither
/// is available. We only keep the port number of each local listening socket.
fn listening_ports() -> Vec<u16> {
    let output = if cfg!(windows) {
        crate::process::hide_console_std(
            std::process::Command::new("netstat").args(["-an", "-p", "TCP"]),
        )
        .output()
    } else {
        std::process::Command::new("sh")
            .arg("-c")
            .arg("ss -ltn 2>/dev/null || netstat -an 2>/dev/null")
            .output()
    };

    let Ok(out) = output else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&out.stdout);
    let mut ports = std::collections::HashSet::new();
    for line in text.lines() {
        // Only listening sockets (Windows: "LISTENING", ss/netstat: "LISTEN").
        if !line.contains("LISTEN") {
            continue;
        }
        // On a LISTEN line the foreign address is `*:*` / `0.0.0.0:*`, so the
        // only token ending in `:<digits>` is the local port we want.
        for tok in line.split_whitespace() {
            if let Some(idx) = tok.rfind(':') {
                if let Ok(port) = tok[idx + 1..].parse::<u16>() {
                    ports.insert(port);
                }
            }
        }
    }
    ports.into_iter().collect()
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

/// Route the in-app preview through the built-in injecting proxy. With a
/// `target` (a dev-server URL) the preview server forwards everything to it and
/// injects the visual-inspector script into HTML — element selection then works
/// on any site with zero project changes. `None` switches back to static mode.
/// Returns the URL the iframe should load (the proxy), or None if the preview
/// server isn't available (caller falls back to loading the target directly).
#[tauri::command]
async fn set_preview_proxy(
    state: tauri::State<'_, AppState>,
    target: Option<String>,
) -> Result<Option<String>, String> {
    let Some(preview) = &state.preview else {
        return Ok(None);
    };
    let is_proxy = target.is_some();
    preview.set_proxy_target(target);
    Ok(if is_proxy {
        Some(format!("{}/", preview.base_url()))
    } else {
        None
    })
}

/// The project's `AGENTS.md` directory (the engine's cwd).
fn project_dir(state: &tauri::State<'_, AppState>) -> Result<PathBuf, String> {
    state
        .sidecar
        .working_dir()
        .or_else(|| std::env::current_dir().ok())
        .ok_or_else(|| "no project directory".into())
}

/// Read the project's `AGENTS.md` (the file opencode natively injects into the
/// agent's context). Returns None if it doesn't exist yet.
#[tauri::command]
async fn read_agents_file(
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    let path = project_dir(&state)?.join("AGENTS.md");
    match std::fs::read_to_string(&path) {
        Ok(text) => Ok(Some(text)),
        Err(_) => Ok(None),
    }
}

/// Overwrite the project's `AGENTS.md` (the Rules editor's save).
#[tauri::command]
async fn write_agents_file(
    state: tauri::State<'_, AppState>,
    content: String,
) -> Result<String, String> {
    let path = project_dir(&state)?.join("AGENTS.md");
    std::fs::write(&path, content).map_err(|e| format!("write {}: {e}", path.display()))?;
    Ok(path.display().to_string())
}

const MEM_START: &str = "<!-- kikko:memory:start -->";
const MEM_END: &str = "<!-- kikko:memory:end -->";

/// Merge the distilled project memory into `AGENTS.md`, inside marker comments.
/// Everything the human wrote outside the markers is preserved verbatim; only
/// the machine-managed block is replaced (or appended on first use). Because
/// opencode injects AGENTS.md natively, whatever lands here IS the agent's
/// long-term memory — no extra plumbing.
#[tauri::command]
async fn update_agents_memory(
    state: tauri::State<'_, AppState>,
    memory: String,
) -> Result<String, String> {
    let path = project_dir(&state)?.join("AGENTS.md");
    let existing = std::fs::read_to_string(&path).unwrap_or_default();

    let block = format!("{MEM_START}\n{}\n{MEM_END}", memory.trim());
    let next = match (existing.find(MEM_START), existing.find(MEM_END)) {
        (Some(start), Some(end)) if end > start => {
            let after = end + MEM_END.len();
            format!("{}{}{}", &existing[..start], block, &existing[after..])
        }
        _ if existing.trim().is_empty() => {
            format!("# Project instructions\n\n{block}\n")
        }
        _ => format!("{}\n\n{block}\n", existing.trim_end()),
    };

    std::fs::write(&path, next).map_err(|e| format!("write {}: {e}", path.display()))?;
    Ok(path.display().to_string())
}

/// Fetch a text resource over HTTPS (skill import from GitHub raw URLs).
/// Capped to 200 KB; done from Rust to bypass webview CORS.
#[tauri::command]
async fn fetch_text(url: String) -> Result<String, String> {
    let url = url.trim().to_string();
    if !url.starts_with("https://") {
        return Err("only https:// URLs are allowed".into());
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("http client error: {e}"))?;
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("could not fetch {url}: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {} fetching {url}", resp.status().as_u16()));
    }
    let text = resp.text().await.map_err(|e| format!("read body: {e}"))?;
    Ok(text.chars().take(200_000).collect())
}

/// Discard the working-tree changes of a single file in the current project
/// (the ✗ of the review panel). Tracked file → `git checkout HEAD -- <path>`;
/// untracked (newly added) file → delete it. The GUI asks for confirmation
/// before calling this — it is destructive by design.
#[tauri::command]
async fn discard_file_changes(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let rel = path.trim();
    if rel.is_empty() {
        return Err("empty path".into());
    }
    let dir = state
        .sidecar
        .working_dir()
        .or_else(|| std::env::current_dir().ok())
        .ok_or("no project directory")?;

    // Tracked by git? (exit code 0 = tracked)
    let tracked = crate::process::hide_console(
        tokio::process::Command::new("git")
            .args(["ls-files", "--error-unmatch", rel])
            .current_dir(&dir),
    )
    .output()
    .await
    .map_err(|e| format!("could not run git: {e}"))?
    .status
    .success();

    if tracked {
        let out = crate::process::hide_console(
            tokio::process::Command::new("git")
                .args(["checkout", "HEAD", "--", rel])
                .current_dir(&dir),
        )
        .output()
        .await
        .map_err(|e| format!("could not run git checkout: {e}"))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr);
            return Err(format!("git checkout failed: {}", err.trim()));
        }
    } else {
        // New untracked file created by the agent — discarding means deleting it.
        let abs = dir.join(rel);
        if abs.is_file() {
            std::fs::remove_file(&abs)
                .map_err(|e| format!("could not delete {}: {e}", abs.display()))?;
        }
    }
    Ok(())
}

/// Capture a screenshot of a URL with the system's Chromium-based browser in
/// headless mode (Edge ships with Windows; Chrome/Chromium as fallback) and
/// return the PNG path. This is what lets the agent literally SEE the page it
/// built: the frontend attaches the image to a prompt for visual self-review.
#[tauri::command]
async fn capture_preview(
    url: String,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<String, String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("no preview URL to capture".into());
    }
    let browser = find_browser()
        .ok_or("no Chromium-based browser (Edge/Chrome) found for the screenshot")?;

    // Viewport for the shot — defaults to a desktop 1440×900, but the QA
    // multi-viewport audit passes phone/tablet widths to check responsiveness.
    let w = width.unwrap_or(1440).clamp(240, 3840);
    let h = height.unwrap_or(900).clamp(320, 4000);
    let window_size = format!("--window-size={w},{h}");

    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let out_path = std::env::temp_dir().join(format!("kikko-preview-{stamp}-{w}.png"));

    let run = crate::process::hide_console(
        tokio::process::Command::new(&browser).args([
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            &window_size,
            // A little settling time so SPAs finish their first paint.
            "--virtual-time-budget=4000",
            &format!("--screenshot={}", out_path.display()),
            &url,
        ]),
    )
    .output();
    let output = tokio::time::timeout(std::time::Duration::from_secs(45), run)
        .await
        .map_err(|_| "screenshot timed out after 45s".to_string())?
        .map_err(|e| format!("could not run {}: {e}", browser.display()))?;

    if !out_path.is_file() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "screenshot failed ({}): {}",
            browser.display(),
            err.trim()
        ));
    }
    Ok(out_path.display().to_string())
}

/// Locate a Chromium-based browser for headless screenshots.
fn find_browser() -> Option<PathBuf> {
    if cfg!(windows) {
        let pf86 = std::env::var("ProgramFiles(x86)")
            .unwrap_or_else(|_| r"C:\Program Files (x86)".into());
        let pf =
            std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".into());
        let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let candidates = [
            format!(r"{pf86}\Microsoft\Edge\Application\msedge.exe"),
            format!(r"{pf}\Microsoft\Edge\Application\msedge.exe"),
            format!(r"{pf}\Google\Chrome\Application\chrome.exe"),
            format!(r"{pf86}\Google\Chrome\Application\chrome.exe"),
            format!(r"{local}\Google\Chrome\Application\chrome.exe"),
        ];
        candidates
            .into_iter()
            .map(PathBuf::from)
            .find(|p| p.is_file())
    } else {
        ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"]
            .iter()
            .find_map(|name| sidecar::which_on_path(name))
    }
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
    let dev = Arc::new(DevRunner::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState {
            sidecar,
            preview,
            dev,
        })
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
            preview_url,
            set_preview_proxy,
            capture_preview,
            discard_file_changes,
            read_agents_file,
            write_agents_file,
            update_agents_memory,
            fetch_text,
            find_dev_server,
            start_dev_server,
            stop_dev_server,
            dev_server_status,
            dev_command_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
