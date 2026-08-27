import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Image as ImageIcon, Wand2, Clapperboard } from "lucide-react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";
import IntroPipelineCreator from "./IntroPipelineCreator";
import PipelineModeTabs from "@/components/session/PipelineModeTabs";
import CreatorHeader from "@/components/session/CreatorHeader";
import PipelineShell from "@/components/session/PipelineShell";
import MaintenanceScreen from "@/components/session/MaintenanceScreen";
import IntroVideoModal from "@/components/IntroVideoModal";
import { useIntroVideo } from "@/hooks/useIntroVideo";
import { INTRO_VIDEO_KEYS } from "@/lib/introVideos";
import { RESUMABLE_MODES } from "@/lib/pipelineMode";
import { MAINTENANCE_MODE } from "@/config";
import { getCreationDefaults, saveCreationDefaults } from "@/lib/preferences";
import { loadPending } from "@/lib/pendingSession";
import { toast } from "@/lib/toast";

// "prompt" is the simplified text-to-video mode; it reuses the image pipeline
// (ImagePipelineCreator) with photos + advanced settings hidden. "intro" is the
// Brand Intro stinger pipeline (IntroPipelineCreator).
// Shared with the resume bounce in useSession/useSessionBase so the two can't drift.
const ENABLED_MODES = RESUMABLE_MODES;

// The always-visible mode toggle. Icons match ModeChooser.jsx's four cards
// (kept as the source of truth there too) so the iconography is identical
// whether someone lands via this toggle or the marketing/legacy chooser.
const MODE_TABS = [
  { id: "prompt", label: "Idea", icon: Sparkles },
  { id: "image", label: "Photos", icon: ImageIcon },
  { id: "references", label: "References", icon: Wand2 },
  { id: "intro", label: "Intro", icon: Clapperboard },
];

