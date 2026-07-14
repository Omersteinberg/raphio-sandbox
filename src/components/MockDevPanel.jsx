import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FlaskConical, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { getMockStatus } from "@/services/session";
import { useAuth } from "@/hooks/useAuth";
import * as dev from "@/services/dev";

// Dev-only control plane for the mock harness. Renders nothing unless the backend
// reports MOCK_AI, and every endpoint it calls is unmounted in production, so this
// cannot leak into a real build.
//
// Deliberately NOT brand-styled: the amber is a warning surface, not product UI,
// and it should never be mistaken for part of the app.

const AMBER = "#B45309";
const AMBER_DARK = "#78350F";

// A failStep with no armed session cannot do anything, so the panel only offers
// the fault controls once the URL carries ?session=.
const FAIL_STEP_LABELS = {
  upload: "Photo upload",
  analyze: "Image analysis",
  restyle: "Image restyle",
  outline: "Outline generation",
  script: "Script generation",
  bridges: "Bridge frames",
  frameImage: "Opening/closing frame",
  refs: "Reference images",
  refRestyle: "Reference restyle",
  scenes: "Scene frames",
  clip: "A video clip (reds the clips row)",
  tts: "Narration (freezes, then stalls)",
  music: "Background music (amber warning)",
  assembly: "ffmpeg assembly (reds assembly)",
  video: "Whole render, before any clip",
  orphan: "GENERATING with no Video row",
  export: "Timeline export",
  reassemble: "Reassemble video",
  regenClip: "Regenerate a clip",
  regenNarration: "Regenerate narration",
};

const ERROR_KIND_LABELS = {
  charge: "402 insufficient credits",
  preflight: "503 provider unavailable",
  concurrency: "409 too many generating",
};

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#FDE68A",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Btn({ onClick, children, busy, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      style={{
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.25)",
        color: "#FFF7ED",
        borderRadius: 6,
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 600,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle = {
  width: "100%",
  background: AMBER_DARK,
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#FFF7ED",
  borderRadius: 6,
  padding: "5px 7px",
  fontSize: 11,
};

