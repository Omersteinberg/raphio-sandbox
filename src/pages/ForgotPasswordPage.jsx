import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AuthScreen,
  C,
  UnderlineInput,
  PrimaryButton,
  ErrorBanner,
} from "./auth/authUI.jsx";
import { requestPasswordReset } from "../api/auth.js";
import { describeError } from "../lib/errorDetail";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(describeError(err, "We couldn't send the reset email. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      {sent ? (
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
            Check your <span style={{ color: C.terra }}>email</span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
            If an account exists for that address, we have sent a link to reset
            your password. It expires in 1 hour.
          </p>
          <Link
            to="/login"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.terra,
              textDecoration: "none",
            }}
          >
            Back to sign in
          </Link>
        </div>
      ) : (
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
              Forgot your <span style={{ color: C.terra }}>password</span>?
            </h1>
            <p style={{ fontSize: 14, color: C.muted }}>
              Enter your email and we will send you a reset link.
            </p>
          </div>
          <ErrorBanner message={error} />
          <UnderlineInput
            id="forgot-email"
            type="email"
            label="Email"
            placeholder="email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PrimaryButton loading={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </PrimaryButton>
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: C.muted,
              marginTop: 24,
            }}
          >
            Remembered it?{" "}
            <Link
              to="/login"
              style={{ color: C.terra, fontWeight: 700, textDecoration: "none" }}
            >
              Sign in
            </Link>
          </p>
        </motion.form>
      )}
    </AuthScreen>
  );
}
