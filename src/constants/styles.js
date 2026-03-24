export const STYLE_OPTIONS = [
  { id: 'realistic', name: 'Realistic', icon: '📷', description: 'Photorealistic, natural, lifelike' },
  { id: 'animated', name: 'Animated', icon: '🎨', description: 'Cartoon, vibrant, stylized' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬', description: 'Film-like, dramatic, moody' },
  { id: 'surreal', name: 'Surreal', icon: '✨', description: 'Dreamlike, abstract, artistic' },
  { id: 'anime', name: 'Anime', icon: '⛩️', description: 'Japanese animation, cel-shaded' },
  { id: 'comic_book', name: 'Comic Book', icon: '💥', description: 'Bold outlines, dynamic panels' },
  { id: 'watercolor', name: 'Watercolor', icon: '🖌️', description: 'Soft, painterly, muted pastels' },
  { id: '3d_render', name: '3D Render', icon: '🎮', description: 'CGI quality, ray-traced lighting' },
];

export const VALID_STYLE_IDS = STYLE_OPTIONS.map(s => s.id);
