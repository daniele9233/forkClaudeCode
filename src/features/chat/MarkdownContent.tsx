import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MermaidDiagram } from "./MermaidDiagram";

interface Props {
  content: string;
  className?: string;
  streaming?: boolean;
}

/** Extract the language + text from a fenced code block's <code> child. */
function fencedCode(children: unknown): { lang: string; text: string } | null {
  const child = Array.isArray(children) ? children[0] : children;
  const props = (child as { props?: { className?: string; children?: unknown } })?.props;
  if (!props) return null;
  const lang = /language-(\w+)/.exec(props.className ?? "")?.[1] ?? "";
  return { lang, text: String(props.children ?? "") };
}

const markdownComponents: Components = {
  // Render ```mermaid blocks as diagrams; everything else stays a normal <pre>.
  pre({ children }) {
    const fc = fencedCode(children);
    if (fc?.lang === "mermaid") return <MermaidDiagram code={fc.text} />;
    return <pre>{children}</pre>;
  },
};

export function MarkdownContent({ content, className, streaming }: Props) {
  return (
    <div
      className={cn(
        // Prose-like styles using our design tokens
        "text-sm leading-relaxed text-[var(--foreground)]",
        "[&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h1]:mt-4",
        "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3",
        "[&_ul]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc",
        "[&_ol]:mb-3 [&_ol]:ml-4 [&_ol]:list-decimal",
        "[&_li]:mb-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted-foreground)] [&_blockquote]:italic",
        "[&_hr]:border-[var(--border)] [&_hr]:my-4",
        "[&_a]:text-[var(--primary)] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        // Inline code
        "[&_:not(pre)>code]:bg-[var(--muted)] [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-xs",
        // Code blocks
        "[&_pre]:bg-[var(--color-forge-950)] [&_pre]:border [&_pre]:border-[var(--border)] [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:mb-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono [&_pre_code]:text-xs [&_pre_code]:text-[var(--foreground)]",
        // Tables
        "[&_table]:w-full [&_table]:mb-3 [&_table]:text-sm",
        "[&_th]:border [&_th]:border-[var(--border)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-[var(--muted)]",
        "[&_td]:border [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--primary)] align-text-bottom"
          aria-hidden
        />
      )}
    </div>
  );
}
