import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitSurvey } from "@/services/errorReporter";
import { surveyDone, markSurveyDone } from "@/lib/surveyState";

// One-time satisfaction prompt shown below the finished video (ResultStep only).
// Pick 1-5, then a follow-up whose question changes with the score. The response
// is fire-and-forwarded to the Slack feedback channel; nothing is stored locally
// except the "already answered" flag (surveyState) so the card never returns for
// this video - answering OR dismissing both count.

const RATINGS = [1, 2, 3, 4, 5];

// The follow-up question is the whole point: it turns a number into a reason.
function followUpFor(rating) {
  if (rating <= 2) return "Sorry about that - what went wrong or felt frustrating?";
  if (rating === 3) return "Thanks! What would have made this a 5?";
  return "Love it! What did you enjoy most?";
}

export default function PostVideoSurvey({ sessionId, title, model }) {
  const alreadyDone = useMemo(() => surveyDone(sessionId), [sessionId]);
  const [phase, setPhase] = useState("ask"); // ask | thanks | closed
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!sessionId || alreadyDone || phase === "closed") return null;

  const close = () => {
    markSurveyDone(sessionId);
    setPhase("closed");
  };

  const handleSubmit = () => {
    if (!rating) return;
    submitSurvey({ sessionId, rating, comment, title, model });
    markSurveyDone(sessionId);
    setPhase("thanks");
  };

  if (phase === "thanks") {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
            <Check className="h-5 w-5 text-green-600" />
          </span>
          <p className="font-medium">Thanks for the feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss survey"
        className="absolute right-4 top-4 text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="pr-8 font-semibold text-foreground">How was creating this video?</h3>

      {/* Rating - the one signature element. Selected pill carries the brand gradient. */}
      <div className="mt-4">
        <div className="flex gap-2">
          {RATINGS.map((n) => {
            const selected = rating === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} out of 5`}
                aria-pressed={selected}
                className={`h-12 flex-1 rounded-xl border text-base font-semibold transition-all ${
                  selected
                    ? "border-transparent text-white shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                style={selected ? { background: "var(--gradient-brand)" } : undefined}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Not great</span>
          <span>Loved it</span>
        </div>
      </div>

      {rating > 0 && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-1 duration-200">
          <label htmlFor="survey-comment" className="text-sm font-medium text-foreground">
            {followUpFor(rating)}
          </label>
          <Textarea
            id="survey-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share as much or as little as you like (optional)"
            className="mt-2"
            rows={2}
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSubmit}
              className="border-0 px-6 text-white"
              style={{ background: "var(--gradient-brand)" }}
            >
              Send feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
