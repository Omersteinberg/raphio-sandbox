import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, Plus } from "lucide-react";

// Mirrors the token set already used across TermsPage / PrivacyPolicyPage /
// SettingsPage / ContactForm so this page family matches wherever it lands.
const C = {
  ink: "var(--ink-warm)", // #1C1917
  muted: "#6B5E7B",
  terra: "#C1440E",
  border: "#EFDCD2", // clay mist
  surface: "#FFFAF7",
};

const EASE = [0.16, 1, 0.3, 1];

// Content verbatim from the original FAQ - presentation only has changed.
// Keys/slugs are the anchor ids the topic grid in SupportPage.jsx links to.
export const FAQ_DATA = [
  {
    key: "getting-started",
    title: "Getting Started",
    items: [
      {
        q: "What's the difference between the four modes?",
        a: [
          "Idea — describe your video in text and we generate everything. No photos needed.",
          "Photos — upload your own photos and we animate them into a video around your prompt.",
          "References — define recurring characters, settings, logos or products so they stay consistent across every scene. Best for anything with a repeating subject.",
          "Brand Intro — upload a logo and describe your business to get a short branded intro sequence. This one's different from the other three: it's a motion-graphics stinger, not a narrative video.",
        ],
      },
      {
        q: "What photos can I upload?",
        a: "JPEG and PNG only, up to 10MB each, maximum 10 photos per video. WebP isn't supported. Your photos don't need to match your video's aspect ratio — if they don't, we'll offer to extend them automatically to fill the frame.",
      },
      {
        q: "Do I need to crop my photos first?",
        a: "No. If a photo doesn't match your chosen 16:9 or 9:16 frame, you'll see a “Needs framing” badge and can turn on automatic extension. We generate the missing edges for you. Screenshots and logos are never extended, since extending text tends to produce poor results.",
      },
    ],
  },
  {
    key: "credits-and-billing",
    title: "Credits & Billing",
    items: [
      {
        q: "How much does a video cost?",
        a: "Credits are based on video length, not the number of clips. 15 seconds = 3 credits, 30 seconds = 6, 45 seconds = 9, 60 seconds = 12. Brand Intro is a flat 3 credits regardless of length. Regenerating a single clip in the editor costs 1 credit.",
      },
      {
        q: "How do I get credits?",
        a: "New accounts start with 3 free credits. You can buy more (6 credits for $29, 12 for $55, 24 for $99), earn 3 bonus credits by sharing a finished video (once per video), or redeem a promo code.",
      },
      {
        q: "Do credits expire?",
        a: "No. Once credits are in your account they stay there, however you got them.",
      },
      {
        q: "What happens to my credits if a generation fails?",
        a: "You're charged once when you start a video. If generation fails, retrying is free — you won't be charged again for that video.",
      },
    ],
  },
  {
    key: "troubleshooting",
    title: "Troubleshooting",
    items: [
      {
        q: "My generation failed. What should I do?",
        a: "Click Regenerate. Retries don't cost extra credits. If it keeps failing with the same input, try simplifying your prompt or reducing the number of photos.",
      },
      {
        q: "I saw “We're at Capacity.”",
        a: "That means too many videos were generating at once. Wait a few minutes and try again — nothing was charged.",
      },
      {
        q: "Generation is taking a long time.",
        a: "Longer videos take longer to generate. If it's been over an hour with no progress, refresh the page — your progress is saved.",
      },
      {
        q: "My photo won't upload.",
        a: "Check that it's a JPEG or PNG (not WebP or HEIC) and under 10MB.",
      },
      {
        q: "Can I generate multiple videos at once?",
        a: "You can have up to 2 videos generating at a time per account.",
      },
    ],
  },
];

function matchesQuery(item, query) {
  if (!query) return true;
  const haystack = (item.q + " " + (Array.isArray(item.a) ? item.a.join(" ") : item.a)).toLowerCase();
  return haystack.includes(query);
}

