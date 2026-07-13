import { useEffect, useMemo, useRef } from "react";
import { useChatStore } from "@/stores/chat.store";
import { useBrainStore, type BrainMetric } from "@/stores/brain.store";
import { onEventType } from "@/opencode/events";
import type { EventFileEdited, EventFileWatcherUpdated } from "@opencode-ai/sdk/client";

/**
 * NeuralBrain — the 3D particle "digital brain" (video-inspired): neon neuron
 * clusters laid out as brain regions, connected by synapses, slowly rotating
 * in 3D with firing pulses traveling along the edges. Firing intensity is fed
 * by REAL agent activity (every streamed update bumps the energy), so the
 * cortex visibly "lights up" while the model works and idles down after.
 *
 * Pure canvas 2D with a hand-rolled 3D projection — no three.js, nothing added
 * to the bundle. Labels (region name + neurons · firing %) are drawn on-canvas
 * like the video's HUD boxes. Honors prefers-reduced-motion (static frame).
 */

interface Region {
  name: string;
  color: string;
  neurons: number;
  center: [number, number, number];
  spread: number;
  /** Real telemetry metric this region grows with (+ weight). */
  metric: BrainMetric;
  weight: number;
}

// Positions roughly follow the video's layout: prefrontal on top, motor/
// association around the middle band, language/hippocampus/brainstem below.
const REGIONS: Region[] = [
  {
    name: "PREFRONTAL",
    color: "#8b5cf6",
    neurons: 140,
    center: [0.12, 0.92, 0.1],
    spread: 0.4,
    metric: "prompts",
    weight: 0.8,
  },
  {
    name: "MOTOR CORTEX",
    color: "#ff3b5c",
    neurons: 190,
    center: [-0.5, 0.6, 0.22],
    spread: 0.42,
    metric: "edits",
    weight: 1,
  },
  {
    name: "ASSOCIATION",
    color: "#ff5c39",
    neurons: 260,
    center: [0.55, 0.42, -0.18],
    spread: 0.46,
    metric: "replies",
    weight: 0.5,
  },
  {
    name: "SENSORY CORTEX",
    color: "#e8edf2",
    neurons: 200,
    center: [-0.72, 0.05, -0.15],
    spread: 0.4,
    metric: "reads",
    weight: 1,
  },
  {
    name: "CONCEPT LAYER",
    color: "#ffa028",
    neurons: 160,
    center: [-0.12, 0.3, 0.55],
    spread: 0.44,
    metric: "prompts",
    weight: 1,
  },
  {
    name: "PREDICTIVE",
    color: "#ff43c8",
    neurons: 180,
    center: [0.78, -0.15, 0.18],
    spread: 0.4,
    metric: "replies",
    weight: 0.4,
  },
  {
    name: "FEATURE LAYER",
    color: "#38bdf8",
    neurons: 180,
    center: [-0.28, -0.32, 0.3],
    spread: 0.4,
    metric: "edits",
    weight: 0.6,
  },
  {
    name: "LANGUAGE",
    color: "#ff4438",
    neurons: 170,
    center: [-0.58, -0.55, -0.22],
    spread: 0.36,
    metric: "replies",
    weight: 1,
  },
  {
    name: "HIPPOCAMPUS",
    color: "#41ff6b",
    neurons: 160,
    center: [0.35, -0.65, -0.1],
    spread: 0.38,
    metric: "runs",
    weight: 1,
  },
  {
    name: "BRAINSTEM",
    color: "#ff8c1a",
    neurons: 120,
    center: [0.02, -0.98, 0.05],
    spread: 0.3,
    metric: "runs",
    weight: 0.5,
  },
];

interface Node {
  x: number;
  y: number;
  z: number;
  r: number; // regionIndex
  size: number;
}
interface Edge {
  a: number;
  b: number;
}
interface Pulse {
  edge: number;
  t: number;
  speed: number;
}

