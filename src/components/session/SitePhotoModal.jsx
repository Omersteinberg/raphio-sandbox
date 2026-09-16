import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSitePhoto } from "@/services/session";
import { dataUrlToFile } from "@/lib/dataUrlToFile";

/**
 * The pictures a website import found, offered as a grid to tick.
 *
 * Nothing is applied on its own. An import runs on a URL alone, and the biggest
 * picture on a page is as often a stock hero as it is the business, so which
 * ones are worth using stays the user's call. A picked photo is fetched at full
 * size and handed back as a File, the same thing the file input produces, so
 * everything downstream (naming, @mentions, off-ratio, upload) is unchanged.
 *
 * `photos` is only ever the ones not already taken, so the caller owns that list
 * and closing the modal cannot resurrect a picture already sitting in the brief.
 */
export default function SitePhotoModal({ photos, remaining, onAdd, onClose }) {
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const toggle = (url) => {
    setPicked((cur) => {
      if (cur.includes(url)) return cur.filter((u) => u !== url);
      // Picking more than there is room for would silently drop the overflow at
      // the point of adding, so the cap is enforced where it can be seen.
      if (cur.length >= remaining) return cur;
      return [...cur, url];
    });
  };

  const add = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    setFailed(0);
    const settled = await Promise.all(
      picked.map(async (url, i) => {
        try {
          const { dataUrl } = await fetchSitePhoto(url);
          return { url, file: dataUrlToFile(dataUrl, `website-photo-${i + 1}.jpg`) };
        } catch (e) {
          // One picture that will not come down is not a failed import. It is
          // reported as a count below, with the rest added as normal.
          console.warn(
            "[SitePhotoModal] could not fetch photo:",
            e?.response?.data?.error || e?.message || e
          );
          return { url, file: null };
        }
      })
    );

    // Only what actually arrived is handed over and marked taken. A picture that
    // failed stays on offer, because a host that refused once regularly answers
    // on a retry.
    const added = settled.filter((s) => s.file);
    if (added.length) onAdd(added.map((s) => s.file), added.map((s) => s.url));
    const lost = picked.length - added.length;
    setPicked([]);
    setBusy(false);
    setFailed(lost);
    if (!lost) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => { if (!busy) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-label="Pictures from your website"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-alt rounded-2xl border border-border/40 p-5 w-full max-w-3xl"
        style={{ boxShadow: "0 8px 24px rgba(193,68,14,0.16), 0 2px 8px rgba(193,68,14,0.10)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-base font-bold text-[#2D2235]">Pictures from your website</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-muted hover:text-[#2D2235] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-ink-muted mb-4">
          {failed > 0
            ? `${failed === 1 ? "That picture" : "Those pictures"} would not download, still there to try again.`
            : `We found ${photos.length}. Tap the ones worth using, room for ${remaining}.`}
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[56vh] overflow-y-auto pr-1">
          {photos.map((photo) => {
            const on = picked.includes(photo.sourceUrl);
            return (
              <button
                key={photo.sourceUrl}
                type="button"
                onClick={() => toggle(photo.sourceUrl)}
                disabled={busy}
                aria-pressed={on}
                aria-label={on ? "Picked, tap to unpick" : "Pick this picture"}
                className="relative aspect-square rounded-xl overflow-hidden border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 disabled:opacity-60"
                style={{ borderColor: on ? "var(--terra)" : "transparent" }}
              >
                <img
                  src={photo.thumbDataUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ opacity: on ? 1 : 0.85 }}
                />
                {on && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--terra)] text-white flex items-center justify-center shadow">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} disabled={busy} className="flex-1">
            Not now
          </Button>
          <Button onClick={add} disabled={!picked.length || busy} className="flex-1">
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-label="Adding your pictures" />
            ) : picked.length ? (
              `Add ${picked.length}`
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
