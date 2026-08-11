/**
 * Turn the data URL the brand extractor returns into a File, so a logo pulled
 * off a website goes through exactly the same multipart upload path as one the
 * user picked off disk. Nothing downstream needs to know where it came from.
 *
 * Returns null on anything malformed rather than throwing, because the caller
 * is filling in optional fields and a bad logo should not take the form down.
 */
export function dataUrlToFile(dataUrl, filename = "logo.png") {
  const value = String(dataUrl || "");
  const comma = value.indexOf(",");
  if (comma === -1) return null;

  const header = value.slice(0, comma);
  const encoded = value.slice(comma + 1);
  if (!encoded) return null;
  if (!/^data:/i.test(header) || !/;base64/i.test(header)) return null;

  const mime = /data:([^;]+)/i.exec(header)?.[1] || "image/png";

  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}