export default function Creator() {
  const [searchParams, setSearchParams] = useSearchParams();

  const intro = useIntroVideo(INTRO_VIDEO_KEYS.modeChooser);

  // When resuming a session (?session=&mode=), the session's own pipeline mode is
  // authoritative, otherwise the last-selected mode (localStorage) renders the
  // wrong creator and the resume drops the user on step 0 of the wrong pipeline.
  // Read once at mount; resume always remounts via /videos.
  const resumeMode = searchParams.get("mode");
  const resumeSession = searchParams.get("session");

  const [pipelineMode, setPipelineMode] = useState(() => {
    if (ENABLED_MODES.includes(resumeMode)) return resumeMode;
    const stored = localStorage.getItem("raphio_pipeline_mode");
    return ENABLED_MODES.includes(stored) ? stored : "prompt";
  });

  // User-intent state (not session/generation mechanics) shared between Prompt,
  // Photos, and Reference-Image mode, so it survives switching between them - a
  // prompt/duration/ratio/voice/music/style choice made in one no longer resets
  // when the user picks another. Owned here (above the per-mode creators) so it
  // outlives ImagePipelineCreator's own remount on a Prompt<->Photos switch.
  // Brand Intro is a different component/hook entirely and does not receive this -
  // it manages its own via useIntroSession.
  const [savedDefaults] = useState(getCreationDefaults);
  const [userPrompt, setUserPrompt] = useState("");
  const [style, setStyle] = useState(savedDefaults.style);
  const [targetDuration, setTargetDuration] = useState(savedDefaults.targetDuration);
  const [aspectRatio, setAspectRatio] = useState(savedDefaults.aspectRatio);
  const [voiceId, setVoiceId] = useState(savedDefaults.voiceId);
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(savedDefaults.backgroundMusic);

  // Whether References' merged-run overlay (generating references/script/scenes/
  // video with no manual review in between) is currently on screen. Reported up
  // by ReferencesPipelineCreator via onMergedRunActiveChange - a tab switch while
  // this is true would unmount that component's session state and drop ?session=
  // from the URL in the same batched update, orphaning an in-flight generation
  // with no resume path. Guarded in handleModeChange below.
  const [isMergedRunActive, setIsMergedRunActive] = useState(false);

  // Auto-save last-used choices so the next new video starts from them. Moved up
  // from useSession.js/useSessionBase.js along with the state itself - both hooks
  // used to run this same effect independently; now there is one source of truth.
  useEffect(() => {
    saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic });
  }, [style, targetDuration, aspectRatio, voiceId, backgroundMusic]);

  // One-time restore of a pending draft's prompt after a genuine page-level
  // remount (e.g. returning from the /buy-credits round trip, which unmounts
  // Creator.jsx itself, not just the child pipeline creator). Deliberately
  // mount-only - fires exactly once, never on an in-page mode switch. The
  // per-mode rehydrate effects in ImagePipelineCreator.jsx/
  // ReferencesPipelineCreator.jsx used to do this instead, but they re-fire
  // on every mode-switch remount and were clobbering this lifted state with
  // whatever was last saved under that mode's own pending-draft key. style
  // needs no equivalent here: it's already seeded from savedDefaults above
  // (getCreationDefaults()/localStorage), which the auto-save effect keeps
  // in sync in real time, so it already survives this same remount. Brand
  // Intro manages its own state via useIntroSession and is excluded.
  useEffect(() => {
    if (pipelineMode === "intro") return;
    let cancelled = false;
    loadPending(pipelineMode)
      .then((saved) => {
        if (cancelled || !saved?.userPrompt) return;
        setUserPrompt(saved.userPrompt);
      })
      .catch((err) => console.warn("[Creator] pending-draft rehydrate failed:", err));
    return () => { cancelled = true; };
    // Mount-only by design - see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharedIntentProps = {
    userPrompt, setUserPrompt,
    style, setStyle,
    targetDuration, setTargetDuration,
    aspectRatio, setAspectRatio,
    voiceId, setVoiceId,
    videoModel, setVideoModel,
    backgroundMusic, setBackgroundMusic,
  };

  const handleModeChange = (mode) => {
    const next = ENABLED_MODES.includes(mode) ? mode : "prompt";
    if (next === pipelineMode) return;
    if (isMergedRunActive) {
      toast.info("Hold on - your video is still generating. Switching modes now would lose track of it.");
      return;
    }
    localStorage.setItem("raphio_pipeline_mode", next);
    // Reflect the picked mode in the URL so the selection survives a route
    // change (e.g. visiting /settings and pressing Back), and so it stays a
    // real, shareable/bookmarkable deep link (LandingPage's mode CTAs,
    // WelcomeHero/MyVideosPage resume links, and resumeModeFor's resume
    // correction all read ?mode= directly from the URL).
    setSearchParams({ mode: next }, { replace: true });
    setPipelineMode(next);
  };

  // A bare, undirected `/create` (no ?session=, no valid ?mode=) is the only
  // case the old chooser gate ever actually blocked during maintenance - a
  // deep link or resume already bypassed it. Preserved here so maintenance
  // mode still lets an in-progress or freshly-linked visit through.
  const bypassMaintenance = Boolean(resumeSession) || ENABLED_MODES.includes(resumeMode);
  if (MAINTENANCE_MODE && !bypassMaintenance) {
    return <MaintenanceScreen />;
  }

  // Not passing onBackToChooser to any child on purpose: there is no longer a
  // separate chooser screen to return to (the toggle below replaces it), so
  // each pipeline's own "back to mode selection" affordance - gated on this
  // prop being present - now correctly stays hidden without needing changes
  // to those step components.
  //
  // Split into an Intro branch and a non-Intro branch (rather than one
  // combined ternary) - Brand Intro is a structurally separate component
  // with its own internal step-transition animation, kept entirely apart
  // from Idea/Photos/References here. (A framer-motion AnimatePresence/
  // motion.div height-animation wrapper was tried around the non-Intro
  // branch and reverted: ImagePipelineCreator/ReferencesPipelineCreator's
  // own root divs use h-full, a percentage height, which framer-motion
  // can't reliably auto-measure for a height:0->auto animation - the
  // measurement resolved to 0 and the content went invisible. Revisiting
  // this would need a different technique that doesn't require the
  // wrapped content to be intrinsically sized.)
  const nonIntroPipeline =
    pipelineMode === "references" ? (
      <ReferencesPipelineCreator
        onModeChange={handleModeChange}
        onMergedRunActiveChange={setIsMergedRunActive}
        {...sharedIntentProps}
      />
    ) : (
      // Both "prompt" and "image" render the image pipeline; the mode
      // distinguishes the simplified prompt-only variant (photos + advanced
      // hidden). `key` forces a remount when the user switches between them:
      // without it React keeps the same instance and useSession's own
      // mode-specific local state (photos, frames, bridges - everything NOT
      // lifted to sharedIntentProps above) bleeds across modes. The lifted
      // fields (prompt, style, duration, ratio, voice, music) live in this
      // component instead and correctly survive the remount.
      <ImagePipelineCreator
        key={pipelineMode}
        mode={pipelineMode}
        onModeChange={handleModeChange}
        {...sharedIntentProps}
      />
    );

  return (
    <PipelineShell>
      {/* Header + tab row: rendered once here instead of per-pipeline (each
          mode used to carry its own headline/icon mark, and Brand Intro's own
          version was a different size - that mismatch was the layout "jump"
          on switching tabs). PipelineShell now owns the page background at
          THIS level (the true page root), not one level down inside each
          *PipelineCreator.jsx - it used to be applied there, which left this
          header/tab area with no background of its own, showing the flat
          app-shell color behind it instead of the gradient and creating a
          visible seam right below the tabs. The tabs sit close beneath the
          subtitle (grouped with it) and the card sits close beneath the tabs
          (via ComposerFrame's own reduced top padding) - deliberately
          asymmetric from the larger gap above the headline, so the page
          reads as headline, then a tighter subtitle+tabs+card cluster.
          overflow-x-auto on the tab row is a safety net, not a fix: it
          should fit even the narrowest supported phone widths, but a user
          font-size override or an unusually narrow viewport won't force the
          page itself to scroll horizontally. */}
      <div className="px-2 sm:px-4 pt-[44px] sm:pt-[52px] overflow-x-auto">
        <div className="max-w-4xl mx-auto">
          <CreatorHeader compact={isMergedRunActive} />
          {/* Tabs hidden during the merged run: this is the visual counterpart
              to handleModeChange's guard above, not a substitute for it - the
              guard is what actually stops the switch, this just stops
              offering a control that would be blocked anyway. */}
          {!isMergedRunActive && (
            <div className="flex justify-center mt-4 sm:mt-6">
              <PipelineModeTabs options={MODE_TABS} value={pipelineMode} onChange={handleModeChange} />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {pipelineMode === "intro" ? (
          <IntroPipelineCreator onModeChange={handleModeChange} />
        ) : (
          nonIntroPipeline
        )}
      </div>

      {/* First-visit "Getting started" video - previously shown only on the
          removed chooser screen, now unconditional so it still triggers once
          on a user's first-ever visit to /create regardless of which mode
          they land in. It already self-gates on the persisted
          introVideosSeen "modeChooser" flag. No standalone HelpFab paired
          with it here (unlike the old chooser screen): every pipeline's own
          composer step already renders its own contextual HelpFab
          (PromptStep, IntroBriefStep), fixed to the same bottom-right
          corner - a second one here would render on top of it. */}
      <IntroVideoModal
        open={intro.open}
        src={intro.src}
        title={intro.title}
        onClose={intro.close}
        onDismissWithoutSeen={intro.dismissWithoutSeen}
      />
    </PipelineShell>
  );
}
