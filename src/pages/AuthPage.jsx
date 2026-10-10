import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { describeError } from "../lib/errorDetail";
import {
  C,
  UnderlineInput,
  ErrorBanner,
  PrimaryButton,
  Divider,
  AuthScreen,
} from "./auth/authUI.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let googleIdentityScriptPromise;
let gsiReady = false;
let latestCred = null;
let latestErr = null;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("Google sign-in could not be loaded"));
      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
}

// Renders Google's button. initialize() runs once per page load; its callback reads the handlers of the currently mounted button.
function GoogleButton({ disabled, onCredential, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    latestCred = onCredential;
    latestErr = onError;
    return () => {
      if (latestCred === onCredential) latestCred = null;
      if (latestErr === onError) latestErr = null;
    };
  }, [onCredential, onError]);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      latestErr?.("Google sign-in is not configured.");
      return undefined;
    }

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        if (!gsiReady) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              if (!response?.credential) {
                latestErr?.("Google did not return a sign-in credential.");
                return;
              }
              latestCred?.(response.credential);
            },
          });
          gsiReady = true;
        }

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.min(buttonRef.current.offsetWidth || 340, 360),
        });
      })
      .catch((err) => {
        if (!cancelled)
          latestErr?.(err.message || "Google sign-in could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onError("Google sign-in is not configured.")}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 9999,
          border: `1.5px solid ${C.faint}`,
          background: "transparent",
          fontSize: 14,
          fontWeight: 600,
          color: C.muted,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Google sign-in unavailable
      </button>
    );
  }

  return (
    <div
      ref={buttonRef}
      style={{
        width: "100%",
        minHeight: 44,
        display: "flex",
        justifyContent: "center",
        opacity: disabled ? 0.65 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    />
  );
}

// One muted line linking the legal pages, shown once under each form.
function ConsentNotice({ lead }) {
  const link =
    "underline-offset-2 transition-colors hover:text-terra hover:underline focus-visible:text-terra focus-visible:underline";
  return (
    <p className="mt-3 text-center font-figtree text-xs leading-relaxed text-ink-muted [text-wrap:balance]">
      {lead}, you agree to our{" "}
      <Link to="/terms" className={link}>
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link to="/privacy" className={link}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}

// ── Forms ─────────────────────────────────────────────────────────
function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/videos");
    } catch (err) {
      setError(describeError(err, "We couldn't sign you in. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError("");
      setLoading(true);
      try {
        await googleLogin(credential);
        navigate("/videos");
      } catch (err) {
        setError(describeError(err, "We couldn't sign you in with Google. Please try again.").userMessage);
      } finally {
        setLoading(false);
      }
    },
    [googleLogin, navigate],
  );

  const handleGoogleError = useCallback((message) => {
    setError(message);
  }, []);

  return (
    <motion.form
      key="login"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onSubmit={handleSubmit}
    >
      <ErrorBanner message={error} />
      <UnderlineInput
        id="login-username"
        label="Email or username"
        placeholder="Email or username"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <UnderlineInput
        id="login-password"
        type="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 20,
          marginTop: -6,
        }}
      >
        <span
          onClick={() => navigate("/forgot-password")}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.terra,
            cursor: "pointer",
          }}
        >
          Forgot password?
        </span>
      </div>
      <PrimaryButton loading={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </PrimaryButton>
      <Divider />
      <GoogleButton
        disabled={loading}
        onCredential={handleGoogleCredential}
        onError={handleGoogleError}
      />
      <ConsentNotice lead="By continuing" />
    </motion.form>
  );
}

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ email, password });
      navigate("/videos");
    } catch (err) {
      setError(describeError(err, "We couldn't create your account. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError("");
      setLoading(true);
      try {
        await googleLogin(credential);
        navigate("/videos");
      } catch (err) {
        setError(describeError(err, "We couldn't sign you in with Google. Please try again.").userMessage);
      } finally {
        setLoading(false);
      }
    },
    [googleLogin, navigate],
  );

  const handleGoogleError = useCallback((message) => {
    setError(message);
  }, []);

  return (
    <motion.form
      key="register"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onSubmit={handleSubmit}
    >
      <ErrorBanner message={error} />
      <UnderlineInput
        id="reg-email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <UnderlineInput
        id="reg-password"
        type={showPassword ? "text" : "password"}
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        endAdornment={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: 40,
              width: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: C.muted,
              cursor: "pointer",
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />
      <PrimaryButton loading={loading}>
        {loading ? "Creating account…" : "Create account"}
      </PrimaryButton>
      <Divider />
      <GoogleButton
        disabled={loading}
        onCredential={handleGoogleCredential}
        onError={handleGoogleError}
      />
      <ConsentNotice lead="By creating an account or continuing with Google" />
    </motion.form>
  );
}

// ── AuthPage ──────────────────────────────────────────────────────
export default function AuthPage() {
  const isRegister =
    typeof window !== "undefined" &&
    window.location.pathname.includes("register");
  const [tab, setTab] = useState(isRegister ? "register" : "login");

  return (
    <AuthScreen>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1.5px solid ${C.faint}`,
          marginBottom: 28,
        }}
      >
        {[
          { key: "login", label: "Sign In" },
          { key: "register", label: "Register" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              paddingBottom: 11,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              background: "transparent",
              border: "none",
              borderBottom:
                tab === key
                  ? `2px solid ${C.terra}`
                  : "2px solid transparent",
              marginBottom: -1.5,
              color: tab === key ? C.dark : C.muted,
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Heading */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: C.dark,
            marginBottom: 6,
            lineHeight: 1.2,
          }}
        >
          {tab === "login" ? (
            <>
              Welcome <span style={{ color: C.terra }}>back</span>
            </>
          ) : (
            <>
              Create <span style={{ color: C.terra }}>your account</span>
            </>
          )}
        </h1>
        <p style={{ fontSize: 14, color: C.muted }}>
          {tab === "login"
            ? "Sign in to keep creating videos"
            : "Start making amazing videos in minutes"}
        </p>
      </div>

      {/* Form */}
      <AnimatePresence mode="wait">
        {tab === "login" ? (
          <LoginForm key="login" />
        ) : (
          <RegisterForm key="register" />
        )}
      </AnimatePresence>

      {/* Footer */}
      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: C.muted,
          marginTop: 24,
        }}
      >
        {tab === "login" ? (
          <>
            No account?{" "}
            <span
              onClick={() => setTab("register")}
              style={{ color: C.terra, fontWeight: 700, cursor: "pointer" }}
            >
              Sign up free
            </span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span
              onClick={() => setTab("login")}
              style={{ color: C.terra, fontWeight: 700, cursor: "pointer" }}
            >
              Sign in
            </span>
          </>
        )}
      </p>
    </AuthScreen>
  );
}
