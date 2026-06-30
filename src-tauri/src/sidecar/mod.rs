use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::process::{Child, Command};
use tokio::time::sleep;

#[derive(Debug, Clone)]
pub struct SidecarState {
    pub port: u16,
    pub base_url: String,
}

pub struct Sidecar {
    child: Arc<Mutex<Option<Child>>>,
    pub state: Arc<Mutex<Option<SidecarState>>>,
    /// Bumped on every successful (re)start. A health monitor captures the
    /// generation it was started for and stops once a newer one supersedes it.
    generation: Arc<Mutex<u64>>,
}

impl Sidecar {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(None)),
            generation: Arc::new(Mutex::new(0)),
        }
    }

    /// Spawn `opencode serve` on a free port and wait until healthy.
    ///
    /// Retries on a fresh port if the chosen one is taken between the probe and
    /// opencode binding it (TOCTOU), or if the server is briefly slow to come up.
    ///
    /// Escape hatch: if `OPENCODE_BASE_URL` is set, the app does **not** spawn
    /// its own engine. It health-checks the given URL and attaches to a server
    /// the user started manually (`opencode serve --port <p>`). This unblocks
    /// environments where auto-spawn fails (e.g. a Windows `.cmd` PATH shim or a
    /// CLI-flag change in a newer opencode) — run the engine by hand and point
    /// the app at it.
    pub async fn start(&self) -> Result<SidecarState, String> {
        // A previous instance may still be around (restart path).
        self.stop();

        if let Ok(external) = std::env::var("OPENCODE_BASE_URL") {
            let base_url = external.trim().trim_end_matches('/').to_string();
            if !base_url.is_empty() {
                eprintln!("[kikkocode] OPENCODE_BASE_URL set → attaching to external engine at {base_url}");
                wait_healthy(&base_url, 15).await.map_err(|e| {
                    format!("OPENCODE_BASE_URL={base_url} is set but the engine did not respond: {e}")
                })?;
                let port = port_from_url(&base_url).unwrap_or(0);
                let state = SidecarState {
                    port,
                    base_url: base_url.clone(),
                };
                *self.state.lock().unwrap() = Some(state.clone());
                *self.generation.lock().unwrap() += 1;
                eprintln!("[kikkocode] attached to external engine at {base_url}");
                return Ok(state);
            }
        }

        let bin = opencode_bin();
        eprintln!("[kikkocode] spawning engine: {} serve", bin.display());

        let mut last_err = String::new();
        for attempt in 0..3u32 {
            let port = free_port().await?;
            let base_url = format!("http://127.0.0.1:{}", port);

            let spawn = engine_command(&bin)
                .args([
                    "serve",
                    "--port",
                    &port.to_string(),
                    "--hostname",
                    "127.0.0.1",
                ])
                // Inherit stdio so the engine's own logs (and any startup error)
                // are visible in the `tauri dev` / app console while diagnosing.
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .kill_on_drop(true)
                .spawn();

            let child = match spawn {
                Ok(c) => c,
                Err(e) => {
                    return Err(format!(
                        "failed to spawn `{} serve` (is opencode installed and on PATH?): {e}",
                        bin.display()
                    ));
                }
            };

            *self.child.lock().unwrap() = Some(child);

            // Wait up to 10 seconds for the health endpoint to respond.
            match wait_healthy(&base_url, 10).await {
                Ok(()) => {
                    let state = SidecarState {
                        port,
                        base_url: base_url.clone(),
                    };
                    *self.state.lock().unwrap() = Some(state.clone());
                    *self.generation.lock().unwrap() += 1;
                    eprintln!("[kikkocode] engine healthy on {base_url}");
                    return Ok(state);
                }
                Err(e) => {
                    eprintln!(
                        "[kikkocode] attempt {} failed on {base_url}: {e}",
                        attempt + 1
                    );
                    last_err = e;
                    // Kill the unhealthy child before retrying on a new port.
                    self.stop();
                    sleep(Duration::from_millis(250 * u64::from(attempt + 1))).await;
                }
            }
        }

        Err(format!(
            "opencode sidecar failed to become healthy after 3 attempts: {last_err}"
        ))
    }

    /// Stop the current sidecar (if any) and start a fresh one.
    pub async fn restart(&self) -> Result<SidecarState, String> {
        self.stop();
        self.start().await
    }

    /// The current generation; a monitor task uses this to detect that it has
    /// been superseded by a restart and should stop polling.
    pub fn generation(&self) -> u64 {
        *self.generation.lock().unwrap()
    }

    /// Probe the health endpoint of the running sidecar. Returns `false` if no
    /// sidecar is running or the endpoint does not respond with success.
    pub async fn is_healthy(&self) -> bool {
        let Some(state) = self.state() else {
            return false;
        };
        // `/config` is a real GET endpoint that returns 200 once the server is
        // up (opencode serve does not expose a dedicated `/health`).
        let url = format!("{}/config", state.base_url);
        matches!(
            reqwest::Client::new()
                .get(&url)
                .timeout(Duration::from_secs(2))
                .send()
                .await,
            Ok(r) if r.status().is_success()
        )
    }

    /// Report the engine version by running `opencode --version`.
    /// Used by the UI to warn when the bundled engine and the pinned SDK diverge.
    pub async fn version(&self) -> Result<String, String> {
        let out = engine_command(&opencode_bin())
            .arg("--version")
            .output()
            .await
            .map_err(|e| format!("failed to run `opencode --version`: {e}"))?;
        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !stdout.is_empty() {
            return Ok(stdout);
        }
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Ok(if stderr.is_empty() {
            "unknown".into()
        } else {
            stderr
        })
    }

    /// Kill the sidecar process if running.
    pub fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                // tokio Child: start_kill is non-blocking; ignore errors.
                let _ = child.start_kill();
            }
        }
        if let Ok(mut s) = self.state.lock() {
            *s = None;
        }
    }

    pub fn state(&self) -> Option<SidecarState> {
        self.state.lock().unwrap().clone()
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Resolve the `opencode` executable.
///
/// Prefers the sidecar binary bundled next to the app executable (Tauri
/// `externalBin` is placed there at runtime, without the target-triple suffix);
/// falls back to `opencode` on `PATH` for development.
fn opencode_bin() -> std::path::PathBuf {
    // 1. Bundled sidecar next to the app executable (release builds).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let name = if cfg!(windows) {
                "opencode.exe"
            } else {
                "opencode"
            };
            let candidate = dir.join(name);
            if candidate.exists() {
                return candidate;
            }
        }
    }

    // 2. On Windows the global CLI is usually a `.cmd`/`.ps1`/`.exe` shim that
    //    `Command::new("opencode")` will NOT find — Rust does not apply PATHEXT
    //    the way the shell does. Resolve the full path ourselves by scanning
    //    PATH with the executable extensions so spawning works in dev too.
    if cfg!(windows) {
        if let Some(found) = which_on_path("opencode") {
            return found;
        }
    }

    // 3. Fall back to the bare name (resolved via PATH on Unix).
    std::path::PathBuf::from("opencode")
}

