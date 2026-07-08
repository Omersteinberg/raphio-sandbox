import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ── Design tokens (mirrors MyVideosPage) ──────────────────────────
const C = {
  bg: "linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)",
  dark: "#2D2235",
  terra: "#C1440E",
  terraLt: "#E8632A",
  muted: "#6B5E7B",
  border: "rgba(45,34,53,0.09)",
};

// The skippable checkpoints. Order = the order they appear across the wizards.
const AUTO_APPROVE_ROWS = [
  {
    key: "references",
    title: "References lock",
    desc: "Approve generated character and setting references automatically (references mode).",
  },
  {
    key: "script",
    title: "Script review",
    desc: "Approve the generated script without stopping to review it.",
  },
  {
    key: "bridges",
    title: "Bridge frames",
    desc: "Approve AI bridge frames automatically (only when smooth transitions are on, and never if a frame failed).",
  },
  {
    key: "frames",
    title: "Scene frames",
    desc: "Approve generated scene frames automatically (references mode).",
  },
];

const GENERATE_ROW = {
  key: "generate",
  title: "Generate video",
  desc: "Start the final video generation automatically. This spends credits with no final confirmation.",
};

function Toggle({ on, onChange, danger }) {
  const activeBg = danger ? "#C1440E" : "linear-gradient(135deg, #C1440E, #E8632A)";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: 46,
        height: 26,
        background: on ? activeBg : "#E2DAD3",
      }}
    >
      <span
        className="absolute rounded-full bg-white transition-transform"
        style={{
          width: 20,
          height: 20,
          top: 3,
          left: 3,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: on ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

function ToggleRow({ title, desc, on, onChange, danger }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-4"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <div className="min-w-0">
        <p className="font-semibold" style={{ color: danger ? C.terra : C.dark, fontSize: 14.5 }}>
          {title}
        </p>
        <p className="mt-0.5" style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
          {desc}
        </p>
      </div>
      <Toggle on={on} onChange={onChange} danger={danger} />
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();

  // Toggles live in the database (per user). The auth context loads them on
  // login; each switch writes the change straight back to the server.
  const { autoApprove: flags, updateAutoApprove } = useAuth();

  const setFlag = (key, value) => {
    updateAutoApprove({ [key]: value });
  };

  return (
    <div className="h-full w-full overflow-y-auto font-figtree" style={{ background: C.bg }}>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors mb-6"
          style={{ color: C.muted }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.terra; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="font-extrabold tracking-tight mb-1" style={{ color: C.dark, fontSize: 28, letterSpacing: "-0.02em" }}>
          Settings
        </h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Preferences are saved to your account.</p>

        {/* Skip steps (auto-approve) */}
        <div
          className="mt-6 rounded-3xl p-5 md:p-6"
          style={{ background: "#fff", border: `1px solid ${C.border}`, boxShadow: "0 2px 16px rgba(45,34,53,0.06)" }}
        >
          <h2 className="font-bold" style={{ color: C.dark, fontSize: 17 }}>
            Auto-approve steps
          </h2>
          <p className="mt-1" style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
            Turn a checkpoint on and the wizard passes it for you automatically, instead of stopping to ask.
            The step still runs. It just advances on its own and stays on the progress timeline as an automatic task.
          </p>

          <div className="mt-3">
            {AUTO_APPROVE_ROWS.map((row) => (
              <ToggleRow
                key={row.key}
                title={row.title}
                desc={row.desc}
                on={!!flags[row.key]}
                onChange={(v) => setFlag(row.key, v)}
              />
            ))}
          </div>

          {/* Generate (credit warning) */}
          <div
            className="mt-4 rounded-2xl p-4"
            style={{ background: "rgba(193,68,14,0.05)", border: "1px solid rgba(193,68,14,0.20)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-1.5" style={{ color: C.terra, fontSize: 14.5 }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {GENERATE_ROW.title}
                </p>
                <p className="mt-0.5" style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
                  {GENERATE_ROW.desc}
                </p>
              </div>
              <Toggle on={!!flags[GENERATE_ROW.key]} onChange={(v) => setFlag(GENERATE_ROW.key, v)} danger />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
