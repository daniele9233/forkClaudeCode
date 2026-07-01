use std::fs;
use std::path::PathBuf;

use serde_json::{Map, Value};

/// Resolve opencode's global config file (`opencode.json`).
///
/// Mirrors opencode's own resolution: an explicit `OPENCODE_CONFIG` wins, else
/// `$XDG_CONFIG_HOME/opencode/opencode.json`, else `~/.config/opencode/...`
/// (home is `%USERPROFILE%` on Windows, `$HOME` elsewhere).
fn global_config_path() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("OPENCODE_CONFIG") {
        let p = explicit.trim();
        if !p.is_empty() {
            return Some(PathBuf::from(p));
        }
    }
    let cfg_base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .filter(|p| !p.as_os_str().is_empty())
        .or_else(|| {
            std::env::var_os("USERPROFILE")
                .or_else(|| std::env::var_os("HOME"))
                .map(|h| PathBuf::from(h).join(".config"))
        })?;
    Some(cfg_base.join("opencode").join("opencode.json"))
}

/// Merge a provider definition into the global opencode config and write it to
/// disk, so a provider added from the GUI survives engine/app restarts.
///
/// `entry_json` is the JSON object for `provider.<id>` (name/npm/options/models).
/// Returns the path written so the UI can show where it landed.
pub fn persist_provider(id: &str, entry_json: &str) -> Result<String, String> {
    let path = global_config_path().ok_or("could not resolve opencode config dir")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
    }

    let mut root: Value = if path.exists() {
        let text =
            fs::read_to_string(&path).map_err(|e| format!("read {}: {e}", path.display()))?;
        if text.trim().is_empty() {
            Value::Object(Map::new())
        } else {
            serde_json::from_str(&text).map_err(|e| format!("parse {}: {e}", path.display()))?
        }
    } else {
        Value::Object(Map::new())
    };

    let entry: Value =
        serde_json::from_str(entry_json).map_err(|e| format!("bad provider entry json: {e}"))?;

    let obj = root
        .as_object_mut()
        .ok_or("opencode.json root is not an object")?;
    let provider = obj
        .entry("provider")
        .or_insert_with(|| Value::Object(Map::new()));
    let provider_obj = provider
        .as_object_mut()
        .ok_or("opencode.json `provider` is not an object")?;
    provider_obj.insert(id.to_string(), entry);

    let pretty = serde_json::to_string_pretty(&root).map_err(|e| format!("serialize: {e}"))?;
    fs::write(&path, pretty).map_err(|e| format!("write {}: {e}", path.display()))?;
    Ok(path.display().to_string())
}

/// Path to kikkoCode's own tiny state file (separate from opencode's config),
/// used to remember which project folder was open so it reopens on launch.
/// Lives next to opencode's config dir: `<config>/opencode/kikkocode.json`.
fn kikko_state_path() -> Option<PathBuf> {
    let cfg = global_config_path()?;
    cfg.parent().map(|dir| dir.join("kikkocode.json"))
}

/// Remember the last project directory the user had open.
pub fn save_last_project(dir: &str) -> Result<(), String> {
    let path = kikko_state_path().ok_or("could not resolve state dir")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
    }
    let mut root: Value = if path.exists() {
        let text = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&text).unwrap_or_else(|_| Value::Object(Map::new()))
    } else {
        Value::Object(Map::new())
    };
    if let Some(obj) = root.as_object_mut() {
        obj.insert("lastProject".to_string(), Value::String(dir.to_string()));
    }
    let pretty = serde_json::to_string_pretty(&root).map_err(|e| format!("serialize: {e}"))?;
    fs::write(&path, pretty).map_err(|e| format!("write {}: {e}", path.display()))?;
    Ok(())
}

/// Load the last project directory, if one was saved and still exists on disk.
pub fn load_last_project() -> Option<PathBuf> {
    let path = kikko_state_path()?;
    let text = fs::read_to_string(&path).ok()?;
    let root: Value = serde_json::from_str(&text).ok()?;
    let dir = root.get("lastProject")?.as_str()?;
    let p = PathBuf::from(dir);
    if p.is_dir() {
        Some(p)
    } else {
        None
    }
}
