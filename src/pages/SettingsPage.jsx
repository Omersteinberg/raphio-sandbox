import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile, changePassword } from "@/api/auth";
import { describeError } from "@/lib/errorDetail";
import { toast } from "@/lib/toast";

// ── Design tokens (mirrors MyVideosPage) ──────────────────────────
// Used by the page chrome and the Preferences/auto-approve card, which stays
// pixel-for-pixel as it was before this redesign.
const C = {
  bg: "#F5F0EB",
  dark: "#2D2235",
  terra: "#C1440E",
  terraLt: "#E8632A",
  muted: "#6B5E7B",
  border: "rgba(45,34,53,0.09)",
};

// Account tab's own token set (kept separate from C above on purpose - this
// redesign's spec calls for a different, more neutral warm palette here,
// while the Preferences card keeps using C untouched).
const A = {
  cardBorder: "#E5DED3",
  label: "#9C8F85",
  value: "var(--ink-warm)",
  terra: "#C1440E",
  fieldBg: "#FAF7F2",
  fieldBorder: "#E5DED3",
  saveGradient: "var(--gradient-brand)",
  tabBg: "#EAE3DA",
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
    desc: "Approve AI bridge frames automatically (only when Bridge Frames are on, and never if a frame failed).",
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
  desc: "Start the final video generation automatically.",
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

// ── Tab switcher ───────────────────────────────────────────────────
const TABS = [
  { key: "account", label: "Account" },
  { key: "preferences", label: "Preferences" },
];

function TabSwitcher({ tab, onChange }) {
  return (
    <div className="inline-flex p-1 rounded-full" style={{ background: A.tabBg }}>
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className="relative font-semibold"
            style={{
              padding: "8px 20px",
              borderRadius: 9999,
              fontSize: 13.5,
              color: active ? A.value : A.label,
              background: "transparent",
              border: "none",
            }}
          >
            {active && (
              <motion.span
                layoutId="settings-tab-active"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Account tab building blocks ─────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label
      className="block mb-1.5"
      style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: A.label }}
    >
      {children}
    </label>
  );
}

function FieldInput({ id, type = "text", value, onChange, placeholder, autoFocus, required }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      required={required}
      className="w-full font-figtree"
      style={{
        height: 40,
        borderRadius: 8,
        border: `1px solid ${A.fieldBorder}`,
        background: A.fieldBg,
        padding: "0 12px",
        fontSize: 14,
        color: A.value,
        outline: "none",
      }}
    />
  );
}

function RowError({ message }) {
  if (!message) return null;
  return (
    <p style={{ marginTop: 8, fontSize: 12.5, color: "#DC2626", fontWeight: 500 }}>
      {message}
    </p>
  );
}

function EditLink({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 font-semibold"
      style={{ fontSize: 13, color: A.terra, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

function SaveButton({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="font-semibold"
      style={{
        height: 36,
        padding: "0 20px",
        borderRadius: 9999,
        background: A.saveGradient,
        color: "#fff",
        fontSize: 13.5,
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

function CancelButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-semibold"
      style={{
        height: 36,
        padding: "0 20px",
        borderRadius: 9999,
        background: "#fff",
        color: A.value,
        border: `1px solid ${A.cardBorder}`,
        fontSize: 13.5,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      Cancel
    </button>
  );
}

// Expand/collapse wrapper shared by all three rows' inline edit forms.
function EditPanel({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="pt-3 space-y-3">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RowHeader({ label, value, editing, onEdit, editLabel = "Edit" }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: A.label }}>
          {label}
        </p>
        {!editing && (
          <p className="mt-1 truncate" style={{ fontSize: 15, fontWeight: 500, color: A.value }}>
            {value}
          </p>
        )}
      </div>
      {!editing && <EditLink onClick={onEdit}>{editLabel}</EditLink>}
    </div>
  );
}

function UsernameRow() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startEdit = () => {
    setUsername(user?.username || "");
    setError("");
    setEditing(true);
  };
  const cancel = () => {
    setUsername(user?.username || "");
    setError("");
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const updatedUser = await updateProfile({ username });
      updateUser(updatedUser);
      toast.success("Username updated!");
      setEditing(false);
    } catch (err) {
      setError(describeError(err, "We couldn't update your username. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4">
      <RowHeader label="Username" value={user?.username || "—"} editing={editing} onEdit={startEdit} />
      <EditPanel open={editing}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <FieldLabel>Username</FieldLabel>
            <FieldInput
              id="settings-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <RowError message={error} />
          <div className="flex items-center gap-2">
            <SaveButton loading={loading}>Save</SaveButton>
            <CancelButton onClick={cancel} disabled={loading} />
          </div>
        </form>
      </EditPanel>
    </div>
  );
}

function EmailRow() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startEdit = () => {
    setEmail(user?.email || "");
    setCurrentPassword("");
    setError("");
    setEditing(true);
  };
  const cancel = () => {
    setEmail(user?.email || "");
    setCurrentPassword("");
    setError("");
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Email is the more sensitive of the two profile fields, so the backend
      // requires and verifies currentPassword whenever it's included.
      const updatedUser = await updateProfile({ email, currentPassword });
      updateUser(updatedUser);
      toast.success("Email updated!");
      setCurrentPassword("");
      setEditing(false);
    } catch (err) {
      setError(describeError(err, "We couldn't update your email. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4" style={{ borderTop: `1px solid ${A.cardBorder}` }}>
      <RowHeader label="Email" value={user?.email || "—"} editing={editing} onEdit={startEdit} />
      <EditPanel open={editing}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <FieldLabel>New Email</FieldLabel>
            <FieldInput
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <FieldInput
              id="settings-email-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <RowError message={error} />
          <div className="flex items-center gap-2">
            <SaveButton loading={loading}>Save</SaveButton>
            <CancelButton onClick={cancel} disabled={loading} />
          </div>
        </form>
      </EditPanel>
    </div>
  );
}

function PasswordRow() {
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };
  const startEdit = () => {
    resetFields();
    setEditing(true);
  };
  const cancel = () => {
    resetFields();
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated!");
      resetFields();
      setEditing(false);
    } catch (err) {
      setError(describeError(err, "We couldn't update your password. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4" style={{ borderTop: `1px solid ${A.cardBorder}` }}>
      <RowHeader label="Password" value="••••••••" editing={editing} onEdit={startEdit} editLabel="Change" />
      <EditPanel open={editing}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <FieldInput
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>New Password</FieldLabel>
            <FieldInput
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <FieldLabel>Confirm New Password</FieldLabel>
            <FieldInput
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              required
            />
          </div>
          <RowError message={error} />
          <div className="flex items-center gap-2">
            <SaveButton loading={loading}>Save</SaveButton>
            <CancelButton onClick={cancel} disabled={loading} />
          </div>
        </form>
      </EditPanel>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("account");

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

        <div className="mt-6">
          <TabSwitcher tab={tab} onChange={setTab} />
        </div>

        {tab === "account" ? (
          <div
            className="mt-4 rounded-xl p-5 md:p-6"
            style={{ background: "#fff", border: `1px solid ${A.cardBorder}` }}
          >
            <UsernameRow />
            <EmailRow />
            <PasswordRow />
          </div>
        ) : (
          <div
            className="mt-4 rounded-3xl p-5 md:p-6"
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
        )}
      </div>
    </div>
  );
}
