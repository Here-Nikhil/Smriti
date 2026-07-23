import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Lock, User, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smriti — RAG Powered Knowledge Recall Engine" },
      { name: "description", content: "Log in to Smriti, a RAG powered knowledge recall engine." },
      { property: "og:title", content: "Smriti — RAG Powered Knowledge Recall Engine" },
      { property: "og:description", content: "Log in to Smriti, a RAG powered knowledge recall engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const BOOT_TEXT = "SMRITI CORE INITIALIZATION";

function BootScreen() {
  const [dotVisible, setDotVisible] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDotVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!dotVisible) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(BOOT_TEXT.slice(0, i));
      if (i >= BOOT_TEXT.length) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [dotVisible]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black">
      <div
        className="relative flex h-6 w-6 items-center justify-center transition-opacity duration-700"
        style={{ opacity: dotVisible ? 1 : 0 }}
      >
        <span
          className="absolute h-6 w-6 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(43,190,140,0.6) 0%, rgba(43,190,140,0) 70%)",
            animation: "smriti-ring 1.8s ease-out infinite",
          }}
        />
        <span
          className="absolute h-10 w-10 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(43,190,140,0.35) 0%, rgba(43,190,140,0) 70%)",
            animation: "smriti-ring 1.8s ease-out infinite 0.4s",
          }}
        />
        <span
          className="relative h-3 w-3 rounded-full"
          style={{
            background: "#2bbe8c",
            boxShadow: "0 0 20px 4px #2bbe8c, 0 0 40px 10px rgba(43,190,140,0.5)",
            animation: "smriti-core 1.6s ease-in-out infinite",
          }}
        />
      </div>
      <div
        className="mt-12 h-4 text-sm font-medium"
        style={{ color: "#2bbe8c", letterSpacing: "0.5em" }}
      >
        {typed}
        <span
          className="inline-block"
          style={{
            width: "0.5em",
            opacity: typed.length < BOOT_TEXT.length ? 1 : 0,
            animation: "smriti-caret 0.8s steps(1) infinite",
          }}
        >
          _
        </span>
      </div>
      <style>{`
        @keyframes smriti-core {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.25); }
        }
        @keyframes smriti-ring {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes smriti-caret {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Stylized brain outline: two hemispheres with a central fissure.
// Approximate silhouette of the Lucide Brain icon: two lobes with a dip on top.
const BRAIN_ORBIT =
  "M 26 6 C 14 6, 6 14, 6 24 C 4 27, 6 32, 10 34 C 12 42, 20 46, 26 42 C 32 46, 40 42, 42 34 C 46 32, 48 27, 46 24 C 46 14, 38 6, 26 6 Z";

function BrainLogo() {
  return (
    <div
      className="relative flex h-20 w-20 items-center justify-center rounded-full"
      style={{
        background: "rgba(43,190,140,0.08)",
        border: "1px solid rgba(43,190,140,0.4)",
        boxShadow: "0 0 30px rgba(43,190,140,0.25), inset 0 0 20px rgba(43,190,140,0.08)",
      }}
    >
      <Brain
        size={38}
        strokeWidth={1.7}
        style={{ color: "#2bbe8c", filter: "drop-shadow(0 0 6px rgba(43,190,140,0.5))" }}
      />
      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
        viewBox="0 0 52 52"
        fill="none"
      >
        <defs>
          <path id="smriti-brain-orbit" d={BRAIN_ORBIT} />
        </defs>
        <circle r="2.4" fill="#2bbe8c" style={{ filter: "drop-shadow(0 0 5px #2bbe8c)" }}>
          <animateMotion dur="3.4s" repeatCount="indefinite">
            <mpath href="#smriti-brain-orbit" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
}



function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const mouse = { x: -9999, y: -9999, active: false };

    const count = Math.min(90, Math.floor((width * height) / 18000));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onLeave);

    const INFLUENCE = 160;
    let raf = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        // Cursor repulsion for a reactive feel
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < INFLUENCE * INFLUENCE && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = (1 - d / INFLUENCE) * 0.6;
            p.vx += (dx / d) * force * 0.15;
            p.vy += (dy / d) * force * 0.15;
          }
        }
        // Damping to keep motion gentle
        p.vx *= 0.985;
        p.vy *= 0.985;
        // Maintain minimum drift so field keeps flowing
        if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.02;
        if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.02;

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      // Particle-to-particle lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.strokeStyle = `rgba(43,190,140,${0.18 * (1 - dist / 140)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Lines from cursor to nearby particles
      if (mouse.active) {
        for (const p of particles) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < INFLUENCE) {
            ctx.strokeStyle = `rgba(43,190,140,${0.5 * (1 - dist / INFLUENCE)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.fillStyle = "rgba(43,190,140,0.8)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}


function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="relative min-h-screen w-full overflow-hidden animate-fade-in" style={{ backgroundColor: "#0a1a14" }}>
      <ParticleNetwork />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-md rounded-3xl p-8 backdrop-blur-xl"
          style={{
            background: "rgba(10,26,20,0.55)",
            border: "1px solid rgba(43,190,140,0.25)",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.8), 0 0 40px rgba(43,190,140,0.08)",
          }}
        >
          <div className="flex flex-col items-center">
            <BrainLogo />
            <h1 className="mt-6 text-4xl font-bold text-white">Smriti</h1>
            <p
              className="mt-2 text-center text-[10px] font-medium"
              style={{ color: "#2bbe8c", letterSpacing: "0.35em" }}
            >
              A RAG POWERED KNOWLEDGE RECALL ENGINE
            </p>
          </div>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(43,190,140,0.15)",
              }}
            >
              <User size={18} style={{ color: "#2bbe8c" }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(43,190,140,0.15)",
              }}
            >
              <Lock size={18} style={{ color: "#2bbe8c" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl py-3 text-sm font-semibold text-black transition-all hover:brightness-110"
              style={{
                background: "#2bbe8c",
                boxShadow: "0 8px 24px -8px rgba(43,190,140,0.6)",
              }}
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 3000);
    return () => clearTimeout(t);
  }, []);
  return booted ? <LoginScreen /> : <BootScreen />;
}
