import { motion } from "framer-motion";
import { Sparkles, Send, Check, Mic, Music, Film, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VoiceSelector from "./VoiceSelector";

const GRADIENT = "var(--gradient-brand)";

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
  const vignettes = introScript?.vignettes || [];
  const hasNarration = (introScript?.narration || "").trim().length > 0;

  const setVignette = (i, value) => {
    const next = [...vignettes];
    next[i] = value;
    updateScriptField("vignettes", next);
  };
  const addVignette = () => updateScriptField("vignettes", [...vignettes, ""]);
  const removeVignette = (i) => updateScriptField("vignettes", vignettes.filter((_, idx) => idx !== i));

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Left — editable script */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:border-r border-border overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">{introScript?.businessName || "Brand Intro"} Script</h2>
            <p className="text-sm text-ink-muted">{vignettes.length} montage beats • ~8s intro</p>
          </div>
          <Button onClick={approveAndGenerate} disabled={loading} className="text-white border-0" style={{ background: GRADIENT }}>
            {loading ? "Working…" : (<span className="flex items-center gap-2"><Check className="w-4 h-4" /> Approve &amp; Generate</span>)}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Business name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 block">Brand name</label>
            <Input value={introScript?.businessName || ""} onChange={(e) => updateScriptField("businessName", e.target.value)} />
          </div>

          {/* Vignettes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-widest text-ink-muted flex items-center gap-1"><Film className="w-3.5 h-3.5" /> Montage beats</label>
              <button onClick={addVignette} className="text-xs font-bold text-[var(--terra)] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            <div className="space-y-2">
              {vignettes.map((v, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-terra/10 text-[var(--terra)] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <Input value={v} onChange={(e) => setVignette(i, e.target.value)} className="flex-1" />
                  <button onClick={() => removeVignette(i)} className="text-ink-muted hover:text-red-500"><X className="w-4 h-4" /></button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Motion prompt */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 block">Motion prompt</label>
            <Textarea rows={4} value={introScript?.motionPrompt || ""} onChange={(e) => updateScriptField("motionPrompt", e.target.value)} />
          </div>

          {/* Narration */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Narration <span className="normal-case font-medium tracking-normal text-ink-muted">(optional, leave empty for music only)</span></label>
            <Textarea rows={2} placeholder="A short spoken line…" value={introScript?.narration || ""} onChange={(e) => updateScriptField("narration", e.target.value)} />
          </div>

          {/* Voice: only meaningful when there is narration */}
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

      {/* Right — AI editor */}
      <div className="w-full lg:w-80 flex flex-col bg-surface-alt p-4 md:p-6">
        <h3 className="font-semibold text-ink mb-4">AI Script Editor</h3>
        <p className="text-sm text-ink-muted mb-4">Describe a change and AI will revise the whole script.</p>
        <Textarea
          value={editRequest}
          onChange={(e) => setEditRequest(e.target.value)}
          placeholder="e.g., make it more playful, add a beat showing happy customers…"
          className="flex-1 min-h-[120px] bg-white"
        />
        <Button onClick={editScriptWithAI} disabled={!editRequest.trim() || loading} className="mt-4 text-white border-0" style={{ background: GRADIENT }}>
          <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Apply Changes</span>
        </Button>
        <Button onClick={() => regenerateScript()} disabled={loading} variant="outline" className="mt-2">
          <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Regenerate</span>
        </Button>
        <div className="mt-6 p-3 bg-terra/10 rounded-lg border border-terra/30">
          <p className="text-xs text-terra"><strong>Tip:</strong> edit any field directly, then Approve &amp; Generate.</p>
        </div>
      </div>
    </div>
  );
}
