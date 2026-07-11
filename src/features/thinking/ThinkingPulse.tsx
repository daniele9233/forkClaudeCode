import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";

/**
 * ThinkingPulse — the "the agent is working" visual: a floating card with a
 * living waveform of amber/cyan light that pulses with REAL activity (every
 * streaming update bumps its energy, which then decays). Pure canvas, no deps.
 * Dismissible per run (comes back on the next one). With reduced motion it
 * renders a calm static gradient instead of animating.
 */
export function ThinkingPulse() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const running = useChatStore((s) =>
    activeSessionId ? s.runningSessions.has(activeSessionId) : false,
  );
  // Reference changes on every streaming update — our activity signal.
  const liveMessages = useChatStore((s) => s.liveMessages);
  const [dismissed, setDismissed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const energyRef = useRef(0);
  const rafRef = useRef(0);

  // A new run un-dismisses the widget.
  useEffect(() => {
    if (running) setDismissed(false);
  }, [running]);

  // Each live update injects energy; the RAF loop below decays it.
  useEffect(() => {
    energyRef.current = Math.min(1, energyRef.current + 0.35);
  }, [liveMessages]);

  const show = running && !dismissed;

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = (canvas.width = 300);
    const H = (canvas.height = 72);
    const AMBER = "#e7a93c";
    const CYAN = "#38bdf8";

    // Static, calm render for reduced motion: one soft gradient wave.
    if (reduced) {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, AMBER);
      g.addColorStop(1, CYAN);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = H / 2 + Math.sin(x / 26) * 10;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    // Drifting spark particles (amber/cyan), reborn at the bottom.
    const sparks = Array.from({ length: 22 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 0.2 + Math.random() * 0.5,
      r: 0.6 + Math.random() * 1.3,
      c: Math.random() < 0.6 ? AMBER : CYAN,
    }));

    let t = 0;
    const wave = (phase: number, freq: number, amp: number) => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const n =
          Math.sin(x / freq + t * 0.04 + phase) *
          Math.sin(x / (freq * 2.7) - t * 0.023 + phase * 2);
        const y = H / 2 + n * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const draw = () => {
      t += 1;
      // Energy decays; a floor keeps the idle wave gently alive.
      energyRef.current = Math.max(0, energyRef.current - 0.006);
      const e = 0.18 + energyRef.current * 0.82;

      ctx.clearRect(0, 0, W, H);

      // Sparks rise faster when the model is streaming hard.
      for (const s of sparks) {
        s.y -= s.v * (0.4 + e * 1.6);
        if (s.y < -2) {
          s.y = H + 2;
          s.x = Math.random() * W;
        }
        ctx.globalAlpha = 0.12 + e * 0.45;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Main amber wave with glow, cyan echo behind it.
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 6 + e * 10;
      ctx.shadowColor = CYAN;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + e * 0.35})`;
      wave(1.7, 34, 8 + e * 16);
      ctx.lineWidth = 1.8;
      ctx.shadowColor = AMBER;
      ctx.strokeStyle = `rgba(231, 169, 60, ${0.55 + e * 0.45})`;
      wave(0, 46, 10 + e * 22);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [show]);

  if (!show) return null;

  return (
    <div className="glass-strong glass-border fixed bottom-10 right-4 z-40 w-[316px] overflow-hidden rounded-xl shadow-xl">
      <div className="flex items-center gap-2 px-3 pt-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--chat-agent-accent)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--chat-agent-accent)]" />
        </span>
        <span className="hud-label flex-1 text-[var(--muted-foreground)]">
          l'agente sta lavorando…
        </span>
        <button
          onClick={() => setDismissed(true)}
          title="Nascondi per questo run"
          className="rounded p-0.5 text-[var(--muted-foreground)] hover:bg-white/10 hover:text-[var(--foreground)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <canvas ref={canvasRef} className="block h-[72px] w-[300px] px-2 pb-1" />
    </div>
  );
}
