import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ChatShell } from "@/features/chat/ChatShell";

export default function App() {
  return (
    <div className="flex h-full overflow-hidden bg-[var(--background)]">
      <SessionSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatShell />
      </main>
    </div>
  );
}