/** Deterministic-ish PRNG so the brain looks the same every mount. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBrain(nodeCounts: number[]) {
  const rnd = mulberry32(20260712);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  REGIONS.forEach((reg, ri) => {
    const count = nodeCounts[ri];
    const start = nodes.length;
    for (let i = 0; i < count; i++) {
      // Gaussian-ish scatter around the region center.
      const g = () => (rnd() + rnd() + rnd() - 1.5) * reg.spread;
      nodes.push({
        x: reg.center[0] + g(),
        y: reg.center[1] + g(),
        z: reg.center[2] + g(),
        r: ri,
        size: 0.7 + rnd() * 1.6,
      });
    }
    // Intra-region wiring: each node → its 2 nearest siblings.
    for (let i = start; i < nodes.length; i++) {
      const dists: { j: number; d: number }[] = [];
      for (let j = start; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        dists.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      dists.sort((p, q) => p.d - q.d);
      for (const { j } of dists.slice(0, 2)) {
        if (!edges.some((e) => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
          edges.push({ a: i, b: j });
        }
      }
    }
  });
  // Long-range fascicles between neighboring regions (the "wired" look).
  const perRegion: number[][] = REGIONS.map((_, ri) =>
    nodes.map((n, i) => (n.r === ri ? i : -1)).filter((i) => i >= 0),
  );
  for (let ri = 0; ri < REGIONS.length; ri++) {
    for (let k = 0; k < 3; k++) {
      const rj = (ri + 1 + Math.floor(rnd() * (REGIONS.length - 1))) % REGIONS.length;
      const a = perRegion[ri][Math.floor(rnd() * perRegion[ri].length)];
      const b = perRegion[rj][Math.floor(rnd() * perRegion[rj].length)];
      edges.push({ a, b });
    }
  }
  // Background starfield.
  const stars = Array.from({ length: 70 }, () => ({
    x: rnd(),
    y: rnd(),
    s: 0.4 + rnd() * 1.1,
    p: rnd() * Math.PI * 2,
  }));
  return { nodes, edges, stars };
}

/**
 * Neurons per region = a base population + REAL lifetime growth: the more the
 * agent has actually done here (files edited, replies, runs…), the denser that
 * region gets. Log-scaled so the brain grows fast early, then settles.
 */
function growthCounts(counts: Record<BrainMetric, number>): number[] {
  return REGIONS.map((reg) => {
    const real = Math.round(counts[reg.metric] * reg.weight);
    const grown = Math.min(26, Math.floor(6 * Math.log2(1 + real / 8)));
    return Math.max(10, Math.round(reg.neurons / 14) + grown);
  });
}

