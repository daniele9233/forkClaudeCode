//! Cross-platform "kill the whole process tree" helper.
//!
//! On Windows the engine and the dev server are launched through `cmd /C`
//! (npm shims aren't directly executable): killing the child kills `cmd.exe`
//! but leaves the real node process orphaned, still holding its port. So we
//! take down the whole tree with `taskkill /T /F` before the direct kill.
//! On unix the direct kill is enough (we spawn real binaries, no shim shell).

/// Kill `child` and every descendant it spawned. Best-effort, never blocks
/// for long (taskkill is fast), safe to call on an already-dead child.
pub(crate) fn kill_child_tree(child: &mut tokio::process::Child) {
    #[cfg(windows)]
    if let Some(pid) = child.id() {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    // Direct kill as well (and the only path on unix).
    let _ = child.start_kill();
}
