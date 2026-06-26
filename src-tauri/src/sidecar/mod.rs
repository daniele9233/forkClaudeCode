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
}

impl Sidecar {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(None)),
        }
    }

    /// Spawn `opencode serve` on a free port and wait until healthy.
    pub async fn start(&self) -> Result<SidecarState, String> {
        let port = free_port().await?;
        let base_url = format!("http://127.0.0.1:{}", port);

        let child = Command::new("opencode")
            .args(["serve", "--port", &port.to_string(), "--hostname", "127.0.0.1"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("failed to spawn opencode serve: {e}"))?;

        *self.child.lock().unwrap() = Some(child);

        // Wait up to 10 seconds for the health endpoint to respond.
        wait_healthy(&base_url, 10).await?;

        let state = SidecarState { port, base_url: base_url.clone() };
        *self.state.lock().unwrap() = Some(state.clone());
        Ok(state)
    }

    /// Kill the sidecar process if running.
    pub fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                // tokio Child: start_kill is non-blocking; ignore errors.
                let _ = child.start_kill();
            }
        }
        *self.state.lock().unwrap() = None;
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
            return Err(format!("opencode serve did not become healthy within {timeout_secs}s"));
        }
        match client.get(&url).send().await {
            Ok(r) if r.status().is_success() => return Ok(()),
            _ => sleep(Duration::from_millis(200)).await,
        }
    }
}
