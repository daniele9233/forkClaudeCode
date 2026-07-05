//! kikkoCode-managed dev server (the "Claude Code" model): run the project's dev
//! command as a tracked background process, stream its output to the UI, and let
//! the frontend read the real URL from that output. No detached windows, no port
//! guessing — the port comes straight from the process the harness owns.

use std::path::Path;
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader};
use tokio::process::{Child, Command};

#[derive(Clone, Serialize)]
pub struct DevStatus {
    pub running: bool,
    /// The command line being run (e.g. "pnpm run dev"), or null.
    pub command: Option<String>,
}

pub struct DevRunner {
    child: Arc<Mutex<Option<Child>>>,
    running: Arc<Mutex<bool>>,
    command: Arc<Mutex<Option<String>>>,
}

impl DevRunner {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            running: Arc::new(Mutex::new(false)),
            command: Arc::new(Mutex::new(None)),
        }
    }

    pub fn status(&self) -> DevStatus {
        DevStatus {
            running: *self.running.lock().unwrap(),
            command: self.command.lock().unwrap().clone(),
        }
    }

    /// Kill the running dev server, if any (whole tree — the Windows `cmd /C`
    /// shim would otherwise leave node running and the port taken).
    pub fn stop(&self) {
        if let Ok(mut g) = self.child.lock() {
            if let Some(mut ch) = g.take() {
                crate::process::kill_child_tree(&mut ch);
            }
        }
        *self.running.lock().unwrap() = false;
        *self.command.lock().unwrap() = None;
    }

    /// Start the project's dev command in `dir`. Returns the command line for
    /// display. Streams stdout/stderr as `dev-server-log` events; emits
    /// `dev-server-exit` when the process ends.
    pub async fn start(&self, app: AppHandle, dir: &Path) -> Result<String, String> {
        // Replace any previous server.
        self.stop();

        let (workdir, pm, script) =
            detect_dev_command(dir).ok_or("no dev/start script found in package.json")?;
        let display = format!("{pm} run {script}");

        let mut command = build_command(&pm, &script);
        command
            .current_dir(&workdir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = command
            .spawn()
            .map_err(|e| format!("could not start `{display}`: {e}"))?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        *self.command.lock().unwrap() = Some(display.clone());
        *self.running.lock().unwrap() = true;
        *self.child.lock().unwrap() = Some(child);

        if let Some(out) = stdout {
            spawn_reader(app.clone(), out);
        }
        if let Some(err) = stderr {
            spawn_reader(app.clone(), err);
        }
        spawn_exit_watcher(
            app,
            self.child.clone(),
            self.running.clone(),
            self.command.clone(),
        );

        eprintln!(
            "[kikkocode] dev server started: {display} (cwd {})",
            workdir.display()
        );
        Ok(display)
    }
}

/// Read lines from a child pipe and forward each as a `dev-server-log` event.
fn spawn_reader<R>(app: AppHandle, reader: R)
where
    R: AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut lines = BufReader::new(reader).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app.emit("dev-server-log", line);
        }
    });
}

/// Poll for process exit (the pipes closing isn't enough — we want to flip the
/// running flag and tell the UI). Never holds the lock across an await.
fn spawn_exit_watcher(
    app: AppHandle,
    child: Arc<Mutex<Option<Child>>>,
    running: Arc<Mutex<bool>>,
    command: Arc<Mutex<Option<String>>>,
) {
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_millis(500)).await;
            let exited = {
                let mut guard = child.lock().unwrap();
                match guard.as_mut() {
                    Some(ch) => match ch.try_wait() {
                        Ok(Some(_)) => {
                            *guard = None;
                            true
                        }
                        Ok(None) => false,
                        Err(_) => {
                            *guard = None;
                            true
                        }
                    },
                    // Taken by stop() — nothing left to watch.
                    None => return,
                }
            };
            if exited {
                *running.lock().unwrap() = false;
                *command.lock().unwrap() = None;
                let _ = app.emit("dev-server-exit", ());
                return;
            }
        }
    });
}

/// Build the command to run `<pm> run <script>`, routing npm-family CLIs through
/// `cmd /C` on Windows (they're `.cmd` shims that `CreateProcess` can't launch).
fn build_command(pm: &str, script: &str) -> Command {
    let mut c = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(format!("{pm} run {script}"));
        c
    } else {
        let mut c = Command::new(pm);
        c.args(["run", script]);
        c
    };
    // No stray terminal window on Windows when the GUI app spawns the dev server.
    crate::process::hide_console(&mut c);
    c
}

/// Inspect `package.json` for a runnable dev command. Returns
/// `(project_dir, package_manager, script_name)` or None. Public so the UI can
/// show/enable a "Run dev server" button only when there's something to run.
///
/// Searches the opened folder first, then one level of subdirectories — so a
/// repo opened at its root still finds a web app living in a subfolder (e.g.
/// `web/`, `app/`, `frontend/`). Common non-project dirs are skipped.
pub fn detect_dev_command(dir: &Path) -> Option<(std::path::PathBuf, String, String)> {
    if let Some((pm, script)) = dev_command_in(dir) {
        return Some((dir.to_path_buf(), pm, script));
    }
    let mut subdirs: Vec<std::path::PathBuf> = std::fs::read_dir(dir)
        .ok()?
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .filter(|p| {
            !matches!(
                p.file_name().and_then(|n| n.to_str()),
                Some("node_modules") | Some(".git") | Some("target") | Some("dist")
            ) && !p
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with('.'))
        })
        .collect();
    subdirs.sort();
    for sub in subdirs {
        if let Some((pm, script)) = dev_command_in(&sub) {
            return Some((sub, pm, script));
        }
    }
    None
}

/// Read a single directory's `package.json` for a runnable script.
fn dev_command_in(dir: &Path) -> Option<(String, String)> {
    let text = std::fs::read_to_string(dir.join("package.json")).ok()?;
    let json: serde_json::Value = serde_json::from_str(&text).ok()?;
    let scripts = json.get("scripts")?.as_object()?;
    let script = ["dev", "start", "serve", "preview"]
        .iter()
        .find(|s| scripts.contains_key(**s))?;
    Some((detect_package_manager(dir), (*script).to_string()))
}

/// Pick the package manager from the lockfile present in the project.
fn detect_package_manager(dir: &Path) -> String {
    if dir.join("pnpm-lock.yaml").exists() {
        "pnpm".into()
    } else if dir.join("yarn.lock").exists() {
        "yarn".into()
    } else if dir.join("bun.lockb").exists() {
        "bun".into()
    } else {
        "npm".into()
    }
}
