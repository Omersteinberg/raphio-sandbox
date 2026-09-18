import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Check, Loader2 } from "lucide-react";
import { extractBrandFromUrl } from "@/services/session";

// What each `missing` key is called in a sentence a user reads.
const LABELS = {
  logo: "logo",
  colors: "colours",
  fonts: "fonts",
  // Not "description": what comes back is a first brief, a running order of what
  // the video should show, and calling it a description sets up the wrong
  // expectation of the text that lands in the box below.
  copy: "starting brief",
  tone: "style",
};

const ORDER = ["logo", "colors", "fonts", "copy", "tone"];

/**
 * Optional accelerator at the top of the intro brief. Paste a website, get the
 * brand and a first brief filled in below.
 *
 * It reports what it could not find as well as what it could, because a silent
 * partial fill reads as a bug: someone who pastes a URL and sees three of five
 * fields populated needs to know the other two were genuinely absent from their
 * site, not dropped on the way.
 *
 * `targetDuration` rides along because the brief that comes back names beats, and
 * how many it may name depends on the length the user has picked.
 */
export default function BrandUrlField({ onApply, targetDuration }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  const run = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setSummary(null);
    try {
      const { found, missing } = await extractBrandFromUrl(url.trim(), { targetDuration });
      onApply(found);
      const missed = Array.isArray(missing) ? missing : [];
      setSummary({
        got: ORDER.filter((k) => !missed.includes(k)).map((k) => LABELS[k]),
        missing: ORDER.filter((k) => missed.includes(k)).map((k) => LABELS[k]),
        // Photos are not applied like the rest of the kit, they open as a popup
        // to pick from, so the line says they exist rather than where they went.
        photos: Array.isArray(found?.photos) ? found.photos.length : 0,
      });
    } catch (e) {
      // Plenty of sites simply refuse the fetch, and flagging that as an error
      // reads as our bug rather than their policy. The reason goes to the
      // console; the user gets the same neutral line as a site we found
      // nothing on, with the form working exactly as before.
      console.warn(
        "[BrandUrlField] brand extraction failed:",
        e?.response?.data?.error || e?.message || e
      );
      setSummary({ got: [], missing: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center rounded-2xl border border-border/60 bg-surface-alt px-3 focus-within:border-[var(--terra)]/50">
        <Globe className="w-4 h-4 text-[#6B5E7B] shrink-0" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run();
            }
          }}
          placeholder="Have a website? Paste it and we will draft your brief"
          aria-label="Your website address"
          disabled={busy}
          className="w-full bg-transparent border-0 outline-none px-2.5 py-3 text-sm text-[#2D2235] placeholder:text-[#A99FB5] min-w-0 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={run}
          disabled={!url.trim() || busy}
          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--terra)] disabled:opacity-40 hover:bg-[var(--terra)]/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Reading your site" /> : "Fetch"}
        </button>
      </div>

      {summary && summary.got.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-[#6B5E7B] mt-2 flex items-start gap-1.5"
        >
          <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
          <span>
            Got your {summary.got.join(", ")}.
            {summary.missing.length
              ? ` We could not find a ${summary.missing.join(" or ")}, so set those below.`
              : " Everything below is editable."}
            {summary.photos > 0
              ? ` We also found ${summary.photos} ${summary.photos === 1 ? "picture" : "pictures"} on your site to pick from.`
              : ""}
          </span>
        </motion.p>
      )}

      {/* Nothing usable came back. Not an error state: plenty of these
          businesses have no website, and the form works exactly as before. */}
      {summary && summary.got.length === 0 && (
        <p className="text-xs text-[#6B5E7B] mt-2">
          We could not find much on that site. Add your logo below and we will take it from there.
          {summary.photos > 0
            ? ` We did find ${summary.photos} ${summary.photos === 1 ? "picture" : "pictures"} on your site to pick from.`
            : ""}
        </p>
      )}
    </div>
  );
}
