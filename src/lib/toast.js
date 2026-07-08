// App-wide toast policy: only failures surface.
//
// Product decision — success/info confirmations were stacking up (e.g. the
// approve -> configure -> generate chain fired "Script approved!",
// "Frame configuration saved!" and "Video generation started!" all at once).
// We now suppress success + info everywhere and let only failures
// (error / warning) through.
//
// This is a thin passthrough over react-toastify's singleton: `error`,
// `warning`, `dismiss`, `update`, `promise`, etc. behave exactly as before;
// `success` and `info` are no-ops that render nothing.
//
// Import this instead of react-toastify anywhere you'd call toast:
//   import { toast } from "@/lib/toast";
//
// To bring a specific confirmation back, either relax the policy here or call
// react-toastify's toast directly at that one site.
import { toast as base } from "react-toastify";

const noop = () => undefined;

export const toast = { ...base, success: noop, info: noop };

export default toast;