/// Build a `Command` that runs the resolved engine binary.
///
/// On Windows a `.cmd`/`.bat` shim (how npm installs the global `opencode` CLI)
/// cannot be launched directly by `CreateProcess` — it must be run through
/// `cmd.exe /C`. For real executables (and on Unix) we invoke the path directly.
fn engine_command(bin: &std::path::Path) -> Command {
    if cfg!(windows) {
        let ext = bin
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase());
        if matches!(ext.as_deref(), Some("cmd") | Some("bat")) {
            let mut cmd = Command::new("cmd");
            cmd.arg("/C").arg(bin);
            return cmd;
        }
    }
    Command::new(bin)
}

/// Locate an executable on `PATH`, applying Windows `PATHEXT` extensions.
fn which_on_path(stem: &str) -> Option<std::path::PathBuf> {
    let path = std::env::var_os("PATH")?;
    let exts: Vec<String> = if cfg!(windows) {
        std::env::var("PATHEXT")
            .unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".into())
            .split(';')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_ascii_lowercase())
            .collect()
    } else {
        vec![String::new()]
    };
    for dir in std::env::split_paths(&path) {
        // Exact name first (covers an already-suffixed stem).
        let exact = dir.join(stem);
        if exact.is_file() {
            return Some(exact);
        }
        for ext in &exts {
            if ext.is_empty() {
                continue;
            }
            let candidate = dir.join(format!("{stem}{ext}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

/// Best-effort parse of the port out of an `http://host:port` URL.
fn port_from_url(url: &str) -> Option<u16> {
    url.rsplit(':').next()?.trim_end_matches('/').parse().ok()
}

/// Find a free TCP port by binding to port 0.
async fn free_port() -> Result<u16, String> {
    use std::net::TcpListener;
    TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("no free port: {e}"))?
        .local_addr()
        .map(|a| a.port())
        .map_err(|e| format!("port addr error: {e}"))
}

/// Poll the server until it answers, then consider it ready. Uses `/config`
/// (a real opencode endpoint) — there is no dedicated `/health` route.
async fn wait_healthy(base_url: &str, timeout_secs: u64) -> Result<(), String> {
    let url = format!("{base_url}/config");
    let client = reqwest::Client::new();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(timeout_secs);

    loop {
        if tokio::time::Instant::now() > deadline {
            return Err(format!(
                "opencode serve did not respond on {url} within {timeout_secs}s"
            ));
        }
        match client.get(&url).send().await {
            // Any HTTP answer means the server is listening and routing.
            Ok(r) if r.status().is_success() || r.status().is_client_error() => {
                return Ok(())
            }
            _ => sleep(Duration::from_millis(250)).await,
        }
    }
}
