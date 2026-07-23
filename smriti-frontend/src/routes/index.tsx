import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Lock,
  User,
  Brain,
  MessageSquare,
  CheckSquare,
  Mic,
  LogOut,
  Plus,
  ArrowLeft,
  Upload,
  Trash2,
  Send,
  X,
} from "lucide-react";

const API = "https://smriti-production.up.railway.app";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("smriti_token") : null);
const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});

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


// ============ shared UI ============

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(10,26,20,0.55)",
  border: "1px solid rgba(43,190,140,0.25)",
  boxShadow: "0 20px 60px -20px rgba(0,0,0,0.8), 0 0 40px rgba(43,190,140,0.08)",
};

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(43,190,140,0.15)",
};

function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl py-3 px-4 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50 ${className}`}
      style={{
        background: "#2bbe8c",
        boxShadow: "0 8px 24px -8px rgba(43,190,140,0.6)",
      }}
    >
      {children}
    </button>
  );
}

// ============ Auth ============

type AuthMode = "login" | "signup";

function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doLogin = async (em: string, pw: string) => {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password: pw }),
    });
    if (!res.ok) throw new Error((await res.text()) || "Login failed");
    const data = await res.json();
    const token = data.access_token || data.token || data.jwt;
    if (!token) throw new Error("No token returned");
    localStorage.setItem("smriti_token", token);
    localStorage.setItem("smriti_email", em);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch(`${API}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error((await res.text()) || "Sign up failed");
      }
      await doLogin(email, password);
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl p-8 backdrop-blur-xl" style={CARD_STYLE}>
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

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={INPUT_STYLE}>
            <User size={18} style={{ color: "#2bbe8c" }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={INPUT_STYLE}>
            <Lock size={18} style={{ color: "#2bbe8c" }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </PrimaryButton>
          {error && (
            <p className="text-center text-xs" style={{ color: "#ff6b6b" }}>
              {error}
            </p>
          )}
          <p className="text-center text-xs text-white/60">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="font-semibold"
              style={{ color: "#2bbe8c" }}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// ============ App shell ============

type Workspace = { id: string; name: string; created_at?: string };

function MiniBrain() {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full"
      style={{
        background: "rgba(43,190,140,0.08)",
        border: "1px solid rgba(43,190,140,0.4)",
      }}
    >
      <Brain size={18} strokeWidth={1.8} style={{ color: "#2bbe8c" }} />
    </div>
  );
}

async function apiFetch(path: string, init: RequestInit = {}, onUnauth: () => void) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  if (res.status === 401) {
    localStorage.removeItem("smriti_token");
    localStorage.removeItem("smriti_email");
    onUnauth();
    throw new Error("Unauthorized");
  }
  return res;
}

