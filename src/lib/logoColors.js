// Derive brand colours from an uploaded logo, client-side, so the intro's brand
// kit prefills without a round-trip. Returns { primary, secondary } hex strings,
// or null when the logo has no usable colour (mono/transparent) — callers fall
// back to the app theme.

function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * @param {File} file
 * @returns {Promise<{primary:string, secondary:string}|null>}
 */
export async function extractLogoColors(file) {
  try {
    const bmp = await loadBitmap(file);
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Bucket saturated pixels by hue (12 buckets of 30°), weighted by saturation.
    const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 0.18 || l < 0.08 || l > 0.92) continue; // skip greys / near black-white
      const idx = Math.min(11, Math.floor(h / 30));
      const weight = s * (1 - Math.abs(l - 0.5)); // favour vivid, mid-lightness
      buckets[idx].w += weight;
      buckets[idx].r += r * weight;
      buckets[idx].g += g * weight;
      buckets[idx].b += b * weight;
    }

    const ranked = buckets
      .map((bk, idx) => ({ idx, ...bk }))
      .filter((bk) => bk.w > 0)
      .sort((a, b) => b.w - a.w);
    if (ranked.length === 0) return null;

    const avg = (bk) => rgbToHex(bk.r / bk.w, bk.g / bk.w, bk.b / bk.w);
    const primary = avg(ranked[0]);
    // Secondary: next bucket at least 2 hue-steps away, else reuse primary.
    const second = ranked.find((bk) => Math.abs(bk.idx - ranked[0].idx) >= 2);
    const secondary = second ? avg(second) : primary;
    return { primary, secondary };
  } catch {
    return null;
  }
}
