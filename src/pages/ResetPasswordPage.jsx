import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "@/lib/toast";
import {
  AuthScreen,
  C,
  UnderlineInput,
  PrimaryButton,
  ErrorBanner,
} from "./auth/authUI.jsx";
import { resetPassword as resetPasswordApi } from "../api/auth.js";
import { describeError } from "../lib/errorDetail";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      toast.success("Password reset. Please sign in.");
      navigate("/login");
    } catch (err) {
      setError(describeError(err, "We couldn't reset your password. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthScreen>
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: C.dark,
              marginBottom: 10,
              lineHeight: 1.2,
            }}
          >
            Invalid reset link
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
            This link is missing its token or has already been used. Request a
            new one to continue.
          </p>
          <Link
            to="/forgot-password"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.terra,
              textDecoration: "none",
            }}
          >
            Request a new link
          </Link>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onSubmit={handleSubmit}
      >
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
            Set a new <span style={{ color: C.terra }}>password</span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted }}>
            Choose a password you have not used before.
          </p>
        </div>
        <ErrorBanner message={error} />
        <UnderlineInput
          id="reset-password"
          type="password"
          label="New password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <UnderlineInput
          id="reset-confirm"
          type="password"
          label="Confirm password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <PrimaryButton loading={loading}>
          {loading ? "Saving…" : "Reset password"}
        </PrimaryButton>
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: C.muted,
            marginTop: 24,
          }}
        >
          <Link
            to="/login"
            style={{ color: C.terra, fontWeight: 700, textDecoration: "none" }}
          >
            Back to sign in
          </Link>
        </p>
      </motion.form>
    </AuthScreen>
  );
}
