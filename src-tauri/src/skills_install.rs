//! Install real engine skills from a git repo.
//!
//! An OpenCode/Claude "skill" is a folder containing a `SKILL.md` (plus optional
//! reference files). The engine scans `~/.claude/skills` (alongside its
//! built-ins) and exposes each as an invocable skill. This module clones a repo,
//! finds the skill folders inside it (under the conventional `.opencode/skills`,
//! `.claude/skills` or `skills` roots) and copies them into that directory, so
//! the GUI can offer a one-click "install skills" experience like `npx skills add`.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

/// The global skills directory the engine scans: `~/.claude/skills`. opencode
/// 1.x reads Claude-format skills from here in addition to its built-ins.
fn global_skills_dir() -> Option<PathBuf> {
    let home = std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)?;
    Some(home.join(".claude").join("skills"))
}

/// Derive a folder name from a clone URL (`…/taste-skill.git` → `taste-skill`).
fn sanitize_repo_name(url: &str) -> String {
    let base = url.trim_end_matches('/').rsplit('/').next().unwrap_or("skill");
    let name = base.trim_end_matches(".git");
    if name.is_empty() {
        "skill".to_string()
    } else {
        name.to_string()
    }
}

/// Recursively copy a directory tree, skipping VCS metadata.
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let name = entry.file_name();
        if name.to_str() == Some(".git") {
            continue;
        }
        let from = entry.path();
        let to = dst.join(&name);
        if entry.file_type()?.is_dir() {
            copy_dir_all(&from, &to)?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

/// Find every skill folder in a cloned repo: a directory that directly contains
/// a `SKILL.md`. Looks under the conventional roots (opencode/claude/skills) and
/// dedupes by folder name (opencode variant wins). Falls back to the repo root
/// itself being a single skill.
fn find_skill_dirs(repo: &Path, repo_name: &str) -> Vec<(String, PathBuf)> {
    let mut found: BTreeMap<String, PathBuf> = BTreeMap::new();
    let roots = [
        repo.join(".opencode").join("skills"),
        repo.join(".claude").join("skills"),
        repo.join("skills"),
    ];
    for root in roots {
        let Ok(rd) = fs::read_dir(&root) else {
            continue;
        };
        for entry in rd.flatten() {
            let p = entry.path();
            if p.is_dir() && p.join("SKILL.md").is_file() {
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    found.entry(name.to_string()).or_insert(p);
                }
            }
        }
    }
    if found.is_empty() && repo.join("SKILL.md").is_file() {
        found.insert(repo_name.to_string(), repo.to_path_buf());
    }
    found.into_iter().collect()
}

/// Clone `url` and install every skill folder it contains into
/// `~/.claude/skills`. Returns the names of the installed skills. Overwrites a
/// same-named skill (an update). The engine picks them up on its next restart.
#[tauri::command]
pub async fn install_skill_repo(url: String) -> Result<Vec<String>, String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("empty repository URL".into());
    }
    let skills_dir = global_skills_dir().ok_or("could not resolve home directory")?;
    fs::create_dir_all(&skills_dir)
        .map_err(|e| format!("mkdir {}: {e}", skills_dir.display()))?;

    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let tmp = std::env::temp_dir().join(format!("kikko-skills-{stamp}"));

    let out = crate::process::hide_console(
        tokio::process::Command::new("git")
            .arg("clone")
            .arg("--depth")
            .arg("1")
            .arg(&url)
            .arg(&tmp),
    )
    .output()
    .await
    .map_err(|e| format!("could not run git (is it installed?): {e}"))?;
    if !out.status.success() {
        let _ = fs::remove_dir_all(&tmp);
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(format!("git clone failed: {}", err.trim()));
    }

    let repo_name = sanitize_repo_name(&url);
    let dirs = find_skill_dirs(&tmp, &repo_name);
    if dirs.is_empty() {
        let _ = fs::remove_dir_all(&tmp);
        return Err("no SKILL.md folders found in that repository".into());
    }

    let mut installed = Vec::new();
    for (name, path) in dirs {
        let dest = skills_dir.join(&name);
        let _ = fs::remove_dir_all(&dest); // overwrite any existing version
        if let Err(e) = copy_dir_all(&path, &dest) {
            let _ = fs::remove_dir_all(&tmp);
            return Err(format!("could not install '{name}': {e}"));
        }
        installed.push(name);
    }
    let _ = fs::remove_dir_all(&tmp);
    installed.sort();
    Ok(installed)
}

/// List the skills currently installed in `~/.claude/skills`.
#[tauri::command]
pub fn list_installed_skills() -> Result<Vec<String>, String> {
    let Some(dir) = global_skills_dir() else {
        return Ok(vec![]);
    };
    if !dir.is_dir() {
        return Ok(vec![]);
    }
    let mut names = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let p = entry.path();
        if p.is_dir() && p.join("SKILL.md").is_file() {
            if let Some(n) = p.file_name().and_then(|n| n.to_str()) {
                names.push(n.to_string());
            }
        }
    }
    names.sort();
    Ok(names)
}

/// Remove an installed skill folder by name.
#[tauri::command]
pub fn remove_installed_skill(name: String) -> Result<(), String> {
    let name = name.trim();
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("invalid skill name".into());
    }
    let dir = global_skills_dir()
        .ok_or("could not resolve home directory")?
        .join(name);
    if dir.is_dir() {
        fs::remove_dir_all(&dir).map_err(|e| format!("remove {}: {e}", dir.display()))?;
    }
    Ok(())
}
