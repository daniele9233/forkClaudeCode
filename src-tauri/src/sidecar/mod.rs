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
    pub async fn start(&self) -> Result<SidecarState, String> {
        // A previous instance may still be around (restart path).
        self.stop();

        let mut last_err = String::new();
        for attempt in 0..3u32 {
            let port = free_port().await?;
            let base_url = format!("http://127.0.0.1:{}", port);

            let spawn = Command::new("opencode")
                .args([
                    "serve",
                    "--port",
                    &port.to_string(),
                    "--hostname",
                    "127.0.0.1",
                ])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .kill_on_drop(true)
                .spawn();

            let child = match spawn {
                Ok(c) => c,
                Err(e) => {
                    return Err(format!(
                        "failed to spawn `opencode serve` (is opencode installed and on PATH?): {e}"
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
                    return Ok(state);
                }
                Err(e) => {
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
        let url = format!("{}/health", state.base_url);
        matches!(
            reqwest::Client::new()
                .get(&url)
                .timeout(Duration::from_secs(2))
                .send()
                .await,
            Ok(r) if r.status().is_success()
        )
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

/// Find a free TCP port by binding to port 0.
async fn free_port() -> Result<u16, String> {
    use std::net::TcpListener;
    TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("no free port: {e}"))?
        .local_addr()
        .map(|a| a.port())
        .map_err(|e| format!("port addr error: {e}"))
}

/// Poll GET /health until 200 or timeout.
async fn wait_healthy(base_url: &str, timeout_secs: u64) -> Result<(), String> {
    let url = format!("{base_url}/health");
    let client = reqwest::Client::new();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(timeout_secs);

    loop {
        if tokio::time::Instant::now() > deadline {
            return Err(format!(
                "opencode serve did not become healthy within {timeout_secs}s"
            ));
        }
        match client.get(&url).send().await {
            Ok(r) if r.status().is_success() => return Ok(()),
            _ => sleep(Duration::from_millis(200)).await,
        }
    }
}
