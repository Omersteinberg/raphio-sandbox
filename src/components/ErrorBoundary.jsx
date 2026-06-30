import { Component } from "react";
import { reportClientError } from "../services/errorReporter.js";

/**
 * Catches render-time crashes anywhere below it so the user sees a recoverable
 * message instead of a white screen, and reports the crash to the backend
 * (which forwards it to Slack).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportClientError({
      kind: "render-crash",
      message: error?.message || String(error),
      stack: `${error?.stack || ""}\n--- component stack ---${info?.componentStack || ""}`,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#3f2a20",
          background: "#faf3ec",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something went wrong.</h1>
        <p style={{ maxWidth: "28rem", margin: 0, opacity: 0.8 }}>
          This page hit an unexpected error. Please reload to continue. If it keeps
          happening, our team has already been notified.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.4rem",
            border: "none",
            borderRadius: "0.5rem",
            background: "#c4622d",
            color: "#fff",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
