/**
 * System directive injected when the Blender MCP server is configured AND the
 * prompt looks 3D/Blender-related. Without it, models "helpfully" fall back to
 * spawning `blender --background` with a temp .py script — which creates a
 * separate .blend file on disk and never touches the user's OPEN Blender
 * instance (the whole point of the MCP connection). Seen in the wild with
 * deepseek: cube created, but in a detached headless Blender.
 */
const POLICY = `Blender note (kikkoCode): the Blender MCP server is connected to the user's currently OPEN Blender instance (addon socket on port 9876). For ANY Blender/3D-asset work you MUST use the Blender MCP tools (scene inspection + code execution in the live scene): the user is watching their viewport and must SEE the objects appear in real time.
STRICTLY FORBIDDEN: launching \`blender --background\`, \`blender.exe\` with \`--python\`, or writing standalone Blender .py scripts run outside MCP — that creates a detached headless instance and a separate .blend file the user never sees. If the Blender MCP tools are not available or error out, STOP and tell the user (check: Blender open + addon "Start MCP Server" pressed) instead of falling back to background scripts.
Web-3D pipeline: model in the live scene via MCP → verify via scene info/screenshot → export an optimized .glb into the web project's \`public/models/\` → load it in React Three Fiber with drei's useGLTF (Suspense + fallback).`;

const KEYWORDS = [
  "blender",
  "3d",
  ".glb",
  "gltf",
  "mesh",
  "tridimension",
  "low-poly",
  "low poly",
];

/**
 * The Blender policy for SYSTEM-role injection, or null when it doesn't apply.
 * Only fires when the blender MCP server is actually configured & enabled —
 * otherwise the directive would forbid the only working path (local scripts).
 */
export function blenderPolicyNote(text: string, blenderMcpOn: boolean): string | null {
  if (!blenderMcpOn) return null;
  const lower = text.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k)) ? POLICY : null;
}
