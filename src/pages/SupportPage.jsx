import { useEffect, useRef, useState } from "react";
import { Search, ArrowRight, Rocket, CreditCard, Wrench } from "lucide-react";
import ContactForm from "@/components/support/ContactForm.jsx";
import CrispChat from "@/components/support/CrispChat.jsx";
import FAQSection, { FAQ_DATA } from "@/components/support/FAQSection.jsx";
import ChatStatusBar from "@/components/support/ChatStatusBar.jsx";

const C = {
  bg: "#F5F0EB",
  ink: "var(--ink-warm)",
  terra: "#C1440E",
  muted: "#7A6A62",
  border: "#EFDCD2",
  surface: "#FFFAF7",
};

const TOPIC_META = {
  "getting-started": { icon: Rocket, blurb: "Modes, photos, and framing basics" },
  "credits-and-billing": { icon: CreditCard, blurb: "Pricing, credits, and payment questions" },
  troubleshooting: { icon: Wrench, blurb: "Fixes for failed or stuck generations" },
};

const TOPICS = FAQ_DATA.map((cat) => ({
  key: cat.key,
  title: cat.title,
  count: cat.items.length,
  ...TOPIC_META[cat.key],
}));

export default function SupportPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FAQ_DATA[0].key);
  const wasEmpty = useRef(true);

  const scrollToFaq = () => document.getElementById("faq-list")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Reveal the filtered results the moment a search actually starts (empty
  // -> non-empty transition only, not on every keystroke) - otherwise the
  // live-filtered "Top questions" card sits below the fold, unseen, and
  // typing reads as if the search bar does nothing.
  useEffect(() => {
    const isEmpty = query.trim().length === 0;
    if (wasEmpty.current && !isEmpty) scrollToFaq();
    wasEmpty.current = isEmpty;
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    scrollToFaq();
  };

  const handleTopicClick = (e, key) => {
    e.preventDefault();
    setActiveCategory(key);
    scrollToFaq();
  };

  return (
    <div className="h-full w-full overflow-y-auto font-figtree" style={{ background: C.bg }}>
      <CrispChat />
      <style>{`
        html { scroll-behavior: smooth; }

        .support-search-input { transition: border-color 160ms ease-out, box-shadow 160ms ease-out; }
        .support-search-input:focus { outline: none; border-color: #C1440E; box-shadow: 0 0 0 4px rgba(193,68,14,0.10); }
        .support-search-input::placeholder { color: #7A6A62; }

        .support-search-btn { transition: transform 160ms ease-out, box-shadow 160ms ease-out; }
        .support-search-btn:hover { transform: scale(1.03); box-shadow: 0 4px 14px rgba(193,68,14,0.35); }
        .support-search-btn:active { transform: scale(0.97); }

        .topic-tile { transition: transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out; }
        .topic-tile:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(92,16,0,0.14); border-color: rgba(193,68,14,0.28); }
        .topic-tile:active { transform: translateY(-1px) scale(0.99); }
      `}</style>

      {/* Hero: same cream background as the rest of the page (no seam) - a
          small soft terracotta-tinted accent stands in for "hero presence"
          instead of a background wash, keeping terracotta an accent rather
          than a fill (matches PipelineShell/loading screens using a barely-
          there wash, never a saturated one, for this kind of surface).
          Content sits in a flex row (not a hard-locked single centered
          column) so an image/illustration can be dropped in as a second flex
          child later, sitting beside the text on lg+, without restructuring
          this. */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute rounded-full"
          style={{ width: 240, height: 240, top: -40, right: 20, background: "radial-gradient(circle, rgba(193,68,14,0.08) 0%, rgba(193,68,14,0) 70%)", filter: "blur(30px)" }}
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-8 pb-20 sm:pb-24 flex flex-col lg:flex-row items-center justify-center gap-10">
          <div className="w-full max-w-2xl text-center">
            <h1 className="font-figtree font-extrabold" style={{ fontSize: "clamp(30px,4.5vw,42px)", color: C.ink, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              How can we <span style={{ color: C.terra }}>help</span> you today?
            </h1>
            <p className="text-base mt-3" style={{ color: C.muted }}>
              Search our help center, or send us a message below.
            </p>

            <form onSubmit={handleSearchSubmit} className="relative mt-7 max-w-xl mx-auto">
              <Search
                className="absolute pointer-events-none"
                style={{ width: 18, height: 18, left: 18, top: "50%", transform: "translateY(-50%)", color: C.terra }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for help topics..."
                aria-label="Search the FAQ"
                className="support-search-input w-full font-figtree"
                style={{ height: 56, borderRadius: 9999, border: `1px solid ${C.border}`, background: "#FFFFFF", padding: "0 108px 0 46px", fontSize: 16, color: C.ink }}
              />
              <button
                type="submit"
                className="support-search-btn absolute font-figtree font-bold text-sm"
                style={{ right: 5, top: 5, bottom: 5, padding: "0 22px", borderRadius: 9999, border: "none", background: C.terra, color: "#fff" }}
              >
                Search
              </button>
            </form>
          </div>
          {/* Future image/illustration slot: add a second child here, e.g.
              <div className="hidden lg:block w-full max-w-sm">...</div> -
              this flex row already accommodates it side-by-side. */}
        </div>
      </div>

      {/* Topic grid: overlaps the hero's bottom edge slightly for visual
          rhythm - hero and page share the same background now, so there's
          no seam to bridge, this is purely a layout/spacing choice. */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 -mt-10 sm:-mt-12">
        <h2 className="sr-only">Browse by topic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TOPICS.map(({ key, title, blurb, count, icon: Icon }) => (
            <a
              key={key}
              href={`#faq-list`}
              onClick={(e) => handleTopicClick(e, key)}
              className="topic-tile block rounded-2xl p-5"
              style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 10px 28px rgba(92,16,0,0.10)" }}
            >
              <div className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: "var(--gradient-brand)" }}>
                <Icon style={{ width: 19, height: 19, color: "#fff" }} strokeWidth={2} />
              </div>
              <h3 className="font-figtree font-bold mt-3.5" style={{ fontSize: 15, color: C.ink }}>
                {title}
              </h3>
              <p className="text-sm mt-1" style={{ color: C.muted, lineHeight: 1.4 }}>
                {blurb}
              </p>
              <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold" style={{ color: C.terra }}>
                {count} article{count === 1 ? "" : "s"}
                <ArrowRight style={{ width: 12, height: 12 }} />
              </span>
            </a>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* Split panel: two equal-weight parallel paths, self-serve on the
            left, talk-to-us on the right. Each column is one card that owns
            its own heading, so both sit at matched height via items-stretch
            (each card is h-full flex flex-col internally - see FAQSection /
            ContactForm) - a no-op on the mobile single-column stack below. */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <FAQSection query={query} active={activeCategory} onActiveChange={setActiveCategory} />
          <ContactForm />
        </div>

        {/* Chat status bar: a trust strip, not a second chat implementation -
            it only ever calls CrispChat's own public open() API. */}
        <ChatStatusBar />
      </main>
    </div>
  );
}
