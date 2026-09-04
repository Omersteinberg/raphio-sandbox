import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CircleCheck, AlertTriangle, Loader2 } from "lucide-react";
import { submitContactForm } from "@/services/support.js";
import { describeError } from "@/lib/errorDetail.js";

// Mirrors the token sets already used on TermsPage / PrivacyPolicyPage /
// SettingsPage so this section matches pixel-for-pixel wherever it lands.
// Card uses Clay Wash (a documented DESIGN.md secondary surface) rather than
// FAQSection's Warm Paper - a deliberate, subtle tint difference so the two
// split-panel columns read as distinct paths without clashing.
const C = {
  card: "#F0EAE5", // clay wash
  cardBorder: "#EFDCD2", // clay mist
  ink: "var(--ink-warm)", // #1C1917
  muted: "#6B5E7B",
  // Field labels reuse `muted` rather than a separate lighter token - the
  // card moved to Clay Wash (2026-09), and the previous dedicated label
  // color (#9C8F85, then #7F7062) each measured under 4.5:1 against it in
  // turn. `muted` already clears 5.01:1 here and one token is one less to
  // re-verify next time the card background changes.
  terra: "#C1440E",
  fieldBg: "#FFFAF7",
  fieldBorder: "#E5DED3",
  error: "#B91C1C",
};

