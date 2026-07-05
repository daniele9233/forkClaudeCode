//! Cross-platform "kill the whole process tree" helper.
//!
//! On Windows the engine and the dev server are launched through `cmd /C`
//! (npm shims aren't directly executable): killing the child kills `cmd.exe`
//! but leaves the real node process orphaned, still holding its port. So we
//! take down the whole tree with `taskkill /T /F` before the direct kill.
//! On unix the direct kill is enough (we spawn real binaries, no shim shell).

/// Windows flag that spawns a process **without** allocating a console window.
/// A GUI app (built with `windows_subsystem = "windows"`) has no console of its
/// own, so launching a console-subsystem child — `opencode.exe`, `cmd /C …` —
/// otherwise pops a stray terminal window. Harmless no-op value elsewhere.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Apply `CREATE_NO_WINDOW` to a to-be-spawned (async) command on Windows so no
/// terminal window flashes up. Returns the same `&mut` so it can be dropped into
/// a builder chain: `hide_console(Command::new("git").arg("status")).output()`.
/// No-op on other platforms.
pub(crate) fn hide_console(cmd: &mut tokio::process::Command) -> &mut tokio::process::Command {
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Same as [`hide_console`] but for a blocking `std::process::Command`.
pub(crate) fn hide_console_std(cmd: &mut std::process::Command) -> &mut std::process::Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Kill `child` and every descendant it spawned. Best-effort, never blocks
/// for long (taskkill is fast), safe to call on an already-dead child.
pub(crate) fn kill_child_tree(child: &mut tokio::process::Child) {
    #[cfg(windows)]
    if let Some(pid) = child.id() {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    // Direct kill as well (and the only path on unix).
    let _ = child.start_kill();
}
