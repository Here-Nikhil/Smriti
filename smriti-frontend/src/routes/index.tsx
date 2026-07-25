import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  BookOpen,
  FileText,
  History,
  MicOff,
  RotateCcw,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Toaster, toast } from "sonner";

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

// ============ API helpers ============

let _unauthCb: (() => void) | null = null;
function setUnauthCallback(cb: () => void) { _unauthCb = cb; }

async function apiFetch(path: string, init: RequestInit = {}) {
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (!isFormData) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (res.status === 401) {
    localStorage.removeItem("smriti_token");
    localStorage.removeItem("smriti_email");
    _unauthCb?.();
    throw new Error("Session expired. Please log in again.");
  }
  return res;
}

async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

function showError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  toast.error(msg, {
    style: { background: "#0a1a14", border: "1px solid #2bbe8c", color: "#fff" },
    duration: 4000,
  });
}

// ============ Boot screen ============

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
      <div className="relative flex h-6 w-6 items-center justify-center transition-opacity duration-700" style={{ opacity: dotVisible ? 1 : 0 }}>
        <span className="absolute h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle, rgba(43,190,140,0.6) 0%, rgba(43,190,140,0) 70%)", animation: "smriti-ring 1.8s ease-out infinite" }} />
        <span className="absolute h-10 w-10 rounded-full" style={{ background: "radial-gradient(circle, rgba(43,190,140,0.35) 0%, rgba(43,190,140,0) 70%)", animation: "smriti-ring 1.8s ease-out infinite 0.4s" }} />
        <span className="relative h-3 w-3 rounded-full" style={{ background: "#2bbe8c", boxShadow: "0 0 20px 4px #2bbe8c, 0 0 40px 10px rgba(43,190,140,0.5)", animation: "smriti-core 1.6s ease-in-out infinite" }} />
      </div>
      <div className="mt-12 h-4 text-sm font-medium" style={{ color: "#2bbe8c", letterSpacing: "0.5em" }}>
        {typed}
        <span className="inline-block" style={{ width: "0.5em", opacity: typed.length < BOOT_TEXT.length ? 1 : 0, animation: "smriti-caret 0.8s steps(1) infinite" }}>_</span>
      </div>
      <style>{`
        @keyframes smriti-core { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.25); } }
        @keyframes smriti-ring { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes smriti-caret { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ============ Particle network ============

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
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    }));

    const onResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; };
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; };
    const onTouch = (e: TouchEvent) => { if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; } };

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
        if (mouse.active) {
          const dx = p.x - mouse.x; const dy = p.y - mouse.y; const d2 = dx * dx + dy * dy;
          if (d2 < INFLUENCE * INFLUENCE && d2 > 0.01) {
            const d = Math.sqrt(d2); const force = (1 - d / INFLUENCE) * 0.6;
            p.vx += (dx / d) * force * 0.15; p.vy += (dy / d) * force * 0.15;
          }
        }
        p.vx *= 0.985; p.vy *= 0.985;
        if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.02;
        if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.02;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]; const b = particles[j];
          const dx = a.x - b.x; const dy = a.y - b.y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.strokeStyle = `rgba(43,190,140,${0.18 * (1 - dist / 140)})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (mouse.active) {
        for (const p of particles) {
          const dx = p.x - mouse.x; const dy = p.y - mouse.y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < INFLUENCE) {
            ctx.strokeStyle = `rgba(43,190,140,${0.5 * (1 - dist / INFLUENCE)})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.fillStyle = "rgba(43,190,140,0.8)"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
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

// ============ Shared UI ============

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(10,26,20,0.55)",
  border: "1px solid rgba(43,190,140,0.25)",
  boxShadow: "0 20px 60px -20px rgba(0,0,0,0.8), 0 0 40px rgba(43,190,140,0.08)",
};

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(43,190,140,0.15)",
};

function PrimaryButton({ children, onClick, type = "button", disabled, className = "" }: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-xl py-3 px-4 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50 ${className}`}
      style={{ background: "#2bbe8c", boxShadow: "0 8px 24px -8px rgba(43,190,140,0.6)" }}>
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30" style={{ borderTopColor: "#2bbe8c" }} />
  );
}

function EmptyState({ message = "Upload a document to get started." }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(43,190,140,0.08)", border: "1px solid rgba(43,190,140,0.25)" }}>
        <FileText size={28} style={{ color: "rgba(43,190,140,0.5)" }} />
      </div>
      <p className="text-sm text-white/50">{message}</p>
    </div>
  );
}

// ============ Auth ============

const BRAIN_ORBIT = "M 26 6 C 14 6, 6 14, 6 24 C 4 27, 6 32, 10 34 C 12 42, 20 46, 26 42 C 32 46, 40 42, 42 34 C 46 32, 48 27, 46 24 C 46 14, 38 6, 26 6 Z";