export function NeuralBrain({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef(0);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const counts = useBrainStore((s) => s.counts);
  const bump = useBrainStore((s) => s.bump);

  // REAL MEMORY: the brain is rebuilt (rarely) when lifetime activity crosses
  // a growth level — regions literally get denser as the project is worked on.
  const nodeCounts = useMemo(() => growthCounts(counts), [counts]);
  const brainKey = nodeCounts.join(",");
  const BRAIN = useMemo(
    () => buildBrain(nodeCounts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brainKey],
  );
  const countsRef = useRef(counts);
  countsRef.current = counts;

  // REAL FILE ACTIVITY: agent writes → MOTOR CORTEX; project file churn →
  // SENSORY CORTEX. This is what ties the brain to the actual files on disk.
  useEffect(() => {
    const unsubs = [
      onEventType<EventFileEdited>("file.edited", () => {
        energyRef.current = Math.min(1, energyRef.current + 0.2);
        useBrainStore.getState().bump("edits");
      }),
      onEventType<EventFileWatcherUpdated>("file.watcher.updated", () => {
        useBrainStore.getState().bump("reads");
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  // Every streamed update injects energy AND counts as real LANGUAGE activity.
  useEffect(() => {
    energyRef.current = Math.min(1, energyRef.current + 0.3);
    bump("replies");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMessages]);
  // A run starting gives a base kick + one prompt + one memory (run) formed.
  useEffect(() => {
    if (running) {
      energyRef.current = Math.max(energyRef.current, 0.5);
      bump("runs");
      bump("prompts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !wrap || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const pulses: Pulse[] = [];
    let angle = 0;
    let tick = 0;
    let raf = 0;

    const project = (n: { x: number; y: number; z: number }) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = n.x * cos - n.z * sin;
      const z = n.x * sin + n.z * cos;
      const scale = Math.min(W, H) * 0.34;
      const persp = 2.2 / (2.2 + z);
      return {
        x: W / 2 + x * scale * persp,
        y: H / 2 - n.y * scale * persp * 0.92,
        p: persp,
        z,
      };
    };

    const draw = () => {
      tick++;
      energyRef.current = Math.max(0, energyRef.current - 0.004);
      const e = energyRef.current;
      if (!reduced) angle += 0.0035 + e * 0.004;

      ctx.clearRect(0, 0, W, H);

      // Starfield
      for (const s of BRAIN.stars) {
        const a = 0.15 + 0.25 * Math.abs(Math.sin(tick * 0.01 + s.p));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#cfe3ff";
        ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
      }
      ctx.globalAlpha = 1;

      const proj = BRAIN.nodes.map(project);

      // Synapses
      ctx.lineWidth = 0.6;
      for (const ed of BRAIN.edges) {
        const A = proj[ed.a];
        const B = proj[ed.b];
        const col = REGIONS[BRAIN.nodes[ed.a].r].color;
        ctx.globalAlpha = 0.16 + 0.2 * Math.min(A.p, B.p) + e * 0.12;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Neurons
      for (let i = 0; i < BRAIN.nodes.length; i++) {
        const n = BRAIN.nodes[i];
        const P = proj[i];
        const col = REGIONS[n.r].color;
        const size = n.size * P.p;
        ctx.globalAlpha = 0.5 + 0.5 * P.p;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(P.x, P.y, size, 0, Math.PI * 2);
        ctx.fill();
        if (n.size > 1.7) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(P.x, P.y, size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (!reduced) {
        // Spawn firing pulses — more while the agent streams.
        const rate = 0.05 + e * 0.5;
        if (Math.random() < rate && pulses.length < 60) {
          pulses.push({
            edge: Math.floor(Math.random() * BRAIN.edges.length),
            t: 0,
            speed: 0.02 + Math.random() * 0.03,
          });
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const pu = pulses[i];
          pu.t += pu.speed;
          if (pu.t >= 1) {
            pulses.splice(i, 1);
            continue;
          }
          const ed = BRAIN.edges[pu.edge];
          const A = proj[ed.a];
          const B = proj[ed.b];
          const x = A.x + (B.x - A.x) * pu.t;
          const y = A.y + (B.y - A.y) * pu.t;
          const col = REGIONS[BRAIN.nodes[ed.a].r].color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = col;
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // HUD label boxes (like the video): region name + neurons · firing %.
      // Draw only when there's room; alternate sides to reduce overlap.
      const showLabels = W >= 230;
      if (showLabels) {
        ctx.textBaseline = "top";
        REGIONS.forEach((reg, ri) => {
          // Region centroid (projected).
          let cx = 0;
          let cy = 0;
          let cnt = 0;
          for (let i = 0; i < BRAIN.nodes.length; i++) {
            if (BRAIN.nodes[i].r !== ri) continue;
            cx += proj[i].x;
            cy += proj[i].y;
            cnt++;
          }
          cx /= cnt;
          cy /= cnt;
          const firing = (
            e * (3 + ((ri * 7) % 5)) +
            0.4 * Math.abs(Math.sin(tick * 0.02 + ri))
          ).toFixed(1);
          const title = reg.name;
          // REAL memory: the label shows this region's lifetime activity.
          const real = Math.round(countsRef.current[reg.metric] * reg.weight);
          const realFmt = real >= 1000 ? `${(real / 1000).toFixed(1)}K` : String(real);
          const sub = `${realFmt} eventi · firing ${firing}%`;
          ctx.font = "700 8px ui-monospace, monospace";
          const wTitle = ctx.measureText(title).width;
          ctx.font = "400 7px ui-monospace, monospace";
          const wSub = ctx.measureText(sub).width;
          const bw = Math.max(wTitle, wSub) + 10;
          const bh = 20;
          const side = ri % 2 === 0 ? 1 : -1;
          let bx = cx + side * 16 - (side < 0 ? bw : 0);
          let by = cy - bh / 2;
          bx = Math.max(2, Math.min(W - bw - 2, bx));
          by = Math.max(2, Math.min(H - bh - 2, by));
          // Connector
          ctx.strokeStyle = reg.color;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(side > 0 ? bx : bx + bw, by + bh / 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          // Box
          ctx.fillStyle = "rgba(0,0,0,0.78)";
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = reg.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
          ctx.font = "700 8px ui-monospace, monospace";
          ctx.fillStyle = reg.color;
          ctx.fillText(title, bx + 5, by + 3);
          ctx.font = "400 7px ui-monospace, monospace";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(sub, bx + 5, by + 11);
        });
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      draw(); // single static frame
    } else {
      raf = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [BRAIN]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
