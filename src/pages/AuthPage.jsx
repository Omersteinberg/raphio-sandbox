import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.jsx";
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

function GoogleButton({ disabled, onCredential, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      onError("Google sign-in is not configured.");
      return undefined;
    }

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response?.credential) {
              onError("Google did not return a sign-in credential.");
              return;
            }
            onCredential(response.credential);
          },
        });

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
          onError(err.message || "Google sign-in could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

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
      setError(err.message);
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
        setError(err.message);
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
        label="Username"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <UnderlineInput
        id="login-password"
        type="password"
        label="Password"
        placeholder="••••••••"
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
    </motion.form>
  );
}

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/videos");
    } catch (err) {
      setError(err.message);
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
        setError(err.message);
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
        id="reg-username"
        label="Username"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <UnderlineInput
        id="reg-email"
        type="email"
        label="Email"
        placeholder="email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <UnderlineInput
        id="reg-password"
        type="password"
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <UnderlineInput
        id="reg-confirm"
        type="password"
        label="Confirm password"
        placeholder="Type it again"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
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