function QuestionRow({ id, question, answer, isOpen, forceOpen, onToggle }) {
  const paragraphs = Array.isArray(answer) ? answer : [answer];
  const open = forceOpen || isOpen;

  return (
    <div className="flex items-stretch gap-3.5">
      <div
        className="flex-shrink-0"
        style={{ width: 3, borderRadius: 2, background: open ? "var(--gradient-brand)" : "rgba(193,68,14,0.16)", transition: "background 200ms ease-out" }}
      />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={open}
          className="faq-question-row w-full flex items-center justify-between gap-4 text-left"
          style={{ padding: "14px 0" }}
        >
          <span className="font-figtree font-semibold" style={{ fontSize: 15.5, color: C.ink, lineHeight: 1.4 }}>
            {question}
          </span>
          <Plus
            className="faq-toggle-icon flex-shrink-0"
            style={{
              width: 18,
              height: 18,
              color: open ? C.terra : C.muted,
              transform: open ? "rotate(45deg)" : "rotate(0deg)",
            }}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ paddingBottom: 16, paddingRight: 28 }}>
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: C.muted, marginTop: i > 0 ? 10 : 0 }}>
                    {p}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SegmentedTabs({ categories, active, onChange }) {
  return (
    <div
      className="scrollbar-hidden flex items-center gap-1 overflow-x-auto"
      style={{ background: "rgba(193,68,14,0.06)", borderRadius: 9999, padding: 4 }}
      role="tablist"
      aria-label="FAQ category"
    >
      {categories.map((cat) => {
        const isActive = active === cat.key;
        return (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat.key)}
            className="relative flex-shrink-0 whitespace-nowrap inline-flex items-center justify-center"
            style={{ height: 44, padding: "0 16px", borderRadius: 9999 }}
          >
            {isActive && (
              <motion.span
                layoutId="faq-tab-thumb"
                className="absolute inset-0"
                style={{ borderRadius: 9999, background: "var(--gradient-brand)", boxShadow: "0 2px 10px rgba(193,68,14,0.30)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span
              className="relative font-figtree font-semibold"
              style={{ fontSize: 13, color: isActive ? "#fff" : C.muted, transition: "color 160ms ease-out" }}
            >
              {cat.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function FAQSection({ query = "", active, onActiveChange }) {
  const [openId, setOpenId] = useState(null);
  const reduceMotion = useReducedMotion();

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const handleToggle = (id) => setOpenId((current) => (current === id ? null : id));

  const withIds = (cat) => ({ ...cat, items: cat.items.map((item, qi) => ({ ...item, id: `${cat.key}-${qi}` })) });

  const groups = isSearching
    ? FAQ_DATA.map((cat) => ({ ...withIds(cat), items: withIds(cat).items.filter((item) => matchesQuery(item, normalizedQuery)) })).filter((cat) => cat.items.length > 0)
    : FAQ_DATA.filter((cat) => cat.key === active).map(withIds);

  const hasResults = groups.length > 0;

  return (
    <div id="faq-list" className="rounded-2xl p-6 sm:p-7 h-full flex flex-col" style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(92,16,0,0.06)", scrollMarginTop: 24 }}>
      <style>{`
        .faq-question-row { transition: opacity 160ms ease-out; }
        .faq-question-row:active { opacity: 0.7; }
        .faq-toggle-icon { transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), color 160ms ease-out; }
      `}</style>

      <h2 className="font-figtree font-bold" style={{ fontSize: 20, color: C.ink }}>
        Top questions
      </h2>

      <div className="mt-5">
        {isSearching ? (
          <p className="font-figtree font-semibold" style={{ fontSize: 14, color: C.ink }}>
            Search results for “{query.trim()}”
          </p>
        ) : (
          <SegmentedTabs categories={FAQ_DATA} active={active} onChange={onActiveChange} />
        )}
      </div>

      {/* aria-live lives on this stable wrapper, not the AnimatePresence child
          below - that child is remounted (its `key` changes) on every tab
          switch or search update for the exit/enter animation, and a live
          region has to stay mounted itself for screen readers to announce
          the content change inside it. */}
      <div aria-live="polite" className="flex-1 mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={isSearching ? `search-${normalizedQuery}` : active}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {!hasResults ? (
              <div className="text-center py-10">
                <Search className="mx-auto mb-3" style={{ width: 24, height: 24, color: C.muted, opacity: 0.6 }} />
                <p className="font-figtree font-semibold" style={{ fontSize: 15, color: C.ink }}>
                  No results for “{query.trim()}”
                </p>
                <p className="text-sm mt-1.5" style={{ color: C.muted }}>
                  Try different words, or use the contact form below.
                </p>
              </div>
            ) : (
              groups.map((cat, ci) => (
                <div key={cat.key} className={ci > 0 ? "mt-7" : ""}>
                  {isSearching && (
                    <h3
                      className="font-figtree font-bold"
                      style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, marginBottom: 2 }}
                    >
                      {cat.title}
                    </h3>
                  )}
                  <div className="divide-y" style={{ borderColor: C.border }}>
                    {cat.items.map((item) => (
                      <QuestionRow
                        key={item.id}
                        id={item.id}
                        question={item.q}
                        answer={item.a}
                        isOpen={openId === item.id}
                        forceOpen={isSearching}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
