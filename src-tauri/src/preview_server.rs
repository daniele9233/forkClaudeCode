//! A tiny built-in static file server for the web preview.
//!
//! It serves the current project directory so a plain `index.html` (produced by
//! the agent) can be previewed in-app with zero setup — no `npm run dev` needed.
//! The server binds one fixed port for the app's lifetime; its root follows the
//! open project (updated on project switch).

use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

pub struct PreviewServer {
    port: u16,
    /// The directory currently served (the open project). `None` until a project
    /// is opened.
    root: Arc<Mutex<Option<PathBuf>>>,
}

impl PreviewServer {
    /// Bind a free port and spawn the serving thread. Returns `None` if it could
    /// not bind (preview is then simply unavailable — never fatal for the app).
    pub fn start() -> Option<Self> {
        let server = tiny_http::Server::http("127.0.0.1:0").ok()?;
        let port = server.server_addr().to_ip()?.port();
        let root: Arc<Mutex<Option<PathBuf>>> = Arc::new(Mutex::new(None));
        let thread_root = root.clone();

        std::thread::spawn(move || {
            for request in server.incoming_requests() {
                let root_dir = thread_root.lock().unwrap().clone();
                serve(request, root_dir);
            }
        });

        eprintln!("[kikkocode] preview server listening on 127.0.0.1:{port}");
        Some(Self { port, root })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    /// Point the server at a new project directory.
    pub fn set_root(&self, dir: Option<PathBuf>) {
        *self.root.lock().unwrap() = dir;
    }

    /// Base URL of the preview server (e.g. `http://127.0.0.1:41234`).
    pub fn base_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }

    /// Whether the current project root has a servable entry page
    /// (`index.html` or `index.htm`) at its top level.
    pub fn has_index(&self) -> bool {
        let Some(root) = self.root.lock().unwrap().clone() else {
            return false;
        };
        root.join("index.html").is_file() || root.join("index.htm").is_file()
    }
}

/// Serve a single request from `root`, guarding against path traversal.
fn serve(request: tiny_http::Request, root: Option<PathBuf>) {
    let Some(root) = root else {
        let _ = request.respond(text_response(503, "no project open"));
        return;
    };

    // Strip query/fragment and percent-decode the path.
    let raw = request.url().to_string();
    let path_part = raw.split(['?', '#']).next().unwrap_or("/");
    let decoded = percent_decode(path_part);
    let rel = decoded.trim_start_matches('/');

    let mut target = root.join(rel);
    if target.is_dir() {
        target = target.join("index.html");
    }

    // Prevent escaping the project root via `..` or symlinks.
    let canonical_root = root.canonicalize().unwrap_or(root.clone());
    match target.canonicalize() {
        Ok(canon) if canon.starts_with(&canonical_root) && canon.is_file() => {
            let _ = request.respond(file_response(&canon));
        }
        _ => {
            let _ = request.respond(text_response(404, "not found"));
        }
    }
}

fn file_response(path: &Path) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let mut buf = Vec::new();
    match std::fs::File::open(path).and_then(|mut f| f.read_to_end(&mut buf)) {
        Ok(_) => {
            let mut resp = tiny_http::Response::from_data(buf);
            if let Ok(header) = tiny_http::Header::from_bytes(
                &b"Content-Type"[..],
                content_type(path).as_bytes(),
            ) {
                resp = resp.with_header(header);
            }
            resp
        }
        Err(_) => text_response(500, "read error"),
    }
}

fn text_response(status: u16, body: &str) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    tiny_http::Response::from_string(body).with_status_code(status)
}

/// Minimal percent-decoding for request paths (enough for spaces / accents in
/// Windows folder names). Leaves malformed escapes untouched.
fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hi = (bytes[i + 1] as char).to_digit(16);
            let lo = (bytes[i + 2] as char).to_digit(16);
            if let (Some(h), Some(l)) = (hi, lo) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Best-effort MIME type from the file extension.
fn content_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .as_deref()
    {
        Some("html") | Some("htm") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js") | Some("mjs") => "text/javascript; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("ttf") => "font/ttf",
        Some("wasm") => "application/wasm",
        Some("txt") => "text/plain; charset=utf-8",
        Some("map") => "application/json; charset=utf-8",
        _ => "application/octet-stream",
    }
}
