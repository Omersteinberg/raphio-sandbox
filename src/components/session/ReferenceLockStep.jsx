import { useState } from 'react';
import { motion } from 'framer-motion';
import HelpFab from '@/components/ui/HelpFab';
import { useStepTour } from '@/lib/useStepTour';
import { TOUR_KEYS } from '@/lib/tourState';
import { startReferenceLockTour } from '@/lib/referencesTour';
import { useAuth } from '@/hooks/useAuth';

function ReferenceCard({ reference, isLoading, onRegenerate, dataTour }) {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="border border-border rounded-xl p-4 bg-white" data-tour={dataTour}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-ink">{reference.name}</h4>
          {reference.description && <p className="text-sm text-ink-muted mt-1">{reference.description}</p>}
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background: reference.source === 'uploaded' ? '#E0F2FE' : '#F0FDF4',
            color: reference.source === 'uploaded' ? '#0369A1' : '#15803D',
          }}
        >
          {reference.source === 'uploaded' ? 'Uploaded' : 'AI Generated'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-ink-muted">Original</span>
          <div className="border border-border rounded-lg overflow-hidden bg-surface-alt">
            {reference.originalUrl ? (
              <img src={reference.originalUrl} alt="Original" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-ink-muted text-sm">
                No image
              </div>
            )}
          </div>
        </div>

        {/* Restyled/Locked */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-ink-muted">
            {reference.needsRestyle ? 'Restyled' : 'Locked'}
          </span>
          <div className="border border-border rounded-lg overflow-hidden bg-surface-alt">
            {isLoading ? (
              <div className="w-full aspect-square flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terra"></div>
              </div>
            ) : reference.lockedUrl ? (
              <img src={reference.lockedUrl} alt="Locked" className="w-full aspect-square object-cover" />
            ) : (
              // No locked image and nothing running: this reference's generation
              // was interrupted or failed (e.g. a timed-out/aborted generate left
              // the session at REF_REFERENCES_ADDED). Offer a retry so the user
              // isn't stranded on a dead "Processing…" state with no way forward.
              <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 p-3 text-center">
                <span className="text-sm text-ink-muted">Generation didn’t finish</span>
                <button
                  onClick={() => onRegenerate(reference.id, '')}
                  className="text-sm px-4 py-2 rounded-lg font-medium text-white transition-all"
                  style={{ background: 'var(--gradient-brand)' }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regenerate feedback */}
      {reference.lockedUrl && !isLoading && (
        <div className="mt-3 flex gap-2" data-tour={dataTour ? 'ref-regen' : undefined}>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback for regeneration..."
            className="flex-1 text-sm bg-surface-alt border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-terra"
          />
          <button
            onClick={() => {
              onRegenerate(reference.id, feedback);
              setFeedback('');
            }}
            className="text-sm px-3 py-2 bg-surface-alt hover:bg-surface-alt text-ink/80 rounded-lg transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReferenceLockStep({
  referenceData,
  lockLoading,
  onApproveAll,
  onRegenerate,
  loading,
}) {
  // Hoisted above the early return: the tour hook must run unconditionally.
  const allRefs = [
    ...(referenceData?.characters || []),
    ...(referenceData?.settings || []),
    ...(referenceData?.logos || []),
  ];
  const allLocked = allRefs.every(r => r.lockedUrl);
  const { autoApprove } = useAuth();
  // Fire only when every reference is locked and nothing is regenerating:
  // before that the regenerate rows and Approve All button don't exist, and
  // the user is just watching spinners.
  const tourReady = allRefs.length > 0 && allLocked && lockLoading.size === 0;
  // First rendered card: render order (characters, settings, logos) matches
  // allRefs order, so allRefs[0] is the top-left card on screen.
  const firstRefId = allRefs[0]?.id;
  // Suppress the auto-run when references are auto-approved - the wizard skips
  // this review, so the tour would only flicker (and mark itself seen). The
  // HelpFab still uses `tourReady` so a manual replay stays available.
  const lockTour = useStepTour(TOUR_KEYS.referenceLock, startReferenceLockTour, {
    enabled: tourReady && !autoApprove.references,
  });

  if (!referenceData) {
    return (
      <div className="flex items-center justify-center h-full text-ink-muted">
        No references to review
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Approve Your References</h2>
          <p className="text-ink-muted">
            Review how your references look in the chosen style. Logos are preserved exactly. Approve to continue or regenerate with feedback.
          </p>
        </div>

        {/* Props */}
        {referenceData.characters?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-ink mb-3">Characters & Subjects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referenceData.characters.map((char) => (
                <ReferenceCard
                  key={char.id}
                  reference={char}
                  isLoading={lockLoading.has('__all__') || lockLoading.has(char.id)}
                  onRegenerate={onRegenerate}
                  dataTour={char.id === firstRefId ? 'ref-card' : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Backgrounds */}
        {referenceData.settings?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-ink mb-3">Backgrounds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referenceData.settings.map((setting) => (
                <ReferenceCard
                  key={setting.id}
                  reference={setting}
                  isLoading={lockLoading.has('__all__') || lockLoading.has(setting.id)}
                  onRegenerate={onRegenerate}
                  dataTour={setting.id === firstRefId ? 'ref-card' : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Logos */}
        {referenceData.logos?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-ink mb-3">Logos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referenceData.logos.map((logo) => (
                <div key={logo.id} className="border border-border rounded-xl p-4 bg-white" data-tour={logo.id === firstRefId ? 'ref-card' : undefined}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-ink">{logo.name}</h4>
                      {logo.description && <p className="text-sm text-ink-muted mt-1">{logo.description}</p>}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-terra/5 text-terra">
                      Preserved Exactly
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-ink-muted">Original (locked)</span>
                    <div className="border border-border rounded-lg overflow-hidden bg-surface-alt">
                      {logo.originalUrl ? (
                        <img src={logo.originalUrl} alt={logo.name} className="w-full aspect-square object-contain" />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center text-ink-muted text-sm">
                          No image
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approve All */}
        {allLocked && lockLoading.size === 0 && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onApproveAll}
              disabled={loading}
              data-tour="ref-approve"
              className="px-8 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
            >
              {loading ? "Generating Script..." : "Approve All & Continue"}
            </button>
          </div>
        )}
      </motion.div>

      {tourReady && <HelpFab onStartTour={lockTour.replay} />}
    </div>
  );
}
