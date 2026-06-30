// Prediction-based progress for opaque background jobs that report no real
// sub-stage progress (e.g. single-clip regeneration). It ramps EVENLY toward
// `ramp`% over an estimated duration — so it reads as steady, predictable
// movement — then creeps slowly toward `ceiling` if the job overruns the
// estimate, so it never hard-stops at a number and looks stuck. Snap to 100
// yourself when the job actually finishes.
//
// Mirrors the estimate philosophy already used by GeneratingStep (clips run in
// batches; ~minutes per batch), just expressed as a smooth curve.
//
// @param {number} elapsedMs  time since the job started
// @param {number} estimateMs predicted total duration
// @param {{ramp?: number, ceiling?: number}} [opts]
// @returns {number} percentage 0–`ceiling`
export function estimatedProgress(elapsedMs, estimateMs, { ramp = 90, ceiling = 99 } = {}) {
  if (elapsedMs <= 0 || estimateMs <= 0) return 0;
  if (elapsedMs < estimateMs) {
    return ramp * (elapsedMs / estimateMs); // even, linear to `ramp`% over the estimate
  }
  // Overrun: creep from `ramp` toward `ceiling`, slowing as it approaches, so a
  // job that runs long keeps inching forward instead of freezing.
  const over = elapsedMs - estimateMs;
  const tau = estimateMs * 0.5; // softness scales with the estimate
  return ramp + (ceiling - ramp) * (1 - Math.exp(-over / tau));
}
