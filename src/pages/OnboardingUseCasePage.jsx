import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  House,
  Loader2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth.jsx";
import { saveUseCase } from "@/api/settings";
import { describeError } from "@/lib/errorDetail";

// One-time "What will you use Raphio for?" screen. Lives at /welcome, outside
// AppLayout (no AppHeader). ProtectedRoute sends users here while
// `user.useCase === null`; a tap on a card saves immediately, "Skip for now"
// saves "skipped", and either way the user continues to where they were headed.

// Values are the backend's allowed set (PUT /settings/onboarding/use-case).
const OPTIONS = [
  { value: "real_estate", label: "Real estate", Icon: House },
  { value: "hospitality", label: "Restaurants & hospitality", Icon: UtensilsCrossed },
  { value: "ecommerce", label: "Online store", Icon: ShoppingBag },
  { value: "trades", label: "Trades & services", Icon: Wrench },
  { value: "personal", label: "Personal / social", Icon: Smartphone },
  { value: "other", label: "Other", Icon: Sparkles },
];

const DEFAULT_DESTINATION = "/create";
const EASE_OUT = [0.23, 1, 0.32, 1];

// `from` is set by ProtectedRoute as a path string. Only follow an in-app path,
// and never back into /welcome itself.
function resolveDestination(from) {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }
  if (from === "/welcome" || from.startsWith("/welcome?") || from.startsWith("/welcome#")) {
    return DEFAULT_DESTINATION;
  }
  return from;
}

export default function OnboardingUseCasePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  // Which value is currently being saved. Stays set after a successful save,
  // because the page is about to unmount.
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null); // { value, message }
  const cardRefs = useRef([]);

  const busy = pending !== null;

  const save = async (value) => {
    if (busy) return;
    setError(null);
    setPending(value);
    try {
      const saved = await saveUseCase(value);
      // Local state first, so the ProtectedRoute gate sees the answer on arrival.
      updateUser({ ...user, useCase: saved });
      navigate(resolveDestination(location.state?.from), { replace: true });
    } catch (err) {
      setError({
        value,
        message: describeError(err, "We couldn't save that. Please try again.").userMessage,
      });
      setPending(null);
    }
  };

  // Cards are plain buttons (Tab + Enter/Space work natively). Arrow keys are an
  // extra: they only move focus, never save, because a tap here commits.
  const handleKeyDown = (e) => {
    const index = cardRefs.current.indexOf(document.activeElement);
    if (index === -1) return;
    const cards = cardRefs.current;
    const firstTop = cards[0].offsetTop;
    const columns = cards.filter((c) => c.offsetTop === firstTop).length || 1;

    let next = index;
    if (e.key === "ArrowRight") next = index + 1;
    else if (e.key === "ArrowLeft") next = index - 1;
    else if (e.key === "ArrowDown") next = index + columns;
    else if (e.key === "ArrowUp") next = index - columns;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = cards.length - 1;
    else return;

    e.preventDefault();
    if (next >= 0 && next < cards.length) cards[next].focus();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream px-4 py-8 font-figtree text-ink-warm sm:px-6 sm:py-12">
      <main className="mx-auto w-full max-w-[720px] sm:pt-[8vh]">
        <img src="/Logo.svg" alt="Raphio" className="mb-10 h-7 w-auto sm:mb-12" />

        <h1
          id="use-case-heading"
          className="text-3xl leading-[1.1] tracking-[-0.02em] sm:text-4xl"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 750,
            textWrap: "balance",
          }}
        >
          What will you use Raphio for?
        </h1>
        <p className="mt-3 text-base text-ink-muted">We&apos;ll show you examples that fit.</p>

        <div
          role="group"
          aria-labelledby="use-case-heading"
          aria-busy={busy}
          onKeyDown={handleKeyDown}
          className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 md:grid-cols-3"
        >
          {OPTIONS.map((option, i) => {
            const { value, label } = option;
            const Icon = option.Icon;
            const selected = pending === value;
            const dimmed = busy && !selected;
            return (
              <motion.div
                key={value}
                className="h-full"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.04 + i * 0.025 }}
              >
                <button
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => save(value)}
                  aria-busy={selected}
                  aria-disabled={dimmed || undefined}
                  className={[
                    "relative flex h-full min-h-[72px] w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-left",
                    "sm:min-h-[136px] sm:flex-col sm:items-start sm:justify-between sm:gap-5 sm:p-5",
                    "transition-[transform,border-color,background-color,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                    selected ? "border-terra bg-terra/5 ring-1 ring-terra" : "border-border",
                    dimmed ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    busy
                      ? ""
                      : "active:scale-[0.98] motion-reduce:active:scale-100 [@media(hover:hover)]:hover:border-terra/50 [@media(hover:hover)]:hover:shadow-[0_6px_20px_rgba(193,68,14,0.10)]",
                  ].join(" ")}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-terra">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="pr-7 text-base font-semibold leading-snug sm:pr-0">{label}</span>
                  {selected && (
                    <Loader2
                      className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-terra sm:top-5 sm:translate-y-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="sr-only" role="status">
          {busy ? "Saving your answer" : ""}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-destructive/25 bg-destructive/5 py-1 pl-4 pr-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 py-2">{error.message}</span>
            <button
              type="button"
              onClick={() => save(error.value)}
              className="min-h-[44px] rounded-md px-2 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => save("skipped")}
            aria-disabled={busy || undefined}
            className={[
              "-ml-1 inline-flex min-h-[44px] items-center gap-2 rounded-md px-1 text-sm font-medium text-ink-muted",
              "underline decoration-ink-muted/40 underline-offset-4 transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
              busy ? "cursor-not-allowed opacity-50" : "[@media(hover:hover)]:hover:text-ink-warm",
            ].join(" ")}
          >
            Skip for now
            {pending === "skipped" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
