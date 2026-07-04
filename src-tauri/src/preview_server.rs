//! Built-in preview server: static file server + injecting reverse proxy.
//!
//! Two jobs, one server:
//! 1. **Static mode** — serves the current project directory so a plain
//!    `index.html` can be previewed with zero setup.
//! 2. **Proxy mode** — when a dev server (Vite/Next/…) is the preview target,
//!    the iframe loads THIS server, which forwards every request to the dev
//!    server and injects the visual-inspector script into HTML responses.
//!    That's what makes element selection work on any site automatically,
//!    without touching the user's project (an iframe on another origin can't
//!    be scripted from the app — the script must come from the same origin).
//!
//! The server binds one fixed port for the app's lifetime; root/target follow
//! the open project / active preview.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Universal visual-inspector bridge, injected into every HTML page served or
/// proxied. Protocol (postMessage with the app): forgia:enable/disable/ping in,
/// forgia:ready/pong/hover/select out. Resolves source file:line from React
/// fiber `_debugSource` when available (React <19 dev), and ALWAYS includes a
/// CSS selector + outerHTML so selection works on any framework or plain HTML.
const INSPECTOR_JS: &str = r#"
(function () {
  'use strict';
  if (window.__forgia_injected__) return;
  window.__forgia_injected__ = true;

  /* --- HMR passthrough -------------------------------------------------
   * The page is served through kikkoCode's proxy, but WebSockets (Vite/Next
   * HMR) can't ride tiny_http. WebSocket connections are NOT subject to the
   * same-origin policy, so we simply retarget any socket aimed at the proxy
   * origin straight at the real dev server — live reload works untouched. */
  var wsTarget = window.__kikko_ws_target__;
  if (wsTarget && window.WebSocket) {
    var OrigWS = window.WebSocket;
    var PatchedWS = function (url, protocols) {
      try {
        var u = new URL(url, location.href);
        if (u.host === location.host) {
          u.host = wsTarget;
          url = u.toString();
        }
      } catch (ex) {}
      return protocols === undefined ? new OrigWS(url) : new OrigWS(url, protocols);
    };
    PatchedWS.prototype = OrigWS.prototype;
    PatchedWS.CONNECTING = OrigWS.CONNECTING;
    PatchedWS.OPEN = OrigWS.OPEN;
    PatchedWS.CLOSING = OrigWS.CLOSING;
    PatchedWS.CLOSED = OrigWS.CLOSED;
    window.WebSocket = PatchedWS;
  }

  var enabled = false;
  var lastTarget = null;

  var hl = document.createElement('div');
  hl.id = '__forgia_hl__';
  hl.style.cssText =
    'position:fixed;pointer-events:none;box-sizing:border-box;' +
    'border:2px solid #f59e0b;background:rgba(245,158,11,0.08);' +
    'border-radius:4px;z-index:2147483647;transition:left 60ms,top 60ms,' +
    'width 60ms,height 60ms;display:none;';
  var tip = document.createElement('div');
  tip.style.cssText =
    'position:absolute;bottom:calc(100% + 5px);left:0;' +
    'background:#f59e0b;color:#000;font:bold 11px/1.4 monospace;' +
    'padding:2px 8px;border-radius:3px;white-space:nowrap;pointer-events:none;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.35);';
  hl.appendChild(tip);

  function mount() {
    if (document.body && !document.body.contains(hl)) document.body.appendChild(hl);
  }
  function positionAt(el) {
    mount();
    var r = el.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.left = r.left + 'px';
    hl.style.top = r.top + 'px';
    hl.style.width = r.width + 'px';
    hl.style.height = r.height + 'px';
  }
  function hide() { hl.style.display = 'none'; lastTarget = null; }

  function getFiberSource(el) {
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('__reactFiber$') === 0 || keys[i].indexOf('__reactInternals$') === 0) {
        var fiber = el[keys[i]];
        while (fiber) {
          if (fiber._debugSource) {
            var s = fiber._debugSource;
            return { file: s.fileName, line: s.lineNumber, col: s.columnNumber || 1 };
          }
          fiber = fiber.return;
        }
        return null;
      }
    }
    return null;
  }
  function getAttrSource(el) {
    var t = (el.closest && el.closest('[data-forgia-loc]')) || el;
    var loc = t.dataset && t.dataset.forgiaLoc;
    if (!loc) return null;
    var parts = loc.split(':');
    if (parts.length < 2) return null;
    var col = parseInt(parts.pop()) || 1;
    var line = parseInt(parts.pop()) || 1;
    return { file: parts.join(':'), line: line, col: col };
  }
  function getSource(el) {
    if (!el || el.nodeType !== 1) return null;
    return getFiberSource(el) || getAttrSource(el) || null;
  }

  /* CSS selector path — always available, on any site. */
  function cssPath(el) {
    var parts = [];
    var node = el;
    var depth = 0;
    while (node && node.nodeType === 1 && depth < 6) {
      var tag = node.tagName.toLowerCase();
      if (tag === 'html' || tag === 'body') { parts.unshift(tag); break; }
      if (node.id) { parts.unshift(tag + '#' + node.id); break; }
      var cls = '';
      if (typeof node.className === 'string' && node.className.trim()) {
        var names = node.className.trim().split(/\s+/).slice(0, 2);
        cls = '.' + names.join('.');
      }
      var idx = 1;
      var sib = node;
      while ((sib = sib.previousElementSibling)) {
        if (sib.tagName === node.tagName) idx++;
      }
      parts.unshift(tag + cls + ':nth-of-type(' + idx + ')');
      node = node.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  function basename(p) { return p.split('/').pop().split('\\').pop(); }
  function safeHTML(el) {
    try {
      var h = el.outerHTML || '';
      return h.length > 600 ? h.slice(0, 600) + '…' : h;
    } catch (e) {
      return '<' + el.tagName.toLowerCase() + '>';
    }
  }
  function textSnippet(el) {
    try {
      var t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      return t.length > 120 ? t.slice(0, 120) + '…' : t;
    } catch (e) { return ''; }
  }

  function payload(type, el) {
    var src = getSource(el);
    return {
      type: type,
      file: src ? src.file : undefined,
      line: src ? src.line : undefined,
      col: src ? src.col : undefined,
      selector: cssPath(el),
      text: textSnippet(el),
      tagName: el.tagName.toLowerCase(),
      outerHTML: safeHTML(el),
    };
  }

  function onMove(e) {
    if (!enabled) return;
    var el = e.target;
    if (el === hl || hl.contains(el) || el === lastTarget) return;
    lastTarget = el;
    if (!el || el.nodeType !== 1) { hide(); return; }
    positionAt(el);
    var src = getSource(el);
    tip.textContent = src
      ? basename(src.file) + ':' + src.line
      : '<' + el.tagName.toLowerCase() + '>';
    try { window.parent.postMessage(payload('forgia:hover', el), '*'); } catch (ex) {}
  }
  function onClick(e) {
    if (!enabled) return;
    var el = e.target;
    if (el === hl || hl.contains(el)) return;
    if (!el || el.nodeType !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    hide();
    try { window.parent.postMessage(payload('forgia:select', el), '*'); } catch (ex) {}
  }
  function onLeave() { if (enabled) hide(); }

  function enable() {
    if (enabled) return;
    enabled = true;
    if (document.body) document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseleave', onLeave);
    mount();
  }
  function disable() {
    if (!enabled) return;
    enabled = false;
    if (document.body) document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mouseleave', onLeave);
    hide();
  }

  /* --- A11y / QA audit (on demand) ------------------------------------
   * The app sends {type:'forgia:audit'}; we scan the DOM for concrete,
   * high-signal accessibility problems and post them back. Heuristic but
   * real — enough to hand the agent an accurate fix list. */
  function relLum(r, g, b) {
    var a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function parseRGB(s) {
    var m = s && s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',').map(function (x) { return parseFloat(x); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function effectiveBg(el) {
    var node = el;
    while (node && node.nodeType === 1) {
      var c = parseRGB(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.5) return c;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  function contrast(fg, bg) {
    var l1 = relLum(fg.r, fg.g, fg.b), l2 = relLum(bg.r, bg.g, bg.b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function selOf(el) {
    try { return cssPath(el); } catch (e) { return el.tagName ? el.tagName.toLowerCase() : '?'; }
  }
  function runAudit() {
    var f = [];
    function add(rule, message, el) {
      if (f.length >= 40) return;
      f.push({
        rule: rule,
        message: String(message).slice(0, 200),
        selector: el ? selOf(el).slice(0, 160) : undefined,
      });
    }
    if (!document.documentElement.getAttribute('lang'))
      add('lang', '<html> has no lang attribute');
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.hasAttribute('alt')) add('img-alt', 'image without alt attribute', img);
    });
    document.querySelectorAll('a,button,[role="button"]').forEach(function (el) {
      var name = (el.getAttribute('aria-label') || el.textContent || el.title || '').trim();
      var hasImg = el.querySelector && el.querySelector('img[alt]:not([alt=""])');
      if (!name && !hasImg)
        add('name', el.tagName.toLowerCase() + ' has no accessible name', el);
    });
    document.querySelectorAll('input,select,textarea').forEach(function (el) {
      if (el.type === 'hidden') return;
      var labelled =
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        (el.closest && el.closest('label'));
      if (!labelled && el.id) {
        try { labelled = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); } catch (e) {}
      }
      if (!labelled) add('label', 'form field without an associated label', el);
    });
    var nodes = document.querySelectorAll('p,span,a,li,button,h1,h2,h3,h4,h5,label,small');
    var checked = 0;
    for (var i = 0; i < nodes.length && checked < 120; i++) {
      var el = nodes[i];
      var own = '';
      for (var c = 0; c < el.childNodes.length; c++) {
        if (el.childNodes[c].nodeType === 3) own += el.childNodes[c].textContent;
      }
      own = own.trim();
      if (!own) continue;
      var st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || parseFloat(st.opacity) < 0.1) continue;
      var fg = parseRGB(st.color);
      if (!fg) continue;
      var ratio = contrast(fg, effectiveBg(el));
      var size = parseFloat(st.fontSize) || 16;
      var bold = (parseInt(st.fontWeight) || 400) >= 700;
      var min = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      checked++;
      if (ratio < min)
        add('contrast', 'low contrast ' + ratio.toFixed(2) + ':1 (needs ' + min + ':1) — "' + own.slice(0, 30) + '"', el);
    }
    var hs = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
    var prev = 0;
    for (var j = 0; j < hs.length; j++) {
      var lvl = parseInt(hs[j].tagName[1]);
      if (prev && lvl > prev + 1) { add('heading-order', 'heading jumps from h' + prev + ' to h' + lvl, hs[j]); break; }
      prev = lvl;
    }
    var taps = document.querySelectorAll('a,button,[role="button"],input,select');
    var tcount = 0;
    for (var k = 0; k < taps.length && tcount < 40; k++) {
      var r = taps[k].getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      tcount++;
      if (r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40))
        add('tap-target', 'tap target ' + Math.round(r.width) + '×' + Math.round(r.height) + 'px (< 44px)', taps[k]);
    }
    return f;
  }

  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    var t = e.data.type;
    if (t === 'forgia:enable') enable();
    else if (t === 'forgia:disable') disable();
    else if (t === 'forgia:ping') {
      try { window.parent.postMessage({ type: 'forgia:pong' }, '*'); } catch (ex) {}
    } else if (t === 'forgia:audit') {
      try {
        window.parent.postMessage({ type: 'forgia:audit-result', findings: runAudit() }, '*');
      } catch (ex) {
        try { window.parent.postMessage({ type: 'forgia:audit-result', findings: [], error: String(ex) }, '*'); } catch (e2) {}
      }
    }
  });

  function signalReady() {
    try { window.parent.postMessage({ type: 'forgia:ready' }, '*'); } catch (ex) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', signalReady);
  } else {
    signalReady();
  }

  /* --- Error radar ---------------------------------------------------
   * Report the page's runtime problems to the app: JS errors, unhandled
   * promise rejections, failed resource loads and console.error calls.
   * The app shows them on the preview and can hand them to the agent. */
  var errCount = 0;
  function pushErr(kind, message, source) {
    if (errCount >= 50) return; // cap — a render loop must not flood the app
    errCount++;
    try {
      window.parent.postMessage({
        type: 'forgia:pageerror',
        error: {
          kind: kind,
          message: String(message).slice(0, 600),
          source: source ? String(source).slice(0, 200) : undefined,
          ts: Date.now(),
        },
      }, '*');
    } catch (ex) {}
  }
  window.addEventListener('error', function (e) {
    if (e && e.message) {
      pushErr('js', e.message, (e.filename || '') + (e.lineno ? ':' + e.lineno : ''));
      return;
    }
    var t = e && e.target;
    if (!t) return;
    // Auto-heal a broken <img> so the preview looks realistic immediately:
    // swap the 404'd src for a real Lorem Picsum photo sized to the element.
    // (Preview-only — the agent should still fix the source. Guard against loops.)
    if (t.tagName === 'IMG' && !t.dataset.kikkoHealed) {
      var orig = t.src;
      t.dataset.kikkoHealed = '1';
      var r = t.getBoundingClientRect();
      var w = Math.max(16, Math.round(r.width || parseInt(t.getAttribute('width')) || 800));
      var h = Math.max(16, Math.round(r.height || parseInt(t.getAttribute('height')) || Math.round(w * 0.66)));
      var seed = encodeURIComponent(((t.alt || 'img').replace(/[^a-z0-9]+/gi, '-') || 'img').slice(0, 24));
      t.src = 'https://picsum.photos/seed/' + seed + '/' + w + '/' + h;
      pushErr('resource', 'broken image auto-healed to Picsum (fix the src in code): ' + (orig || ''), 'img');
      return;
    }
    if (t.src || t.href) {
      // capture-phase catches resource load failures (script/css/other)
      pushErr('resource', 'failed to load: ' + (t.src || t.href),
        t.tagName ? t.tagName.toLowerCase() : undefined);
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    pushErr('promise', (r && (r.stack || r.message)) || String(r));
  });
  var __origConsoleError = console.error;
  console.error = function () {
    try {
      var msg = Array.prototype.map.call(arguments, function (a) {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (ex) { return String(a); }
      }).join(' ');
      pushErr('console', msg);
    } catch (ex) {}
    return __origConsoleError.apply(console, arguments);
  };
})();
"#;

pub struct PreviewServer {
    port: u16,
    /// The directory currently served in static mode (the open project).
    root: Arc<Mutex<Option<PathBuf>>>,
    /// When set, every request is forwarded to this base URL (a dev server)
    /// with the inspector injected into HTML responses.
    proxy_target: Arc<Mutex<Option<String>>>,
}

impl PreviewServer {
    /// Bind a free port and spawn the serving thread. Returns `None` if it could
    /// not bind (preview is then simply unavailable — never fatal for the app).
    pub fn start() -> Option<Self> {
        let server = tiny_http::Server::http("127.0.0.1:0").ok()?;
        let port = server.server_addr().to_ip()?.port();
        let root: Arc<Mutex<Option<PathBuf>>> = Arc::new(Mutex::new(None));
        let proxy_target: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let thread_root = root.clone();
        let thread_target = proxy_target.clone();

        std::thread::spawn(move || {
            for request in server.incoming_requests() {
                let root_dir = thread_root.lock().unwrap().clone();
                let target = thread_target.lock().unwrap().clone();
                // One thread per request: a slow proxied asset must not block
                // the rest of the page (dev servers load many modules at once).
                std::thread::spawn(move || match target {
                    Some(t) => proxy(request, &t),
                    None => serve_static(request, root_dir),
                });
            }
        });

        eprintln!("[kikkocode] preview server listening on 127.0.0.1:{port}");
        Some(Self {
            port,
            root,
            proxy_target,
        })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    /// Point the static side at a new project directory.
    pub fn set_root(&self, dir: Option<PathBuf>) {
        *self.root.lock().unwrap() = dir;
    }

    /// Enable (Some) or disable (None) proxy mode.
    pub fn set_proxy_target(&self, target: Option<String>) {
        *self.proxy_target.lock().unwrap() =
            target.map(|t| t.trim().trim_end_matches('/').to_string());
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

/// Insert the inspector script right before `</body>` (or append at the end if
/// the page has no closing body tag). ASCII-lowercasing keeps byte offsets 1:1,
/// so the index found on the lowered copy is valid on the original.
/// `ws_target` (host:port of the real dev server, proxy mode only) enables the
/// WebSocket/HMR passthrough inside the injected script.
fn inject_inspector(html: &str, ws_target: Option<&str>) -> String {
    let cfg = ws_target
        .map(|h| format!("window.__kikko_ws_target__={h:?};"))
        .unwrap_or_default();
    let tag = format!("<script id=\"__forgia_inspector__\">{cfg}{INSPECTOR_JS}</script>");
    let lower = html.to_ascii_lowercase();
    match lower.rfind("</body>") {
        Some(idx) => format!("{}{}{}", &html[..idx], tag, &html[idx..]),
        None => format!("{html}{tag}"),
    }
}

/// Host:port of a target URL (`http://localhost:3002` → `localhost:3002`).
fn host_of(target: &str) -> &str {
    target
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/')
}

/// Forward one request to the dev server at `target`, injecting the inspector
/// into HTML responses. Runs on its own thread (blocking I/O is fine here).
fn proxy(mut request: tiny_http::Request, target: &str) {
    let url = format!("{}{}", target, request.url());

    let client = match reqwest::blocking::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            let _ = request.respond(text_response(502, "proxy client error"));
            return;
        }
    };

    let method = reqwest::Method::from_bytes(request.method().as_str().as_bytes())
        .unwrap_or(reqwest::Method::GET);

    // Read the incoming body (POST forms etc.).
    let mut body = Vec::new();
    let _ = request.as_reader().read_to_end(&mut body);

    // Forward headers, except hop-by-hop ones and Accept-Encoding: we need the
    // response uncompressed to inject the script, and Host must match the
    // target, not this proxy.
    let mut req = client.request(method, &url);
    for h in request.headers() {
        let name = h.field.as_str().as_str().to_ascii_lowercase();
        if matches!(
            name.as_str(),
            "host" | "accept-encoding" | "connection" | "content-length" | "origin" | "referer"
        ) {
            continue;
        }
        req = req.header(h.field.as_str().as_str(), h.value.as_str());
    }
    if !body.is_empty() {
        req = req.body(body);
    }

    let resp = match req.send() {
        Ok(r) => r,
        Err(e) => {
            let _ = request.respond(text_response(
                502,
                &format!("preview proxy could not reach {target}: {e}"),
            ));
            return;
        }
    };

    let status = resp.status().as_u16();
    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();
    let bytes = match resp.bytes() {
        Ok(b) => b.to_vec(),
        Err(_) => Vec::new(),
    };

    // Inject into HTML documents only.
    let out = if content_type.to_ascii_lowercase().contains("text/html") {
        match String::from_utf8(bytes) {
            Ok(html) => inject_inspector(&html, Some(host_of(target))).into_bytes(),
            Err(e) => e.into_bytes(), // not valid UTF-8 — pass through untouched
        }
    } else {
        bytes
    };

    let mut response = tiny_http::Response::from_data(out).with_status_code(status);
    if let Ok(header) =
        tiny_http::Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes())
    {
        response = response.with_header(header);
    }
    let _ = request.respond(response);
}

/// Serve a single request from `root`, guarding against path traversal.
fn serve_static(request: tiny_http::Request, root: Option<PathBuf>) {
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
            let ctype = content_type(path);
            // The static preview gets the inspector too, so element selection
            // works on plain HTML pages served straight from disk.
            if ctype.starts_with("text/html") {
                if let Ok(html) = String::from_utf8(buf.clone()) {
                    // No ws target: static files have no dev server behind them.
                    buf = inject_inspector(&html, None).into_bytes();
                }
            }
            let mut resp = tiny_http::Response::from_data(buf);
            if let Ok(header) =
                tiny_http::Header::from_bytes(&b"Content-Type"[..], ctype.as_bytes())
            {
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
