import { motion } from "framer-motion";
import { Sparkles, Send, Check, Mic, Music, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VoiceSelector from "./VoiceSelector";

const GRADIENT = "var(--gradient-brand)";

// Scene templates + their editable fields. Mirrors src/prompts/introPrompt.js and
// the Remotion scene components. Field `type`: text (default), num, list (string[]),
// numlist (number[]), or pairs (object[] with `cols`). Product-photo scenes
// (PRODUCT_*) are edited elsewhere, so they are intentionally not in this picker.
const SCENE_TYPES = [
  "LOGO_INTRO", "STATEMENT", "TYPOGRAPHY", "STAT", "BRAND_CARD", "CTA",
  "CARD_GRID", "PHONE_MOCKUP", "SEARCH_BAR", "DASHBOARD",
  "METRIC_GRID", "GAUGE", "BAR_CHART", "FEATURE_LIST", "WORD_ROLLER", "LOGO_WALL",
  "CODE_WINDOW", "NOTIFICATION", "QUOTE", "COMPARISON", "CURSOR_DEMO",
];
const SCENE_LABELS = {
  LOGO_INTRO: "Logo intro",
  STATEMENT: "Statement",
  TYPOGRAPHY: "Typography",
  STAT: "Stat card",
  BRAND_CARD: "Brand card",
  CTA: "Call to action",
  CARD_GRID: "Card grid",
  PHONE_MOCKUP: "Phone mockup",
  SEARCH_BAR: "Search bar",
  DASHBOARD: "Dashboard",
  METRIC_GRID: "Metric grid",
  GAUGE: "Gauge",
  BAR_CHART: "Bar chart",
  FEATURE_LIST: "Feature list",
  WORD_ROLLER: "Word roller",
  LOGO_WALL: "Logo wall",
  CODE_WINDOW: "Code window",
  NOTIFICATION: "Notifications",
  QUOTE: "Testimonial",
  COMPARISON: "Comparison",
  CURSOR_DEMO: "Cursor demo",
};
const SCENE_FIELDS = {
  LOGO_INTRO: [{ key: "title", label: "Title", ph: "Brand name" }, { key: "pill", label: "Pill", ph: "Now in beta" }],
  STATEMENT: [{ key: "lines", label: "Lines", type: "list" }],
  TYPOGRAPHY: [{ key: "headline", label: "Word", ph: "Effortless" }, { key: "effectLabel", label: "Effect label", ph: "Effect: Motion" }],
  STAT: [
    { key: "label", label: "Label", ph: "Total growth" },
    { key: "value", label: "Value", ph: "99%" },
    { key: "delta", label: "Delta", ph: "+24%" },
    { key: "sub", label: "Note", ph: "this month" },
    { key: "badge", label: "Badge", ph: "Live" },
  ],
  BRAND_CARD: [{ key: "title", label: "Title", ph: "On brand, every time" }, { key: "footer", label: "Footer", ph: "Auto-styled" }],
  CTA: [{ key: "tagline", label: "Tagline", ph: "Make it move." }, { key: "url", label: "URL", ph: "raphio.ai" }],
  CARD_GRID: [{ key: "title", label: "Title", ph: "Your brand kit" }, { key: "cards", label: "Cards", type: "list" }],
  PHONE_MOCKUP: [{ key: "title", label: "Title", ph: "System Overview" }, { key: "rows", label: "Rows", type: "list" }, { key: "caption", label: "Caption", ph: "optional" }],
  SEARCH_BAR: [{ key: "query", label: "Query", ph: "brand guidelines" }, { key: "caption", label: "Caption", ph: "Find anything, instantly" }],
  DASHBOARD: [
    { key: "title", label: "Title", ph: "Brand OS" },
    { key: "metric", label: "Metric", ph: "94%" },
    { key: "metricLabel", label: "Metric label", ph: "Brand Health" },
    { key: "tiles", label: "Tiles", type: "list" },
  ],
  METRIC_GRID: [{ key: "metrics", label: "Metrics", type: "pairs", cols: [{ k: "value", ph: "10k" }, { k: "label", ph: "Users" }] }],
  GAUGE: [{ key: "value", label: "Value", ph: "94%" }, { key: "label", label: "Label", ph: "Brand Health" }],
  BAR_CHART: [{ key: "values", label: "Values", type: "numlist" }, { key: "labels", label: "Labels", type: "list" }, { key: "caption", label: "Caption", ph: "Growth every month" }],
  FEATURE_LIST: [{ key: "title", label: "Title", ph: "Everything included" }, { key: "items", label: "Items", type: "list" }],
  WORD_ROLLER: [{ key: "prefix", label: "Prefix", ph: "Built for" }, { key: "words", label: "Words", type: "list" }, { key: "suffix", label: "Suffix", ph: "optional" }],
  LOGO_WALL: [{ key: "title", label: "Title", ph: "Connected agents" }, { key: "labels", label: "Labels", type: "list" }],
  CODE_WINDOW: [{ key: "filename", label: "File", ph: "app.ts" }, { key: "lines", label: "Code", type: "list" }, { key: "caption", label: "Caption", ph: "optional" }],
  NOTIFICATION: [{ key: "items", label: "Items", type: "list" }, { key: "caption", label: "Caption", ph: "optional" }],
  QUOTE: [
    { key: "quote", label: "Quote", ph: "It changed how our team ships." },
    { key: "author", label: "Author", ph: "Dana Lee" },
    { key: "role", label: "Role", ph: "Head of Brand" },
    { key: "stars", label: "Stars", type: "num", ph: "5" },
  ],
  COMPARISON: [
    { key: "beforeLabel", label: "Before", ph: "Old way" },
    { key: "before", label: "Before items", type: "list" },
    { key: "afterLabel", label: "After", ph: "With us" },
    { key: "after", label: "After items", type: "list" },
  ],
  CURSOR_DEMO: [{ key: "target", label: "Button", ph: "Generate" }, { key: "result", label: "Result", ph: "Done in 4s" }, { key: "caption", label: "Caption", ph: "One click to publish" }],
};
const DEFAULT_SCENE = { type: "STATEMENT", lines: ["New line"] };

export default function IntroScriptStep({
  introScript,
  updateScriptField,
  voiceId,
  setVoiceId,
  editRequest,
  setEditRequest,
  editScriptWithAI,
  regenerateScript,
  approveAndGenerate,
  loading,
}) {
  const scenes = introScript?.scenes || [];
  const hasNarration = (introScript?.narration || "").trim().length > 0;
  const estSeconds = Math.max(10, Math.round(scenes.length * 2.5));

  const setScene = (i, patch) => updateScriptField("scenes", scenes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const setSceneType = (i, type) => setScene(i, { type });
  const addScene = () => updateScriptField("scenes", [...scenes, { ...DEFAULT_SCENE }]);
  const removeScene = (i) => updateScriptField("scenes", scenes.filter((_, idx) => idx !== i));

  // Generic array-field editors, keyed by field name so every list/number/pair
  // field (lines, cards, rows, items, values, metrics, …) reuses one code path.
  const arr = (s, key) => (Array.isArray(s?.[key]) ? s[key] : []);
  const setItem = (i, key, li, value) => {
    const next = [...arr(scenes[i], key)];
    next[li] = value;
    setScene(i, { [key]: next });
  };
  const addItem = (i, key, empty) => setScene(i, { [key]: [...arr(scenes[i], key), empty] });
  const removeItem = (i, key, li) => setScene(i, { [key]: arr(scenes[i], key).filter((_, idx) => idx !== li) });
  const setPair = (i, key, pi, patch) => {
    const next = [...arr(scenes[i], key)];
    next[pi] = { ...next[pi], ...patch };
    setScene(i, { [key]: next });
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Left - editable scene plan */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:border-r border-border overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">{introScript?.businessName || "Brand Intro"} Stinger</h2>
            <p className="text-sm text-ink-muted">{scenes.length} scenes • ~{estSeconds}s</p>
          </div>
          <Button onClick={approveAndGenerate} disabled={loading} className="text-white border-0" style={{ background: GRADIENT }}>
            {loading ? "Working…" : (<span className="flex items-center gap-2"><Check className="w-4 h-4" /> Approve &amp; Generate</span>)}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Brand name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 block">Brand name</label>
            <Input value={introScript?.businessName || ""} onChange={(e) => updateScriptField("businessName", e.target.value)} />
          </div>

          {/* Scenes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-muted">Scenes</label>
              <button onClick={addScene} className="text-xs font-bold text-[var(--terra)] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add scene</button>
            </div>
            <div className="space-y-2.5">
              {scenes.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border p-3 space-y-2.5 bg-surface">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-terra/10 text-[var(--terra)] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <select
                        value={s.type}
                        onChange={(e) => setSceneType(i, e.target.value)}
                        className="text-xs font-bold text-ink bg-surface-alt border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-terra/40"
                      >
                        {SCENE_TYPES.map((t) => <option key={t} value={t}>{SCENE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <button onClick={() => removeScene(i)} className="text-ink-muted hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>

                  {(SCENE_FIELDS[s.type] || []).map((f) => {
                    if (f.type === "list" || f.type === "numlist") {
                      const isNum = f.type === "numlist";
                      return (
                        <div key={f.key} className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{f.label}</span>
                          {arr(s, f.key).map((item, li) => (
                            <div key={li} className="flex items-center gap-2">
                              <Input
                                type={isNum ? "number" : "text"}
                                value={item ?? ""}
                                onChange={(e) => setItem(i, f.key, li, isNum ? Number(e.target.value) : e.target.value)}
                                placeholder={isNum ? "0" : f.label}
                              />
                              <button onClick={() => removeItem(i, f.key, li)} className="text-ink-muted hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          <button onClick={() => addItem(i, f.key, isNum ? 0 : "")} className="text-xs font-bold text-[var(--terra)] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                      );
                    }
                    if (f.type === "pairs") {
                      return (
                        <div key={f.key} className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{f.label}</span>
                          {arr(s, f.key).map((item, pi) => (
                            <div key={pi} className="flex items-center gap-2">
                              {f.cols.map((c) => (
                                <Input key={c.k} value={item?.[c.k] || ""} onChange={(e) => setPair(i, f.key, pi, { [c.k]: e.target.value })} placeholder={c.ph} />
                              ))}
                              <button onClick={() => removeItem(i, f.key, pi)} className="text-ink-muted hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          <button onClick={() => addItem(i, f.key, Object.fromEntries(f.cols.map((c) => [c.k, ""])))} className="text-xs font-bold text-[var(--terra)] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                      );
                    }
                    return (
                      <div key={f.key} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted w-16 shrink-0">{f.label}</span>
                        <Input
                          type={f.type === "num" ? "number" : "text"}
                          value={s[f.key] ?? ""}
                          onChange={(e) => setScene(i, { [f.key]: f.type === "num" ? Number(e.target.value) : e.target.value })}
                          placeholder={f.ph}
                        />
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Narration <span className="normal-case font-medium tracking-normal text-ink-muted">(optional, leave empty for music only)</span></label>
            <Textarea rows={2} placeholder="A short spoken line…" value={introScript?.narration || ""} onChange={(e) => updateScriptField("narration", e.target.value)} />
          </div>

          {hasNarration && (
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2 block">Narration voice</label>
              <VoiceSelector value={voiceId} onChange={setVoiceId} />
            </div>
          )}

          {/* Music prompt */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 flex items-center gap-1"><Music className="w-3.5 h-3.5" /> Background music</label>
            <Input value={introScript?.musicPrompt || ""} onChange={(e) => updateScriptField("musicPrompt", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Right - AI editor */}
      <div className="w-full lg:w-80 flex flex-col bg-surface-alt p-4 md:p-6">
        <h3 className="font-semibold text-ink mb-4">AI Script Editor</h3>
        <p className="text-sm text-ink-muted mb-4">Describe a change and AI will redesign the scene plan.</p>
        <Textarea
          value={editRequest}
          onChange={(e) => setEditRequest(e.target.value)}
          placeholder="e.g., make it punchier, add a stat about happy customers, end with a stronger CTA…"
          className="flex-1 min-h-[120px] bg-white"
        />
        <Button onClick={editScriptWithAI} disabled={!editRequest.trim() || loading} className="mt-4 text-white border-0" style={{ background: GRADIENT }}>
          <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Apply Changes</span>
        </Button>
        <Button onClick={() => regenerateScript()} disabled={loading} variant="outline" className="mt-2">
          <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Regenerate</span>
        </Button>
        <div className="mt-6 p-3 bg-terra/10 rounded-lg border border-terra/30">
          <p className="text-xs text-terra"><strong>Tip:</strong> pick a scene type from the dropdown, edit its text, then Approve &amp; Generate.</p>
        </div>
      </div>
    </div>
  );
}
