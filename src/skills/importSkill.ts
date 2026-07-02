import { invoke } from "@tauri-apps/api/core";
import type { Skill } from "./catalog";

/**
 * Import a skill from a URL (GitHub raw / gist raw / any https markdown).
 * Accepted shape — plain markdown, SKILL.md style:
 *   # Skill name
 *   > one-line description        (or the first paragraph)
 *   keywords: kw1, kw2, kw3       (optional; derived from name/description if absent)
 *   ...the rest is the playbook body...
 * Frontmatter (--- name/description/keywords ---) is also understood.
 */
export async function importSkillFromUrl(url: string): Promise<Skill> {
  // Normalize github.com blob links to raw.
  const raw = url
    .trim()
    .replace(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\//,
      "https://raw.githubusercontent.com/$1/$2/",
    );
  const md = await invoke<string>("fetch_text", { url: raw });
  const skill = parseSkillMarkdown(md, raw);
  if (!skill) throw new Error("could not parse a skill from that file");
  return skill;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function parseSkillMarkdown(md: string, sourceUrl: string): Skill | null {
  let text = md.trim();
  if (!text) return null;

  let name = "";
  let description = "";
  let keywords: string[] = [];

  // Optional YAML-ish frontmatter.
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^(name|title|description|keywords|triggers)\s*:\s*(.+)$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim().replace(/^["'[]|["'\]]$/g, "");
      if (key === "name" || key === "title") name = val;
      else if (key === "description") description = val;
      else keywords = val.split(",").map((k) => k.trim().replace(/^["']|["']$/g, ""));
    }
    text = text.slice(fm[0].length).trim();
  }

  // First heading → name.
  const h = text.match(/^#{1,3}\s+(.+)$/m);
  if (!name && h) name = h[1].trim();
  if (!name) return null;

  // Inline "keywords:" line anywhere near the top.
  if (keywords.length === 0) {
    const kw = text.match(/^\s*(?:keywords|triggers)\s*:\s*(.+)$/im);
    if (kw) keywords = kw[1].split(",").map((k) => k.trim());
  }

  // Description: first blockquote or first non-heading paragraph.
  if (!description) {
    const bq = text.match(/^>\s*(.+)$/m);
    if (bq) description = bq[1].trim();
    else {
      const para = text
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#") && !l.startsWith(">"));
      description = (para ?? name).slice(0, 200);
    }
  }

  // Fallback keywords from the name + description words.
  if (keywords.length === 0) {
    keywords = Array.from(
      new Set(
        `${name} ${description}`
          .toLowerCase()
          .match(/[a-z][a-z0-9-]{3,}/g)
          ?.slice(0, 8) ?? [],
      ),
    );
  }
  keywords = keywords.filter(Boolean).slice(0, 16);
  if (keywords.length === 0) return null;

  return {
    id: `custom-${slugify(name)}`,
    name,
    emoji: "📦",
    description,
    keywords,
    body: text.slice(0, 12_000),
    source: sourceUrl.replace(/^https:\/\//, "").slice(0, 60),
  };
}
