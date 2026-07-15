// App-wide toast policy: success/info surface normally, EXCEPT a small set of
// auto-firing confirmations from the approve -> configure -> generate chain.
//
// Product decision — those chain steps used to fire "Script approved!",
// "Frame configuration saved!" and "Video generation started!" all at once,
// stacking up. Rather than suppress every success/info toast, we suppress only
// the specific messages that fire automatically during that chain. Everything
// else (link copied, uploads, exports, etc.) shows as normal.
//
// This is a thin passthrough over react-toastify's singleton: `error`,
// `warning`, `dismiss`, `update`, `promise`, etc. behave exactly as before.
// `success` / `info` pass through too, but no-op when the message is in
// SUPPRESSED_MESSAGES.
//
// Import this instead of react-toastify anywhere you'd call toast:
//   import { toast } from "@/lib/toast";
//
// To silence another confirmation, add its exact message string below. The same
// string is suppressed no matter which hook fires it (useSession /
// useSessionBase / useReferencesSession all share these strings).
import { toast as base } from "react-toastify";

const SUPPRESSED_MESSAGES = new Set([
  "Script approved!",
  "Video generation started!",
  "Frame configuration saved!",
  "Outline approved! Bridge images generated.",
]);

// Wrap a react-toastify method so a suppressed message renders nothing while
// every other call behaves normally (and non-string content always passes).
const filtered = (fn) => (content, ...rest) => {
  if (typeof content === "string" && SUPPRESSED_MESSAGES.has(content)) return undefined;
  return fn(content, ...rest);
};

// Keep react-toastify's callable singleton so a bare `toast(msg)` still works,
// then copy its methods and override success/info to honor SUPPRESSED_MESSAGES.
// Spreading `base` into a plain object (the old shape) dropped the call
// signature, so `toast(msg)` threw "toast is not a function".
export const toast = Object.assign(
  (content, ...rest) => base(content, ...rest),
  base,
  {
    success: filtered(base.success),
    info: filtered(base.info),
  },
);

export default toast;
