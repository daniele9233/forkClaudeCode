/**
 * FORGIA Visual Inspector — Vite plugin for user projects.
 *
 * Add to your project's vite.config.ts:
 *
 *   import { forgiaInspector } from './path/to/ForgiaInspectorPlugin';
 *   export default defineConfig({ plugins: [react(), forgiaInspector()] });
 *
 * The plugin injects a lightweight bridge script into the preview HTML that:
 *  1. Walks React's fiber tree (available in dev mode) to map DOM elements → file:line
 *  2. Falls back to `data-forgia-loc` attributes if fiber info is unavailable
 *  3. Sends hover/click events to FORGIA via window.parent.postMessage
 *  4. Listens for `forgia:enable` / `forgia:disable` commands from FORGIA
 *
 * Only active in serve (dev) mode — no effect on production builds.
 */

import type { Plugin, HtmlTagDescriptor } from "vite";

const INSPECTOR_SCRIPT = /* js */ `
(function () {
  'use strict';

  var enabled = false;
  var lastTarget = null;

  /* --- Highlight overlay --- */
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
    hl.style.left = (r.left + window.scrollX) + 'px';
    hl.style.top  = (r.top  + window.scrollY) + 'px';
    hl.style.width  = r.width  + 'px';
    hl.style.height = r.height + 'px';
  }

  function hide() { hl.style.display = 'none'; lastTarget = null; }

  /* --- Source resolution --- */
  function getFiberSource(el) {
    var keys = Object.keys(el);
    var fk = null;
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('__reactFiber$') || keys[i].startsWith('__reactInternals$')) {
        fk = keys[i]; break;
      }
    }
    if (!fk) return null;
    var fiber = el[fk];
    while (fiber) {
      if (fiber._debugSource) {
        var s = fiber._debugSource;
        return { file: s.fileName, line: s.lineNumber, col: s.columnNumber || 1 };
      }
      fiber = fiber.return;
    }
    return null;
  }

  function getAttrSource(el) {
    var t = el.closest('[data-forgia-loc]') || el;
    var loc = t.dataset && t.dataset.forgiaLoc;
    if (!loc) return null;
    var parts = loc.split(':');
    if (parts.length < 2) return null;
    var col  = parseInt(parts.pop()) || 1;
    var line = parseInt(parts.pop()) || 1;
    return { file: parts.join(':'), line: line, col: col };
  }

  function getSource(el) {
    if (!el || el.nodeType !== 1) return null;
    return getFiberSource(el) || getAttrSource(el) || null;
  }

  function basename(p) {
    return p.split('/').pop().split('\\\\').pop();
  }

  function safeHTML(el) {
    try { return el.cloneNode(false).outerHTML || ''; }
    catch(e) { return '<' + el.tagName.toLowerCase() + '>'; }
  }

  /* --- Event handlers --- */
  function onMove(e) {
    if (!enabled) return;
    var el = e.target;
    if (el === hl || hl.contains(el) || el === lastTarget) return;
    lastTarget = el;
    var src = getSource(el);
    if (src) {
      positionAt(el);
      tip.textContent = basename(src.file) + ':' + src.line;
      try {
        window.parent.postMessage({
          type: 'forgia:hover',
          file: src.file, line: src.line, col: src.col,
          tagName: el.tagName.toLowerCase(),
          outerHTML: safeHTML(el),
        }, '*');
      } catch(ex) {}
    } else {
      hide();
    }
  }

  function onClick(e) {
    if (!enabled) return;
    var el = e.target;
    if (el === hl || hl.contains(el)) return;
    var src = getSource(el);
    if (src) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      hide();
      try {
        window.parent.postMessage({
          type: 'forgia:select',
          file: src.file, line: src.line, col: src.col,
          tagName: el.tagName.toLowerCase(),
          outerHTML: safeHTML(el),
        }, '*');
      } catch(ex) {}
    }
  }

  function onLeave() { if (enabled) hide(); }

  function enable() {
    if (enabled) return;
    enabled = true;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseleave', onLeave);
    mount();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mouseleave', onLeave);
    hide();
  }

  /* --- Command listener from FORGIA GUI --- */
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    var t = e.data.type;
    if (t === 'forgia:enable')  enable();
    else if (t === 'forgia:disable') disable();
    else if (t === 'forgia:ping') {
      try { window.parent.postMessage({ type: 'forgia:pong' }, '*'); } catch(ex) {}
    }
  });

  /* Signal readiness to FORGIA after DOM is ready */
  function signalReady() {
    try { window.parent.postMessage({ type: 'forgia:ready' }, '*'); } catch(ex) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', signalReady);
  } else {
    signalReady();
  }
})();
`;

export function forgiaInspector(): Plugin {
  return {
    name: "forgia-inspector",
    apply: "serve",
    transformIndexHtml(): HtmlTagDescriptor[] {
      return [
        {
          tag: "script",
          attrs: { type: "text/javascript", id: "__forgia_inspector__" },
          children: INSPECTOR_SCRIPT,
          injectTo: "body",
        },
      ];
    },
  };
}
