use std::collections::HashMap;
use std::path::PathBuf;
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
    /// Extra environment variables injected into every spawned engine process
    /// (e.g. provider API keys like DEEPSEEK_API_KEY). Persisted across restarts
    /// so a key added from the GUI survives a sidecar restart.
    extra_env: Arc<Mutex<HashMap<String, String>>>,
    /// Working directory the engine runs in — this IS the "project" opencode
    /// operates on. Changing it (and restarting) switches project. `None` means
    /// inherit the app's launch cwd.
    working_dir: Arc<Mutex<Option<PathBuf>>>,
}

impl Sidecar {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(None)),
            generation: Arc::new(Mutex::new(0)),
            extra_env: Arc::new(Mutex::new(HashMap::new())),
            working_dir: Arc::new(Mutex::new(None)),
        }
    }

    /// Set the project directory the engine runs in. Takes effect on the next
    /// (re)start — the caller should restart the sidecar afterwards.
    pub fn set_working_dir(&self, dir: Option<PathBuf>) {
        *self.working_dir.lock().unwrap() = dir;
    }

    /// The current project directory (the engine's cwd), if one was set.
    pub fn working_dir(&self) -> Option<PathBuf> {
        self.working_dir.lock().unwrap().clone()
    }

    /// Set an environment variable to inject into the engine on the next
    /// (re)start. The engine reads provider keys from env at startup, so the
    /// caller should restart the sidecar afterwards for it to take effect.
    pub fn set_env(&self, key: String, value: String) {
        self.extra_env.lock().unwrap().insert(key, value);
    }

    /// Spawn `opencode serve` on a free port and wait until healthy.
    ///
    /// Retries on a fresh port if the chosen one is taken between the probe and
    /// opencode binding it (TOCTOU), or if the server is briefly slow to come up.
    ///
    /// Soft hint: if `OPENCODE_BASE_URL` is set and a server is actually
    /// reachable there, the app attaches to it instead of spawning its own
    /// engine (useful to point at a manually-run `opencode serve`). If nothing
    /// answers at that URL, we log it and **fall back to auto-spawning** our own
    /// engine rather than failing — so a stale env var can never wedge the app.
    pub async fn start(&self) -> Result<SidecarState, String> {
        // A previous instance may still be around (restart path).
        self.stop();

        if let Ok(external) = std::env::var("OPENCODE_BASE_URL") {
            let base_url = external.trim().trim_end_matches('/').to_string();
            if !base_url.is_empty() {
                eprintln!("[kikkocode] OPENCODE_BASE_URL set → trying external engine at {base_url}");
                match wait_healthy(&base_url, 5).await {
                    Ok(()) => {
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
                    Err(e) => {
                        eprintln!(
                            "[kikkocode] external engine at {base_url} not reachable ({e}); falling back to auto-spawn"
                        );
                    }
                }
            }
        }

        let bin = opencode_bin();
        eprintln!("[kikkocode] spawning engine: {} serve", bin.display());

        let mut last_err = String::new();
        for attempt in 0..3u32 {
            let port = free_port().await?;
            let base_url = format!("http://127.0.0.1:{}", port);

            // Snapshot the injected env (provider keys) for this spawn.
            let env_snapshot: Vec<(String, String)> = self
                .extra_env
                .lock()
                .unwrap()
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();

            // Only pass `--port`: opencode serve already binds 127.0.0.1 by
            // default, so omitting `--hostname` avoids any flag-name mismatch
            // across opencode versions that could make the engine exit on start.
            let mut command = engine_command(&bin);
            command
                .args(["serve", "--port", &port.to_string()])
                // Inherit stdio so the engine's own logs (and any startup error)
                // are visible in the `tauri dev` / app console while diagnosing.
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .kill_on_drop(true);
            // Run the engine in the selected project directory. This is what
            // makes opencode operate on that folder (its "project" == its cwd).
            if let Some(dir) = self.working_dir.lock().unwrap().clone() {
                command.current_dir(dir);
            }
            for (k, v) in &env_snapshot {
                command.env(k, v);
            }
            let spawn = command.spawn();

            let child = match spawn {
                Ok(c) => c,
                Err(e) => {
                    return Err(format!(
                        "failed to spawn `{} serve` (is opencode installed and on PATH?): {e}",
                        bin.display()
                    ));
                }
            };

            eprintln!(
                "[kikkocode] engine process started (pid {:?}); polling health on {base_url} …",
                child.id()
            );
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
    /// sidecar is running or the server does not answer at all.
    pub async fn is_healthy(&self) -> bool {
        let Some(state) = self.state() else {
            return false;
        };
        // Any HTTP answer means the server is listening and routing — a 4xx/5xx
        // still proves the process is alive (we are not authorizing, just
        // probing liveness). `/config` is a real GET route on opencode serve.
        let url = format!("{}/config", state.base_url);
        matches!(health_client().get(&url).send().await, Ok(_))
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

    /// Kill the sidecar process if running (whole tree — the Windows `cmd /C`
    /// shim would otherwise leave the real engine orphaned on its port).
    pub fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                crate::process::kill_child_tree(&mut child);
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
    let mut cmd = if cfg!(windows) {
        let ext = bin
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase());
        if matches!(ext.as_deref(), Some("cmd") | Some("bat")) {
            eprintln!("[kikkocode] launching shim via cmd /C: {}", bin.display());
            let mut cmd = Command::new("cmd");
            cmd.arg("/C").arg(bin);
            cmd
        } else {
            eprintln!("[kikkocode] launching directly: {}", bin.display());
            Command::new(bin)
        }
    } else {
        eprintln!("[kikkocode] launching directly: {}", bin.display());
        Command::new(bin)
    };
    // Keep the console-subsystem engine from popping a terminal window when the
    // GUI app (no console of its own) spawns it.
    crate::process::hide_console(&mut cmd);
    cmd
}

/// Locate an executable on `PATH`, applying Windows `PATHEXT` extensions.
///
/// On Windows we try the `PATHEXT`-suffixed names (`.cmd`/`.exe`/…) **before**
/// the bare stem: npm installs three files in its bin dir — `opencode` (a Unix
/// shell script), `opencode.cmd`, and `opencode.ps1`. The extensionless one is
/// NOT runnable by `CreateProcess`; we must pick `opencode.cmd`. Only if the
/// stem already carries an extension do we accept it verbatim.
pub(crate) fn which_on_path(stem: &str) -> Option<std::path::PathBuf> {
    let path = std::env::var_os("PATH")?;
    let stem_has_ext = std::path::Path::new(stem).extension().is_some();

    if cfg!(windows) {
        let exts: Vec<String> = std::env::var("PATHEXT")
            .unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".into())
            .split(';')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_ascii_lowercase())
            .collect();
        for dir in std::env::split_paths(&path) {
            // Suffixed executables first (the runnable shims).
            for ext in &exts {
                let candidate = dir.join(format!("{stem}{ext}"));
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
            // Bare name only if the caller already gave an extension.
            if stem_has_ext {
                let exact = dir.join(stem);
                if exact.is_file() {
                    return Some(exact);
                }
            }
        }
    } else {
        for dir in std::env::split_paths(&path) {
            let exact = dir.join(stem);
            if exact.is_file() {
                return Some(exact);
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

/// An HTTP client for local health probes. Crucially it **disables proxies**:
/// reqwest otherwise honors the system / `HTTP(S)_PROXY` settings, and on
/// machines behind a VPN or corporate proxy that routes even `127.0.0.1`
/// through the proxy — which makes every local probe fail. A short timeout
/// keeps the poll loop responsive.
fn health_client() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(3))
        .build()
        // The builder only fails on a bad TLS backend; fall back to default.
        .unwrap_or_else(|_| reqwest::Client::new())
}

/// Poll the server until it answers *anything* over HTTP, then consider it
/// ready. Any status (2xx/3xx/4xx/5xx) proves the process is up and routing;
/// we are probing liveness, not authorizing. Uses `/config` (a real route).
async fn wait_healthy(base_url: &str, timeout_secs: u64) -> Result<(), String> {
    let url = format!("{base_url}/config");
    let client = health_client();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(timeout_secs);

    let mut last_err = String::from("no response");
    let mut logged_first = false;
    loop {
        if tokio::time::Instant::now() > deadline {
            return Err(format!(
                "no HTTP response on {url} within {timeout_secs}s (last error: {last_err})"
            ));
        }
        match client.get(&url).send().await {
            // Any HTTP answer means the server is listening and routing.
            Ok(r) => {
                eprintln!("[kikkocode] health ok: {url} → HTTP {}", r.status());
                return Ok(());
            }
            Err(e) => {
                last_err = e.to_string();
                // Log the first failure so the cause (connection refused vs.
                // timeout vs. proxy) is visible without spamming every retry.
                if !logged_first {
                    logged_first = true;
                    eprintln!("[kikkocode] health probe {url} not ready yet: {last_err}");
                }
                sleep(Duration::from_millis(250)).await;
            }
        }
    }
}
