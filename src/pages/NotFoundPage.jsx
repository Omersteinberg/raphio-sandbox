import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";

// Catch-all page for unknown URLs, shown to both signed-in and signed-out visitors.
export default function NotFoundPage() {
  const { user } = useAuth();
  const target = user ? "/create" : "/";
  const label = user ? "Back to creating" : "Back to home";

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{ background: "var(--gradient-app)" }}
    >
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest text-terra">404</p>
        <h1 className="mt-3 text-3xl font-bold text-ink-warm">We couldn't find that page</h1>
        <p className="mt-3 text-ink-muted">
          The link may be broken, or the page may have moved.
        </p>
        <Link
          to={target}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-terra px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-terra-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