function WorkspaceView({
  email,
  onLogout,
  onSelect,
  onUnauth,
}: {
  email: string;
  onLogout: () => void;
  onSelect: (w: Workspace) => void;
  onUnauth: () => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/workspaces", {}, onUnauth);
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(Array.isArray(data) ? data : data.workspaces || []);
      }
    } catch {
      // ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch(
        "/workspaces",
        { method: "POST", body: JSON.stringify({ name: newName.trim() }) },
        onUnauth,
      );
      if (res.ok) {
        setNewName("");
        setShowModal(false);
        await load();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen animate-fade-in">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <MiniBrain />
          <span className="text-xl font-bold text-white">Smriti</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60">{email}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(43,190,140,0.25)" }}
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Your Workspaces</h2>
          <PrimaryButton onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> New Workspace
            </span>
          </PrimaryButton>
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-white/50">Loading workspaces...</p>
        ) : workspaces.length === 0 ? (
          <p className="mt-10 text-center text-sm text-white/50">
            No workspaces yet. Create your first one.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="group rounded-2xl p-5 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5"
                style={CARD_STYLE}
              >
                <div className="flex items-center gap-3">
                  <MiniBrain />
                  <span className="truncate text-base font-semibold text-white">{w.name}</span>
                </div>
                {w.created_at && (
                  <p className="mt-3 text-xs text-white/40">
                    Created {new Date(w.created_at).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl p-6 backdrop-blur-xl" style={CARD_STYLE}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Workspace</h3>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Workspace name"
              className="mt-4 w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
              style={INPUT_STYLE}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <PrimaryButton onClick={create} disabled={creating} className="mt-4 w-full">
              {creating ? "Creating..." : "Create"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Main App (per workspace) ============

type NavKey = "chat" | "prep" | "mock";
type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  citations?: { filename: string; page: number }[];
};

function MainApp({
  workspace,
  onBack,
  onLogout,
  onUnauth,
}: {
  workspace: Workspace;
  onBack: () => void;
  onLogout: () => void;
  onUnauth: () => void;
}) {
  const [nav, setNav] = useState<NavKey>("chat");
  const [docs, setDocs] = useState<Array<{ id: string; filename: string }>>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API}/documents?workspace_id=${workspace.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("smriti_token");
        onUnauth();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.documents ?? []);
      setDocs(
        list.map((d: Record<string, unknown>) => ({
          id: String(d.id ?? d.document_id ?? ""),
          filename: String(d.filename ?? d.name ?? d.file_name ?? "Untitled"),
        })),
      );
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const names = Array.from(files).map((f) => f.name);
    setUploading(names.join(", "));
    setUploadError(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch(`${API}/documents/upload?workspace_id=${workspace.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (res.status === 401) {
        localStorage.removeItem("smriti_token");
        onUnauth();
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      await fetchDocs();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setTimeout(() => setUploadError(null), 4000);
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("smriti_token");
        onUnauth();
        return;
      }
      await fetchDocs();
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null);
    }
  };

  const NavBtn = ({ k, icon, label }: { k: NavKey; icon: ReactNode; label: string }) => (
    <button
      onClick={() => setNav(k)}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        background: nav === k ? "rgba(43,190,140,0.15)" : "transparent",
        color: nav === k ? "#2bbe8c" : "rgba(255,255,255,0.75)",
        border: nav === k ? "1px solid rgba(43,190,140,0.35)" : "1px solid transparent",
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative z-10 flex h-screen animate-fade-in text-white">
      {/* Sidebar */}
      <aside
        className="flex w-60 flex-shrink-0 flex-col p-4 backdrop-blur-xl"
        style={{
          background: "rgba(10,26,20,0.65)",
          borderRight: "1px solid rgba(43,190,140,0.2)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <MiniBrain />
          <span className="text-lg font-bold">Smriti</span>
        </div>
        <p className="mt-3 truncate text-xs font-semibold" style={{ color: "#2bbe8c" }}>
          {workspace.name}
        </p>
        <button
          onClick={onBack}
          className="mt-1 flex items-center gap-1 text-xs text-white/50 hover:text-white/80"
        >
          <ArrowLeft size={12} /> Back to workspaces
        </button>

        <nav className="mt-6 space-y-1.5">
          <NavBtn k="chat" icon={<MessageSquare size={16} />} label="Chat with PDF" />
          <NavBtn k="prep" icon={<CheckSquare size={16} />} label="Preparation Mode" />
          <NavBtn k="mock" icon={<Mic size={16} />} label="Mock Interview" />
        </nav>

        <div className="mt-6 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Documents
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium"
            style={{
              background: "rgba(43,190,140,0.12)",
              border: "1px solid rgba(43,190,140,0.3)",
              color: "#2bbe8c",
            }}
          >
            <Upload size={13} /> Upload PDF(s)
          </button>
          {docs.length > 0 && (
            <>
              <ul className="mt-3 space-y-1">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/80"
                    style={{
                      background: "rgba(10,26,20,0.55)",
                      border: "1px solid rgba(43,190,140,0.18)",
                    }}
                  >
                    <span className="flex-1 truncate" title={d.filename}>
                      {d.filename}
                    </span>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      aria-label={`Delete ${d.filename}`}
                      className="flex-shrink-0 rounded p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-[#2bbe8c] disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <button
          onClick={onLogout}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-white/80 hover:bg-white/5"
          style={{ border: "1px solid rgba(43,190,140,0.25)" }}
        >
          <LogOut size={13} /> Log out
        </button>
      </aside>

      {/* Main */}
      <section className="flex flex-1 flex-col overflow-hidden">
        {nav === "chat" && <ChatPanel workspaceId={workspace.id} onUnauth={onUnauth} />}
        {nav === "prep" && <PrepPanel workspaceId={workspace.id} onUnauth={onUnauth} />}
        {nav === "mock" && <MockPanel />}
      </section>

      {uploading && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl p-4 backdrop-blur-xl"
          style={CARD_STYLE}
        >
          <p className="text-sm font-semibold text-white">Uploading...</p>
          <p className="mt-1 truncate text-xs text-white/60">{uploading}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full w-1/3 rounded-full"
              style={{
                background: "#2bbe8c",
                animation: "smriti-progress 1.2s ease-in-out infinite",
              }}
            />
          </div>
          <style>{`@keyframes smriti-progress {0%{transform:translateX(-100%);}100%{transform:translateX(300%);}}`}</style>
        </div>
      )}
      {uploadError && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(80,20,20,0.9)", color: "#ff9b9b", border: "1px solid #ff6b6b" }}
        >
          {uploadError}
        </div>
      )}
    </div>
  );
}

function ChatPanel({ workspaceId, onUnauth }: { workspaceId: string; onUnauth: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setSending(true);
    try {
      const res = await apiFetch(
        "/chat",
        { method: "POST", body: JSON.stringify({ question: q, workspace_id: workspaceId }) },
        onUnauth,
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.answer || data.response || "(no answer)",
            citations: data.citations || [],
          },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "Error getting response." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Error getting response." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-white/50">
              Ask a question about your documents.
            </p>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm text-black"
                  style={{ background: "#2bbe8c" }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-sm text-white backdrop-blur-xl"
                  style={CARD_STYLE}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.citations.map((c, j) => (
                        <span
                          key={j}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: "rgba(43,190,140,0.15)",
                            color: "#2bbe8c",
                            border: "1px solid rgba(43,190,140,0.35)",
                          }}
                        >
                          {c.filename} p.{c.page}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
      <div className="border-t px-6 py-4" style={{ borderColor: "rgba(43,190,140,0.15)" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mx-auto flex max-w-3xl items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
            style={INPUT_STYLE}
          />
          <PrimaryButton type="submit" disabled={sending}>
            <span className="flex items-center gap-1.5">
              <Send size={14} /> Send
            </span>
          </PrimaryButton>
        </form>
      </div>
    </>
  );
}

// ============ Preparation Mode ============

type QuizMode = "mcq" | "interactive";
type QuizQuestion = {
  question: string;
  options?: string[];
  correct_index?: number;
};
type QuizState = {
  session_id: string;
  questions: QuizQuestion[];
  mode: QuizMode;
};
type QuizFeedback = { correct?: boolean; score?: number; feedback?: string; correct_index?: number };

function PrepPanel({ workspaceId, onUnauth }: { workspaceId: string; onUnauth: () => void }) {
  const [num, setNum] = useState(5);
  const [mode, setMode] = useState<QuizMode>("mcq");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [done, setDone] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        "/quiz/generate",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, num_questions: num, mode }),
        },
        onUnauth,
      );
      if (res.ok) {
        const data = await res.json();
        setQuiz({
          session_id: data.session_id,
          questions: data.questions || [],
          mode,
        });
        setIdx(0);
        setSelected(null);
        setAnswer("");
        setFeedback(null);
        setTotalScore(0);
        setDone(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const grade = async (body: Record<string, unknown>) => {
    const res = await apiFetch(
      "/quiz/grade",
      { method: "POST", body: JSON.stringify(body) },
      onUnauth,
    );
    if (res.ok) {
      const data: QuizFeedback = await res.json();
      setFeedback(data);
      if (data.correct) setTotalScore((s) => s + 1);
      else if (typeof data.score === "number") setTotalScore((s) => s + data.score!);
    }
  };

  const next = () => {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) {
      setDone(true);
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setAnswer("");
      setFeedback(null);
    }
  };

  const reset = () => {
    setQuiz(null);
    setDone(false);
    setFeedback(null);
    setSelected(null);
    setAnswer("");
    setTotalScore(0);
    setIdx(0);
  };

  if (!quiz) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl p-8 backdrop-blur-xl" style={CARD_STYLE}>
          <h2 className="text-2xl font-bold text-white">Preparation Mode</h2>
          <p className="mt-2 text-sm text-white/60">
            Generate a quiz from your workspace documents.
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-xs uppercase tracking-wider text-white/60">
              Number of questions
              <input
                type="number"
                min={1}
                max={20}
                value={num}
                onChange={(e) => setNum(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                style={INPUT_STYLE}
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-white/60">
              Mode
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as QuizMode)}
                className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                style={INPUT_STYLE}
              >
                <option value="mcq">Multiple choice</option>
                <option value="interactive">Open-ended</option>
              </select>
            </label>
            <PrimaryButton onClick={generate} disabled={loading} className="w-full">
              {loading ? "Generating..." : "Generate Quiz"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl p-8 text-center backdrop-blur-xl" style={CARD_STYLE}>
          <h2 className="text-2xl font-bold text-white">Quiz complete</h2>
          <p className="mt-4 text-5xl font-bold" style={{ color: "#2bbe8c" }}>
            {Math.round(totalScore * 100) / 100} / {quiz.questions.length}
          </p>
          <PrimaryButton onClick={reset} className="mt-6 w-full">
            Try Again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const q = quiz.questions[idx];
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6">
      <div className="w-full max-w-2xl rounded-2xl p-8 backdrop-blur-xl" style={CARD_STYLE}>
        <p className="text-xs uppercase tracking-wider text-white/50">
          Question {idx + 1} / {quiz.questions.length}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">{q.question}</h3>

        {quiz.mode === "mcq" ? (
          <div className="mt-6 space-y-2">
            {(q.options || []).map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = feedback && feedback.correct_index === i;
              const isWrong = feedback && isSelected && feedback.correct === false;
              return (
                <button
                  key={i}
                  disabled={selected !== null}
                  onClick={async () => {
                    setSelected(i);
                    await grade({
                      workspace_id: workspaceId,
                      session_id: quiz.session_id,
                      question_index: idx,
                      selected_index: i,
                    });
                  }}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm transition-all"
                  style={{
                    background: isCorrect
                      ? "rgba(43,190,140,0.2)"
                      : isWrong
                        ? "rgba(200,60,60,0.15)"
                        : "rgba(0,0,0,0.4)",
                    border: `1px solid ${
                      isCorrect
                        ? "#2bbe8c"
                        : isWrong
                          ? "#ff6b6b"
                          : isSelected
                            ? "rgba(43,190,140,0.5)"
                            : "rgba(43,190,140,0.15)"
                    }`,
                    color: "white",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-6">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
              rows={5}
              disabled={feedback !== null}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
              style={INPUT_STYLE}
            />
            {!feedback && (
              <PrimaryButton
                onClick={() =>
                  grade({
                    workspace_id: workspaceId,
                    session_id: quiz.session_id,
                    question_index: idx,
                    answer,
                  })
                }
                className="mt-3"
              >
                Submit Answer
              </PrimaryButton>
            )}
          </div>
        )}

        {feedback && (
          <div className="mt-6 rounded-xl p-4" style={INPUT_STYLE}>
            {typeof feedback.score === "number" && (
              <p className="text-sm text-white">
                Score:{" "}
                <span style={{ color: "#2bbe8c" }} className="font-semibold">
                  {feedback.score}
                </span>
              </p>
            )}
            {feedback.feedback && (
              <p className="mt-1 text-sm text-white/80">{feedback.feedback}</p>
            )}
            <PrimaryButton onClick={next} className="mt-3">
              {idx + 1 >= quiz.questions.length ? "Finish" : "Next question"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

function MockPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: "rgba(43,190,140,0.1)",
          border: "1px solid rgba(43,190,140,0.35)",
        }}
      >
        <Mic size={32} style={{ color: "#2bbe8c" }} />
      </div>
      <h2 className="mt-6 text-3xl font-bold text-white">Mock Interview</h2>
      <p className="mt-2 text-sm text-white/60">This feature is coming soon.</p>
    </div>
  );
}

// ============ Persistent shell ============

type AuthedView =
  | { kind: "workspaces" }
  | { kind: "app"; workspace: Workspace };

function AuthedFlow({ onLogout, onUnauth }: { onLogout: () => void; onUnauth: () => void }) {
  const [view, setView] = useState<AuthedView>({ kind: "workspaces" });
  const email = typeof window !== "undefined" ? localStorage.getItem("smriti_email") || "" : "";

  if (view.kind === "workspaces") {
    return (
      <WorkspaceView
        email={email}
        onLogout={onLogout}
        onSelect={(w) => setView({ kind: "app", workspace: w })}
        onUnauth={onUnauth}
      />
    );
  }
  return (
    <MainApp
      workspace={view.workspace}
      onBack={() => setView({ kind: "workspaces" })}
      onLogout={onLogout}
      onUnauth={onUnauth}
    />
  );
}

function Index() {
  const [booted, setBooted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const has = typeof window !== "undefined" && !!localStorage.getItem("smriti_token");
    setAuthed(has);
    setChecked(true);
    if (has) {
      setBooted(true);
      return;
    }
    const t = setTimeout(() => setBooted(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!checked || !booted) return <BootScreen />;

  const logout = () => {
    localStorage.removeItem("smriti_token");
    localStorage.removeItem("smriti_email");
    setAuthed(false);
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ backgroundColor: "#0a1a14" }}
    >
      <ParticleNetwork />
      {authed ? (
        <AuthedFlow onLogout={logout} onUnauth={logout} />
      ) : (
        <AuthScreen onAuthed={() => setAuthed(true)} />
      )}
    </div>
  );
}