function BrainLogo() {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center rounded-full"
      style={{ background: "rgba(43,190,140,0.08)", border: "1px solid rgba(43,190,140,0.4)", boxShadow: "0 0 30px rgba(43,190,140,0.25), inset 0 0 20px rgba(43,190,140,0.08)" }}>
      <Brain size={38} strokeWidth={1.7} style={{ color: "#2bbe8c", filter: "drop-shadow(0 0 6px rgba(43,190,140,0.5))" }} />
      <svg className="pointer-events-none absolute inset-0" width="100%" height="100%" viewBox="0 0 52 52" fill="none">
        <defs><path id="smriti-brain-orbit" d={BRAIN_ORBIT} /></defs>
        <circle r="2.4" fill="#2bbe8c" style={{ filter: "drop-shadow(0 0 5px #2bbe8c)" }}>
          <animateMotion dur="3.4s" repeatCount="indefinite"><mpath href="#smriti-brain-orbit" /></animateMotion>
        </circle>
      </svg>
    </div>
  );
}

function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch(`${API}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        if (!res.ok) throw new Error((await res.text()) || "Sign up failed");
      }
      const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!res.ok) throw new Error((await res.text()) || "Login failed");
      const data = await res.json();
      const token = data.access_token || data.token || data.jwt;
      if (!token) throw new Error("No token returned");
      localStorage.setItem("smriti_token", token);
      localStorage.setItem("smriti_email", email);
      onAuthed();
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4" style={{ animation: "fadeIn 0.4s ease" }}>
      <div className="w-full max-w-md rounded-3xl p-8 backdrop-blur-xl" style={CARD_STYLE}>
        <div className="flex flex-col items-center">
          <BrainLogo />
          <h1 className="mt-6 text-4xl font-bold text-white">Smriti</h1>
          <p className="mt-2 text-center text-[10px] font-medium" style={{ color: "#2bbe8c", letterSpacing: "0.35em" }}>A RAG POWERED KNOWLEDGE RECALL ENGINE</p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={INPUT_STYLE}>
            <User size={18} style={{ color: "#2bbe8c" }} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none" />
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={INPUT_STYLE}>
            <Lock size={18} style={{ color: "#2bbe8c" }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none" />
          </div>
          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Please wait...</span> : mode === "login" ? "Log in" : "Sign up"}
          </PrimaryButton>
          <p className="text-center text-xs text-white/60">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-semibold" style={{ color: "#2bbe8c" }}>
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// ============ App shell ============

type Workspace = { id: number; name: string; created_at?: string };

function MiniBrain() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(43,190,140,0.08)", border: "1px solid rgba(43,190,140,0.4)" }}>
      <Brain size={18} strokeWidth={1.8} style={{ color: "#2bbe8c" }} />
    </div>
  );
}

function WorkspaceView({ email, onLogout, onSelect }: { email: string; onLogout: () => void; onSelect: (w: Workspace) => void; }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ workspaces?: Workspace[] } | Workspace[]>("/workspaces");
      setWorkspaces(Array.isArray(data) ? data : (data as { workspaces?: Workspace[] }).workspaces || []);
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await apiJson("/workspaces", { method: "POST", body: JSON.stringify({ name: newName.trim() }) });
      setNewName(""); setShowModal(false); await load();
    } catch (err) { showError(err); }
    finally { setCreating(false); }
  };

  return (
    <div className="relative z-10 min-h-screen" style={{ animation: "fadeIn 0.4s ease" }}>
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3"><MiniBrain /><span className="text-xl font-bold text-white">Smriti</span></div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60">{email}</span>
          <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/5" style={{ border: "1px solid rgba(43,190,140,0.25)" }}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Your Workspaces</h2>
          <PrimaryButton onClick={() => setShowModal(true)}><span className="flex items-center gap-1.5"><Plus size={16} /> New Workspace</span></PrimaryButton>
        </div>
        {loading ? (
          <div className="mt-10 flex justify-center"><Spinner /></div>
        ) : workspaces.length === 0 ? (
          <p className="mt-10 text-center text-sm text-white/50">No workspaces yet. Create your first one.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((w) => (
              <button key={w.id} onClick={() => onSelect(w)} className="group rounded-2xl p-5 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg" style={CARD_STYLE}>
                <div className="flex items-center gap-3"><MiniBrain /><span className="truncate text-base font-semibold text-white">{w.name}</span></div>
                {w.created_at && <p className="mt-3 text-xs text-white/40">Created {new Date(w.created_at).toLocaleDateString()}</p>}
              </button>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ animation: "fadeIn 0.2s ease" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 backdrop-blur-xl" style={CARD_STYLE}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Workspace</h3>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Workspace name"
              className="mt-4 w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none" style={INPUT_STYLE}
              onKeyDown={(e) => e.key === "Enter" && create()} />
            <PrimaryButton onClick={create} disabled={creating} className="mt-4 w-full">{creating ? "Creating..." : "Create"}</PrimaryButton>
          </div>
        </div>
      )}

      {showLogoutConfirm && <LogoutConfirmModal onConfirm={onLogout} onCancel={() => setShowLogoutConfirm(false)} />}
    </div>
  );
}

function LogoutConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ animation: "fadeIn 0.2s ease" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 backdrop-blur-xl" style={CARD_STYLE}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(43,190,140,0.1)", border: "1px solid rgba(43,190,140,0.3)" }}>
            <LogOut size={18} style={{ color: "#2bbe8c" }} />
          </div>
          <h3 className="text-lg font-semibold text-white">Log out?</h3>
        </div>
        <p className="text-sm text-white/60 mb-6">You'll need to log back in to access your workspaces.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5" style={{ border: "1px solid rgba(43,190,140,0.25)" }}>Cancel</button>
          <PrimaryButton onClick={onConfirm} className="flex-1">Log out</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ============ Main App ============

type NavKey = "chat" | "flashcards" | "summary" | "prep" | "mock";
type ChatMsg = { role: "user" | "assistant"; content: string; citations?: { filename: string; page: number }[] };
type Doc = { id: string; filename: string };

function MainApp({ workspace, onBack, onLogout }: { workspace: Workspace; onBack: () => void; onLogout: () => void; }) {
  const [nav, setNav] = useState<NavKey>("chat");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingDocs, setClearingDocs] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [docPreview, setDocPreview] = useState<Doc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await apiJson<{ documents?: Doc[] } | Doc[]>(`/documents?workspace_id=${workspace.id}`);
      const list = Array.isArray(data) ? data : (data as { documents?: Doc[] }).documents ?? [];
      setDocs(list.map((d: Record<string, unknown>) => ({
        id: String(d.id ?? d.document_id ?? ""),
        filename: String(d.filename ?? d.name ?? d.file_name ?? "Untitled"),
      })));
    } catch (err) { showError(err); }
  }, [workspace.id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(Array.from(files).map((f) => f.name).join(", "));
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await apiFetch(`/documents/upload?workspace_id=${workspace.id}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Documents uploaded successfully", { style: { background: "#0a1a14", border: "1px solid #2bbe8c", color: "#fff" } });
      await fetchDocs();
    } catch (err) { showError(err); }
    finally { setUploading(null); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleDelete = async (id: string) => {
    const doc = docs.find((d) => d.id === id);
    setDeletingId(id);
    try {
      await apiFetch(`/documents/${id}`, { method: "DELETE" });
      await fetchDocs();
      if (doc) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `📄 "${doc.filename}" has been removed from this workspace. I will no longer answer from it.`,
            citations: [],
          },
        ]);
      }
    } catch (err) { showError(err); }
    finally { setDeletingId(null); }
  };

  const handleClearDocs = async () => {
    if (!confirm("Clear all documents? This cannot be undone.")) return;
    setClearingDocs(true);
    try {
      await apiFetch(`/documents/clear?workspace_id=${workspace.id}`, { method: "DELETE" });
      await fetchDocs();
      toast.success("All documents cleared", { style: { background: "#0a1a14", border: "1px solid #2bbe8c", color: "#fff" } });
    } catch (err) { showError(err); }
    finally { setClearingDocs(false); }
  };

  const NavBtn = ({ k, icon, label }: { k: NavKey; icon: ReactNode; label: string }) => (
    <button onClick={() => setNav(k)}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all hover:bg-white/5"
      style={{ background: nav === k ? "rgba(43,190,140,0.15)" : "transparent", color: nav === k ? "#2bbe8c" : "rgba(255,255,255,0.75)", border: nav === k ? "1px solid rgba(43,190,140,0.35)" : "1px solid transparent" }}>
      {icon}{label}
    </button>
  );

  return (
    <div className="relative z-10 flex h-screen text-white" style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col p-4 backdrop-blur-xl" style={{ background: "rgba(10,26,20,0.65)", borderRight: "1px solid rgba(43,190,140,0.2)" }}>
        <div className="flex items-center gap-2.5"><MiniBrain /><span className="text-lg font-bold">Smriti</span></div>
        <p className="mt-3 truncate text-xs font-semibold" style={{ color: "#2bbe8c" }}>{workspace.name}</p>
        <button onClick={onBack} className="mt-1 flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft size={12} /> Back to workspaces
        </button>

        <nav className="mt-6 space-y-1.5">
          <NavBtn k="chat" icon={<MessageSquare size={16} />} label="Chat with PDF" />
          <NavBtn k="flashcards" icon={<BookOpen size={16} />} label="Flashcards" />
          <NavBtn k="summary" icon={<FileText size={16} />} label="Summary" />
          <NavBtn k="prep" icon={<CheckSquare size={16} />} label="Preparation Mode" />
          <NavBtn k="mock" icon={<Mic size={16} />} label="Mock Interview" />
        </nav>

        <div className="mt-6 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Documents</p>
          <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <div className="mt-2 flex gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all hover:brightness-110"
              style={{ background: "rgba(43,190,140,0.12)", border: "1px solid rgba(43,190,140,0.3)", color: "#2bbe8c" }}>
              <Upload size={13} /> Upload PDF(s)
            </button>
            {docs.length > 0 && (
              <button onClick={handleClearDocs} disabled={clearingDocs} title="Clear all documents"
                className="flex items-center justify-center rounded-lg px-2 py-2 text-xs transition-all hover:bg-red-900/20 disabled:opacity-40"
                style={{ border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,100,100,0.7)" }}>
                {clearingDocs ? <Spinner /> : <Trash2 size={13} />}
              </button>
            )}
          </div>

          {docs.length === 0 ? (
            <p className="mt-4 text-xs text-white/40 text-center">No documents yet</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {docs.map((d) => (
                <li key={d.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/80 transition-all hover:bg-white/5"
                  style={{ background: "rgba(10,26,20,0.55)", border: "1px solid rgba(43,190,140,0.18)" }}>
                  <button className="flex-1 truncate text-left hover:text-white transition-colors" title={d.filename} onClick={() => setDocPreview(d)}>
                    {d.filename}
                  </button>
                  <button onClick={() => handleDelete(d.id)} disabled={deletingId === d.id} aria-label={`Delete ${d.filename}`}
                    className="flex-shrink-0 rounded p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-red-400 disabled:opacity-40">
                    {deletingId === d.id ? <Spinner /> : <Trash2 size={12} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={() => setShowLogoutConfirm(true)} className="mt-4 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-white/80 hover:bg-white/5 transition-colors" style={{ border: "1px solid rgba(43,190,140,0.25)" }}>
          <LogOut size={13} /> Log out
        </button>
      </aside>

      {/* Main panel */}
      <section className="flex flex-1 flex-col overflow-hidden">
        {nav === "chat" && <ChatPanel workspaceId={workspace.id} hasDocuments={docs.length > 0} messages={messages} setMessages={setMessages} />}
        {nav === "flashcards" && <FlashcardsPanel workspaceId={workspace.id} hasDocuments={docs.length > 0} />}
        {nav === "summary" && <SummaryPanel workspaceId={workspace.id} hasDocuments={docs.length > 0} />}
        {nav === "prep" && <PrepPanel workspaceId={workspace.id} hasDocuments={docs.length > 0} />}
        {nav === "mock" && <MockPanel />}
      </section>

      {/* Upload indicator */}
      {uploading && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl p-4 backdrop-blur-xl" style={CARD_STYLE}>
          <p className="text-sm font-semibold text-white">Uploading...</p>
          <p className="mt-1 truncate text-xs text-white/60">{uploading}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 rounded-full" style={{ background: "#2bbe8c", animation: "smriti-progress 1.2s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {showLogoutConfirm && <LogoutConfirmModal onConfirm={onLogout} onCancel={() => setShowLogoutConfirm(false)} />}
      {docPreview && <DocPreviewModal doc={docPreview} onClose={() => setDocPreview(null)} />}

      <style>{`
        @keyframes smriti-progress { 0%{transform:translateX(-100%);} 100%{transform:translateX(300%);} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes flipIn { from{transform:rotateY(90deg);opacity:0;} to{transform:rotateY(0deg);opacity:1;} }
      `}</style>
    </div>
  );
}

// ============ Document preview modal ============

function DocPreviewModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const ext = doc.filename.split(".").pop()?.toUpperCase() || "FILE";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ animation: "fadeIn 0.2s ease" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 backdrop-blur-xl" style={CARD_STYLE}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Document Info</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(43,190,140,0.1)", border: "1px solid rgba(43,190,140,0.3)" }}>
            <FileText size={22} style={{ color: "#2bbe8c" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" title={doc.filename}>{doc.filename}</p>
            <p className="mt-1 text-xs text-white/50">{ext} file</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Chat panel ============

function ChatPanel({ workspaceId, hasDocuments, messages, setMessages }: { workspaceId: number; hasDocuments: boolean; messages: ChatMsg[]; setMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>> }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load chat history on mount
  useEffect(() => {
    const load = async () => {
      setLoadingHistory(true);
      try {
        const data = await apiJson<{ messages?: Array<{ role: string; content: string; citations?: { filename: string; page: number }[] }> }>(`/chat/history?workspace_id=${workspaceId}`);
        const msgs = (data.messages || []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          citations: m.citations || [],
        }));
        setMessages(msgs);
      } catch {
        // History load failure is silent
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, [workspaceId]);

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
      const data = await apiJson<{ answer?: string; response?: string; citations?: { filename: string; page: number }[] }>("/chat", {
        method: "POST", body: JSON.stringify({ question: q, workspace_id: workspaceId }),
      });
      setMessages((m) => [...m, { role: "assistant", content: data.answer || data.response || "(no answer)", citations: data.citations || [] }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "Error getting response." }]);
      showError(err);
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear chat history?")) return;
    setClearingHistory(true);
    try {
      await apiFetch(`/chat/history?workspace_id=${workspaceId}`, { method: "DELETE" });
      setMessages([]);
      toast.success("Chat history cleared", { style: { background: "#0a1a14", border: "1px solid #2bbe8c", color: "#fff" } });
    } catch (err) { showError(err); }
    finally { setClearingHistory(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("file", blob, "voice.webm");
        try {
          const data = await apiJson<{ text: string }>("/transcribe", { method: "POST", body: fd });
          if (data.text) setInput((prev) => prev + (prev ? " " : "") + data.text);
        } catch (err) { showError(err); }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      showError(new Error("Microphone access denied"));
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  };

  if (!hasDocuments) return <EmptyState />;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: "1px solid rgba(43,190,140,0.12)" }}>
        <span className="text-xs text-white/40">Chat with your documents</span>
        <button onClick={clearHistory} disabled={clearingHistory || messages.length === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/60 transition-all hover:bg-white/5 disabled:opacity-30"
          style={{ border: "1px solid rgba(43,190,140,0.2)" }}>
          {clearingHistory ? <Spinner /> : <Trash2 size={12} />} Clear Chat
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {loadingHistory && (
            <div className="flex justify-center mt-8"><Spinner /></div>
          )}
          {!loadingHistory && messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-white/50">Ask a question about your documents.</p>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end" style={{ animation: "fadeIn 0.25s ease" }}>
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm text-black" style={{ background: "#2bbe8c" }}>{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex justify-start" style={{ animation: "fadeIn 0.25s ease" }}>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm text-white backdrop-blur-xl" style={CARD_STYLE}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.citations.map((c, j) => (
                        <span key={j} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(43,190,140,0.15)", color: "#2bbe8c", border: "1px solid rgba(43,190,140,0.35)" }}>
                          {c.filename} p.{c.page}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {sending && (
            <div className="flex justify-start" style={{ animation: "fadeIn 0.25s ease" }}>
              <div className="rounded-2xl px-4 py-3 text-sm text-white/50 backdrop-blur-xl" style={CARD_STYLE}>
                <span className="flex items-center gap-2"><Spinner /> Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t px-6 py-4" style={{ borderColor: "rgba(43,190,140,0.15)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask something..."
            className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none" style={INPUT_STYLE}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} />
          <button onClick={recording ? stopRecording : startRecording} title={recording ? "Stop recording" : "Voice input"}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all hover:brightness-110"
            style={{ background: recording ? "rgba(200,60,60,0.3)" : "rgba(43,190,140,0.12)", border: `1px solid ${recording ? "#ff6b6b" : "rgba(43,190,140,0.3)"}`, color: recording ? "#ff6b6b" : "#2bbe8c" }}>
            {recording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button onClick={send} disabled={sending || !input.trim()}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-black transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "#2bbe8c", boxShadow: sending ? "0 0 20px rgba(43,190,140,0.4)" : "none", animation: sending ? "smriti-core 1.6s ease-in-out infinite" : "none" }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Flashcards panel ============

type Flashcard = { id: string; front: string; back: string };

function FlashcardsPanel({ workspaceId, hasDocuments }: { workspaceId: number; hasDocuments: boolean }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ flashcards?: Flashcard[] } | Flashcard[]>(`/flashcards?workspace_id=${workspaceId}`);
      setCards(Array.isArray(data) ? data : (data as { flashcards?: Flashcard[] }).flashcards || []);
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const generate = async () => {
    setGenerating(true);
    try {
      await apiJson("/flashcards/generate", { method: "POST", body: JSON.stringify({ workspace_id: workspaceId }) });
      await fetchCards();
      setFlipped(new Set());
      toast.success("Flashcards generated!", { style: { background: "#0a1a14", border: "1px solid #2bbe8c", color: "#fff" } });
    } catch (err) { showError(err); }
    finally { setGenerating(false); }
  };

  const deleteCard = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/flashcards/${id}`, { method: "DELETE" });
      setCards((c) => c.filter((x) => x.id !== id));
    } catch (err) { showError(err); }
    finally { setDeletingId(null); }
  };

  const toggleFlip = (id: string) => {
    setFlipped((f) => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (!hasDocuments) return <EmptyState />;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(43,190,140,0.12)" }}>
        <h2 className="text-lg font-bold text-white">Flashcards</h2>
        <div className="flex gap-2">
          {cards.length > 0 && (
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/70 transition-all hover:bg-white/5 disabled:opacity-40"
              style={{ border: "1px solid rgba(43,190,140,0.3)" }}>
              {generating ? <Spinner /> : <RotateCcw size={12} />} Regenerate
            </button>
          )}
          <PrimaryButton onClick={generate} disabled={generating} className="py-1.5 px-3 text-xs">
            {generating ? <span className="flex items-center gap-1.5"><Spinner /> Generating...</span> : "Generate Flashcards"}
          </PrimaryButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex justify-center mt-12"><Spinner /></div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(43,190,140,0.08)", border: "1px solid rgba(43,190,140,0.25)" }}>
              <BookOpen size={28} style={{ color: "rgba(43,190,140,0.5)" }} />
            </div>
            <p className="text-sm text-white/50">No flashcards yet. Generate some from your documents.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {cards.map((card) => {
              const isFlipped = flipped.has(card.id);
              return (
                <div key={card.id} className="relative group" style={{ perspective: "1000px", minHeight: "180px" }}>
                  <div onClick={() => toggleFlip(card.id)} className="relative w-full h-full cursor-pointer"
                    style={{ minHeight: "180px", transformStyle: "preserve-3d", transition: "transform 0.5s ease", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                    {/* Front */}
                    <div className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl" style={{ ...CARD_STYLE, backfaceVisibility: "hidden" }}>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#2bbe8c" }}>Question</p>
                        <p className="text-sm text-white leading-relaxed">{card.front}</p>
                      </div>
                      <p className="text-[10px] text-white/30 mt-3">Click to reveal answer</p>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl"
                      style={{ ...CARD_STYLE, background: "rgba(43,190,140,0.08)", border: "1px solid rgba(43,190,140,0.4)", backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#2bbe8c" }}>Answer</p>
                        <p className="text-sm text-white leading-relaxed">{card.back}</p>
                      </div>
                      <p className="text-[10px] text-white/30 mt-3">Click to flip back</p>
                    </div>
                  </div>
                  {/* Delete button */}
                  <button onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }} disabled={deletingId === card.id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:bg-red-900/30 disabled:opacity-30 z-10"
                    style={{ background: "rgba(10,26,20,0.8)", border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,100,100,0.8)" }}>
                    {deletingId === card.id ? <Spinner /> : <Trash2 size={11} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Summary panel ============

function SummaryPanel({ workspaceId, hasDocuments }: { workspaceId: number; hasDocuments: boolean }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ content?: string; summary?: string } | null>(`/summaries?workspace_id=${workspaceId}`);
      setSummary(data ? (data.content || data.summary || null) : null);
    } catch {
      setSummary(null);
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const generate = async () => {
    setGenerating(true);
    try {
      await apiJson("/summaries/generate", { method: "POST", body: JSON.stringify({ workspace_id: workspaceId }) });
      await fetchSummary();
      toast.success("Summary generated!", { style: { background: "#0a1a14", border: "1px solid #2bbe8c", color: "#fff" } });
    } catch (err) { showError(err); }
    finally { setGenerating(false); }
  };

  if (!hasDocuments) return <EmptyState />;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(43,190,140,0.12)" }}>
        <h2 className="text-lg font-bold text-white">Summary</h2>
        <PrimaryButton onClick={generate} disabled={generating} className="py-1.5 px-3 text-xs">
          {generating ? <span className="flex items-center gap-1.5"><Spinner /> Generating...</span> : summary ? "Regenerate" : "Generate Summary"}
        </PrimaryButton>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex justify-center mt-12"><Spinner /></div>
        ) : !summary ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(43,190,140,0.08)", border: "1px solid rgba(43,190,140,0.25)" }}>
              <FileText size={28} style={{ color: "rgba(43,190,140,0.5)" }} />
            </div>
            <p className="text-sm text-white/50">No summary yet. Generate one from your documents.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-2xl p-6 backdrop-blur-xl" style={CARD_STYLE}>
            <MarkdownContent content={summary} />
          </div>
        )}
      </div>
    </div>
  );
}

// Simple markdown renderer for headings and bullet lists
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-sm text-white/85 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold text-white mt-4">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-white mt-5">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-white mt-6">{line.slice(2)}</h1>;
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2">
            <span style={{ color: "#2bbe8c" }}>•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ============ Prep panel (quiz) ============

type QuizMode = "mcq" | "interactive";
type QuizData = { session_id: number; mode: QuizMode; questions: { question: string; options?: string[]; correct_index?: number }[] };
type QuizSession = { id: number; mode: string; created_at: string; question_count: number };

function PrepPanel({ workspaceId, hasDocuments }: { workspaceId: number; hasDocuments: boolean }) {
  const [num, setNum] = useState(5);
  const [mode, setMode] = useState<QuizMode>("mcq");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct?: boolean; correct_index?: number; score?: number; feedback?: string } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await apiJson<{ sessions?: QuizSession[] }>(`/quiz/sessions?workspace_id=${workspaceId}`);
      setSessions(data.sessions || []);
    } catch { setSessions([]); }
    finally { setLoadingSessions(false); }
  }, [workspaceId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const reset = () => { setQuiz(null); setIdx(0); setSelected(null); setAnswer(""); setFeedback(null); setTotalScore(0); setDone(false); };

  const generate = async () => {
    setLoading(true);
    try {
      const data = await apiJson<QuizData>("/quiz/generate", { method: "POST", body: JSON.stringify({ workspace_id: workspaceId, num_questions: num, mode }) });
      setQuiz(data); setIdx(0); setSelected(null); setAnswer(""); setFeedback(null); setTotalScore(0); setDone(false);
      await fetchSessions();
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const data = await apiJson<QuizData>(`/quiz/sessions/${sessionId}`);
      setQuiz(data); setIdx(0); setSelected(null); setAnswer(""); setFeedback(null); setTotalScore(0); setDone(false);
      setActiveTab("new");
    } catch (err) { showError(err); }
  };

  const grade = async (payload: Record<string, unknown>) => {
    setGrading(true);
    try {
      const data = await apiJson<{ correct?: boolean; correct_index?: number; score?: number; feedback?: string }>("/quiz/grade", { method: "POST", body: JSON.stringify(payload) });
      setFeedback(data);
      if (typeof data.score === "number") setTotalScore((s) => s + data.score!);
      else if (data.correct) setTotalScore((s) => s + 1);
    } catch (err) { showError(err); }
    finally { setGrading(false); }
  };

  const next = () => {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) { setDone(true); return; }
    setIdx((i) => i + 1); setSelected(null); setAnswer(""); setFeedback(null);
  };

  if (!hasDocuments) return <EmptyState />;

  if (!quiz) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(43,190,140,0.15)" }}>
            {(["new", "history"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className="flex-1 rounded-lg py-2 text-xs font-medium transition-all"
                style={{ background: activeTab === t ? "rgba(43,190,140,0.2)" : "transparent", color: activeTab === t ? "#2bbe8c" : "rgba(255,255,255,0.5)", border: activeTab === t ? "1px solid rgba(43,190,140,0.35)" : "1px solid transparent" }}>
                {t === "new" ? "New Quiz" : "History"}
              </button>
            ))}
          </div>

          {activeTab === "new" ? (
            <div className="rounded-2xl p-8 backdrop-blur-xl" style={CARD_STYLE}>
              <h2 className="text-2xl font-bold text-white">Preparation Mode</h2>
              <p className="mt-2 text-sm text-white/60">Generate a quiz from your workspace documents.</p>
              <div className="mt-6 space-y-4">
                <label className="block text-xs uppercase tracking-wider text-white/60">
                  Number of questions
                  <input type="number" min={1} max={20} value={num} onChange={(e) => setNum(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={INPUT_STYLE} />
                </label>
                <label className="block text-xs uppercase tracking-wider text-white/60">
                  Mode
                  <select value={mode} onChange={(e) => setMode(e.target.value as QuizMode)}
                    className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={INPUT_STYLE}>
                    <option value="mcq">Multiple choice</option>
                    <option value="interactive">Open-ended</option>
                  </select>
                </label>
                <PrimaryButton onClick={generate} disabled={loading} className="w-full">
                  {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Generating...</span> : "Generate Quiz"}
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-6 backdrop-blur-xl" style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-4">
                <History size={16} style={{ color: "#2bbe8c" }} />
                <h2 className="text-base font-bold text-white">Past Quiz Sessions</h2>
              </div>
              {loadingSessions ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-6">No quiz sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <button key={s.id} onClick={() => loadSession(s.id)}
                      className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:brightness-110"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(43,190,140,0.2)" }}>
                      <div>
                        <p className="text-sm font-medium text-white capitalize">{s.mode === "mcq" ? "Multiple Choice" : "Open-ended"}</p>
                        <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {new Date(s.created_at).toLocaleDateString()} · {s.question_count} questions
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(43,190,140,0.15)", color: "#2bbe8c", border: "1px solid rgba(43,190,140,0.3)" }}>Retake</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl p-8 text-center backdrop-blur-xl" style={CARD_STYLE}>
          <h2 className="text-2xl font-bold text-white">Quiz complete</h2>
          <p className="mt-4 text-5xl font-bold" style={{ color: "#2bbe8c" }}>{Math.round(totalScore * 100) / 100} / {quiz.questions.length}</p>
          <PrimaryButton onClick={reset} className="mt-6 w-full">Try Again</PrimaryButton>
        </div>
      </div>
    );
  }

  const q = quiz.questions[idx];
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6">
      <div className="w-full max-w-2xl rounded-2xl p-8 backdrop-blur-xl" style={{ ...CARD_STYLE, animation: "fadeIn 0.3s ease" }}>
        <p className="text-xs uppercase tracking-wider text-white/50">Question {idx + 1} / {quiz.questions.length}</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{q.question}</h3>

        {quiz.mode === "mcq" ? (
          <div className="mt-6 space-y-2">
            {(q.options || []).map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = feedback && feedback.correct_index === i;
              const isWrong = feedback && isSelected && feedback.correct === false;
              return (
                <button key={i} disabled={selected !== null || grading}
                  onClick={async () => { setSelected(i); await grade({ workspace_id: workspaceId, session_id: quiz.session_id, question_index: idx, selected_index: i }); }}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm transition-all"
                  style={{ background: isCorrect ? "rgba(43,190,140,0.2)" : isWrong ? "rgba(200,60,60,0.15)" : "rgba(0,0,0,0.4)", border: `1px solid ${isCorrect ? "#2bbe8c" : isWrong ? "#ff6b6b" : isSelected ? "rgba(43,190,140,0.5)" : "rgba(43,190,140,0.15)"}`, color: "white" }}>
                  {opt}
                </button>
              );
            })}
            {grading && <div className="flex justify-center py-2"><Spinner /></div>}
          </div>
        ) : (
          <div className="mt-6">
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..." rows={5} disabled={feedback !== null}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none" style={INPUT_STYLE} />
            {!feedback && (
              <PrimaryButton onClick={() => grade({ workspace_id: workspaceId, session_id: quiz.session_id, question_index: idx, answer })} disabled={grading} className="mt-3">
                {grading ? <span className="flex items-center gap-2"><Spinner /> Grading...</span> : "Submit Answer"}
              </PrimaryButton>
            )}
          </div>
        )}

        {feedback && (
          <div className="mt-6 rounded-xl p-4" style={INPUT_STYLE}>
            {typeof feedback.score === "number" && (
              <p className="text-sm text-white">Score: <span style={{ color: "#2bbe8c" }} className="font-semibold">{feedback.score}</span></p>
            )}
            {feedback.feedback && <p className="mt-1 text-sm text-white/80">{feedback.feedback}</p>}
            <PrimaryButton onClick={next} className="mt-3">{idx + 1 >= quiz.questions.length ? "Finish" : "Next question"}</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Mock panel ============

function MockPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(43,190,140,0.1)", border: "1px solid rgba(43,190,140,0.35)" }}>
        <Mic size={32} style={{ color: "#2bbe8c" }} />
      </div>
      <h2 className="mt-6 text-3xl font-bold text-white">Mock Interview</h2>
      <p className="mt-2 text-sm text-white/60">This feature is coming soon.</p>
    </div>
  );
}

// ============ Root ============

type AuthedView = { kind: "workspaces" } | { kind: "app"; workspace: Workspace };

function Index() {
  const [booted, setBooted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState<AuthedView>({ kind: "workspaces" });
  const email = typeof window !== "undefined" ? localStorage.getItem("smriti_email") || "" : "";

  useEffect(() => {
    const has = typeof window !== "undefined" && !!localStorage.getItem("smriti_token");
    setAuthed(has);
    setChecked(true);
    if (has) { setBooted(true); return; }
    const t = setTimeout(() => setBooted(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const logout = () => {
    localStorage.removeItem("smriti_token");
    localStorage.removeItem("smriti_email");
    setAuthed(false);
    setView({ kind: "workspaces" });
  };

  useEffect(() => { setUnauthCallback(logout); }, []);

  if (!checked || !booted) return <BootScreen />;

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: "#0a1a14" }}>
      <ParticleNetwork />
      <Toaster position="bottom-right" />
      {authed ? (
        view.kind === "workspaces" ? (
          <WorkspaceView email={email} onLogout={logout} onSelect={(w) => setView({ kind: "app", workspace: w })} />
        ) : (
          <MainApp workspace={(view as { kind: "app"; workspace: Workspace }).workspace} onBack={() => setView({ kind: "workspaces" })} onLogout={logout} />
        )
      ) : (
        <AuthScreen onAuthed={() => setAuthed(true)} />
      )}
    </div>
  );
}