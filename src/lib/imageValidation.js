import { toast } from "@/lib/toast";

// The only raster formats the pipeline accepts. WebP (and everything else) is rejected.
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];
// Use on <input type="file"> so the OS picker hides unsupported formats by default.
export const ACCEPTED_IMAGE_ACCEPT = "image/jpeg,image/png";

function isValidImage(file) {
  return !!file && ACCEPTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Validate a single picked file. Returns the file when it's a JPEG/PNG,
 * otherwise shows a rejection toast and returns null.
 */
export function validateImageFile(file) {
  if (!file) return null;
  if (isValidImage(file)) return file;
  toast.error("Only JPEG and PNG images are supported. WebP isn't accepted.");
  return null;
}

/**
 * Filter a list of picked/dropped files down to supported images. Shows one
 * toast summarising any rejected files (e.g. WebP).
 */
export function filterValidImages(files) {
  const list = Array.from(files || []);
  const valid = list.filter(isValidImage);
  const rejected = list.length - valid.length;
  if (rejected > 0) {
    toast.error(
      rejected === 1
        ? "Only JPEG and PNG images are supported. WebP isn't accepted."
        : `${rejected} files were skipped. Only JPEG and PNG are supported (WebP isn't).`
    );
  }
  return valid;
}