export default function MockDevPanel() {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const sessionId = searchParams.get("session");

  const [failStep, setFailStep] = useState("");
  const [failMode, setFailMode] = useState("once");
  const [stepMs, setStepMs] = useState(2000);
  const [errors, setErrors] = useState({});

  const refresh = useCallback(async () => {
    const next = await getMockStatus(sessionId || undefined);
    setStatus(next);
    if (next.arm) {
      setFailStep(next.arm.failStep || "");
      setFailMode(next.arm.failMode || "once");
      setStepMs(Number.isFinite(next.arm.stepMs) ? next.arm.stepMs : 2000);
      setErrors(next.arm.errors || {});
    }
    return next;
  }, [sessionId]);

  // One status read per session change. The warning toast fires once per mount,
  // not once per session, so navigating between sessions does not re-toast.
  const toasted = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getMockStatus(sessionId || undefined).then((next) => {
      if (cancelled) return;
      setStatus(next);
      if (next.arm) {
        setFailStep(next.arm.failStep || "");
        setFailMode(next.arm.failMode || "once");
        setStepMs(Number.isFinite(next.arm.stepMs) ? next.arm.stepMs : 2000);
        setErrors(next.arm.errors || {});
      }
      if (next.mockMode && !toasted.current) {
        toasted.current = true;
        toast.warn("Mock mode is ON: dummy data, no credits, no real videos.", {
          autoClose: 6000,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const run = async (label, fn) => {
    setBusy(true);
    try {
      const result = await fn();
      toast.success(`${label}: ok`);
      await refresh();
      return result;
    } catch (err) {
      // The backend rejects an unknown failStep rather than arming nothing, so
      // surface its message verbatim instead of a generic failure.
      const detail = err?.response?.data?.error || err?.message || "failed";
      toast.error(`${label}: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  if (!status?.mockMode) return null;

  const arm = status.arm;
  const armSummary = arm?.failStep
    ? `${arm.failStep} (${arm.failMode})`
    : arm
      ? `no failStep, ${arm.stepMs}ms beats`
      : "not armed";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide select-none"
        style={{
          background: AMBER,
          color: "#FFF7ED",
          boxShadow: "0 4px 14px rgba(180,83,9,0.45)",
          letterSpacing: "0.06em",
        }}
        title="Backend is in MOCK_AI mode. Click to open the fault-injection panel."
      >
        <FlaskConical className="w-3.5 h-3.5" />
        Mock mode
        {arm?.failStep ? (
          <span style={{ fontWeight: 800, textTransform: "none" }}>: {arm.failStep}</span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-[70] rounded-xl"
      style={{
        background: AMBER,
        color: "#FFF7ED",
        boxShadow: "0 8px 28px rgba(180,83,9,0.5)",
        width: 292,
        maxHeight: "80vh",
        overflowY: "auto",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <FlaskConical className="w-4 h-4" />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>MOCK HARNESS</span>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ marginLeft: "auto", color: "#FFF7ED", cursor: "pointer" }}
          aria-label="Close mock panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!sessionId ? (
        <div style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.9 }}>
          Open a session (a URL with <code>?session=</code>) to arm faults. Sweep still
          works from here.
          <div style={{ marginTop: 10 }}>
            <Btn busy={busy} onClick={() => run("Sweep", dev.sweep)}>
              Sweep watchdogs
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <Section title="Session">
            <div style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.85, wordBreak: "break-all" }}>
              {sessionId}
            </div>
            <div style={{ fontSize: 11, marginTop: 3 }}>Armed: {armSummary}</div>
          </Section>

          <Section title="Fail at">
            <select style={inputStyle} value={failStep} onChange={(e) => setFailStep(e.target.value)}>
              <option value="">nothing (happy path)</option>
              {status.failSteps.map((s) => (
                <option key={s} value={s}>
                  {FAIL_STEP_LABELS[s] || s}
                </option>
              ))}
            </select>
          </Section>

          <Section title="Mode">
            <div style={{ display: "flex", gap: 10 }}>
              {status.failModes.map((m) => (
                <label key={m} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="radio"
                    name="failMode"
                    checked={failMode === m}
                    onChange={() => setFailMode(m)}
                  />
                  {m}
                </label>
              ))}
            </div>
          </Section>

          <Section title={`Beat: ${stepMs}ms${stepMs === 0 ? " (instant)" : ""}`}>
            <input
              type="range"
              min={0}
              max={4000}
              step={250}
              value={stepMs}
              onChange={(e) => setStepMs(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </Section>

          <Section title="HTTP errors">
            {status.errorKinds.map((k) => (
              <label key={k} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <input
                  type="checkbox"
                  checked={!!errors[k]}
                  onChange={(e) => setErrors((prev) => ({ ...prev, [k]: e.target.checked }))}
                />
                {ERROR_KIND_LABELS[k] || k}
              </label>
            ))}
          </Section>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Btn
              busy={busy}
              onClick={() =>
                run("Arm", () =>
                  dev.armMock(sessionId, {
                    failStep: failStep || null,
                    failMode,
                    stepMs,
                    errors,
                  })
                )
              }
            >
              Arm
            </Btn>
            <Btn busy={busy} onClick={() => run("Disarm", () => dev.disarmMock(sessionId))}>
              Disarm
            </Btn>
          </div>

          <Section title="Watchdog">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn
                busy={busy}
                title="Age this session past the backend's 15 minute STALE_MS"
                onClick={() => run("Backdate 16m", () => dev.backdate(sessionId, 16 * 60))}
              >
                Backdate 16m
              </Btn>
              <Btn
                busy={busy}
                title="Run sweepStuckGenerations + sweepStuckJobs now"
                onClick={() => run("Sweep", dev.sweep)}
              >
                Sweep
              </Btn>
            </div>
          </Section>

          <Section title="Credits">
            <div style={{ display: "flex", gap: 6 }}>
              <Btn
                busy={busy || !user?.id}
                title={user?.id ? "Set this user's balance to 0" : "No user loaded"}
                onClick={() => run("Zero credits", () => dev.setCredits(user.id, 0))}
              >
                Zero
              </Btn>
              <Btn
                busy={busy || !user?.id}
                onClick={() => run("Give 100 credits", () => dev.setCredits(user.id, 100))}
              >
                Give 100
              </Btn>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
