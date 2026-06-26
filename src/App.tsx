import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ChatShell } from "@/features/chat/ChatShell";
import { FileTree } from "@/features/filetree/FileTree";

export default function App() {
  return (
    <div className="flex h-full overflow-hidden bg-[var(--background)]">
      {/* Left sidebar: sessions (top) + file tree (bottom) */}
      <div className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)]">
        {/* Sessions — caps at 45% height, scrolls internally */}
        <div className="shrink-0 overflow-hidden" style={{ maxHeight: "45%" }}>
          <SessionSidebar />
        </div>

        {/* Divider */}
        <div className="h-px shrink-0 bg-[var(--border)]" />

        {/* File tree — takes remaining space */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <FileTree />
        </div>
      </div>

      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatShell />
      </main>
    </div>
  );
}
