// Downscale an image to a small JPEG data URL for sending to a vision model.
// Used by the "Improve" button so the AI can glance at the user's uploaded
// photos (subjects, setting, mood) without shipping full-resolution files.
// Small on purpose: the vision call uses low detail, so ~768px is plenty.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * @param {string|File} source - a blob/object URL, data URL, or File
 * @param {number} [maxDim=768] - longest edge of the output
 * @param {number} [quality=0.7] - JPEG quality 0-1
 * @returns {Promise<string|null>} JPEG data URL, or null if it can't be processed
 */
export async function downscaleImageToDataUrl(source, maxDim = 768, quality = 0.7) {
  let objectUrl = null;
  try {
    const src = typeof source === 'string' ? source : (objectUrl = URL.createObjectURL(source));
    const img = await loadImage(src);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