const LIMITS = { name: 200, email: 254, category: 50, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CATEGORY_OPTIONS = [
  "Getting Started",
  "Modes",
  "Credits & Billing",
  "Troubleshooting",
  "Other",
];

// The backend still requires `subject` and builds the email subject line
// from it - the field is gone from the UI, so this derives a short, natural
// subject from the category the user already picked instead.
function subjectForCategory(category) {
  if (category === "Other") return "General inquiry";
  return `${category} inquiry`;
}

const EMPTY_VALUES = { name: "", email: "", category: "", message: "" };

function validate(values) {
  const errors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Please enter your name.";
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer.`;

  const email = values.email.trim();
  if (!email) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
  else if (email.length > LIMITS.email) errors.email = `Email must be ${LIMITS.email} characters or fewer.`;

  if (!values.category) errors.category = "Please choose a category.";

  const message = values.message.trim();
  if (!message) errors.message = "Please enter a message.";
  else if (message.length > LIMITS.message) errors.message = `Message must be ${LIMITS.message} characters or fewer.`;

  return errors;
}

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const setField = (key) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((errs) => ({ ...errs, [key]: undefined }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError("");
    setLoading(true);
    try {
      const data = await submitContactForm({
        name: values.name.trim(),
        email: values.email.trim(),
        category: values.category,
        subject: subjectForCategory(values.category),
        message: values.message.trim(),
      });
      setSuccessMessage(data?.message || "Thanks, we've got your message and will get back to you soon.");
    } catch (err) {
      setFormError(
        describeError(err, "We couldn't send your message. Please try again in a moment.").userMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const sendAnother = () => {
    setValues(EMPTY_VALUES);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage(null);
  };

  return (
    <div
      className="rounded-2xl p-6 sm:p-8 h-full flex flex-col"
      style={{ background: C.card, border: `1px solid ${C.cardBorder}`, boxShadow: "0 2px 12px rgba(193,68,14,0.04)" }}
    >
      <style>{`
        .support-field { transition: border-color 160ms ease-out, background 160ms ease-out; }
        .support-field:focus { outline: none; border-color: ${C.terra}; background: #FFFFFF; }
        .support-field::placeholder { color: #B7A99C; }
        .support-submit { transition: transform 160ms ease-out, box-shadow 200ms ease-out, opacity 160ms ease-out; }
        .support-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(193,68,14,0.35); }
        .support-submit:active:not(:disabled) { transform: scale(0.98); }
        .support-submit:disabled { cursor: not-allowed; opacity: 0.7; }
      `}</style>

      <h2 className="font-figtree font-bold" style={{ fontSize: 20, color: C.ink }}>
        Contact us
      </h2>
      <p className="text-sm mt-1.5" style={{ color: C.muted }}>
        Can't find what you need? Send us a message.
      </p>

      <AnimatePresence mode="wait">
        {successMessage ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center text-center py-6"
          >
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-full"
              style={{ width: 48, height: 48, background: "rgba(193,68,14,0.10)" }}
            >
              <CircleCheck className="w-6 h-6" style={{ color: C.terra }} />
            </div>
            <p className="font-bold" style={{ fontSize: 17, color: C.ink }}>
              Message sent
            </p>
            <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: C.muted }}>
              {successMessage}
            </p>
            <button
              type="button"
              onClick={sendAnother}
              className="mt-6 text-sm font-bold underline underline-offset-2 transition-opacity hover:opacity-60"
              style={{ color: C.terra }}
            >
              Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            noValidate
            className="mt-5 flex-1 flex flex-col"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" htmlFor="support-name" error={fieldErrors.name}>
                <input
                  id="support-name"
                  className="support-field w-full"
                  style={fieldStyle}
                  type="text"
                  placeholder="Your name"
                  value={values.name}
                  onChange={setField("name")}
                  maxLength={LIMITS.name}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email" htmlFor="support-email" error={fieldErrors.email}>
                <input
                  id="support-email"
                  className="support-field w-full"
                  style={fieldStyle}
                  type="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={setField("email")}
                  maxLength={LIMITS.email}
                  autoComplete="email"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Category" htmlFor="support-category" error={fieldErrors.category}>
                <div className="relative">
                  <select
                    id="support-category"
                    className="support-field w-full appearance-none"
                    style={{ ...fieldStyle, paddingRight: 36, color: values.category ? C.ink : "#B7A99C" }}
                    value={values.category}
                    onChange={setField("category")}
                  >
                    <option value="" disabled>
                      Choose one
                    </option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: C.muted }}
                  />
                </div>
              </Field>
            </div>

            <div className="mt-4 flex-1 flex flex-col">
              <Field
                label="Message"
                htmlFor="support-message"
                error={fieldErrors.message}
                hint={`${values.message.length}/${LIMITS.message}`}
                className="flex-1 flex flex-col"
              >
                <textarea
                  id="support-message"
                  className="support-field w-full font-figtree flex-1"
                  style={{ ...fieldStyle, height: "auto", minHeight: 140, padding: "10px 12px", resize: "vertical" }}
                  placeholder="Tell us what's going on"
                  value={values.message}
                  onChange={setField("message")}
                  maxLength={LIMITS.message}
                />
              </Field>
            </div>

            {formError && (
              <div
                className="flex items-start gap-2 mt-4 rounded-lg px-3.5 py-3"
                style={{ background: "rgba(185,28,28,0.07)", border: "1px solid rgba(185,28,28,0.18)" }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.error }} />
                <p className="text-sm" style={{ color: C.error }}>
                  {formError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="support-submit w-full mt-6 inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold text-white"
              style={{
                height: 48,
                border: "none",
                background: C.terra,
                boxShadow: "0 4px 16px rgba(193,68,14,0.25)",
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Sending…" : "Send message"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

const fieldStyle = {
  height: 44,
  borderRadius: 8,
  border: `1px solid ${C.fieldBorder}`,
  background: C.fieldBg,
  padding: "0 12px",
  // 16px, not 14 (2026-09) - anything under 16px triggers iOS Safari's
  // auto-zoom on focus, which is jarring on a form this short (the zoomed
  // viewport doesn't reliably reset when the user taps to the next field).
  fontSize: 16,
  color: C.ink,
  outline: "none",
};

function Field({ label, htmlFor, error, hint, children, className = "" }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          htmlFor={htmlFor}
          className="block"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}
        >
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: 11, color: C.muted }}>{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p style={{ marginTop: 6, fontSize: 12.5, color: C.error, fontWeight: 500 }}>{error}</p>
      )}
    </div>
  );
}
