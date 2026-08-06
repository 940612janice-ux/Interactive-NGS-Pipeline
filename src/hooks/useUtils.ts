export const BASE_COLORS = {
  A: '#ff6b6b',
  C: '#4cc38a',
  G: '#ffb84d',
  T: '#4da3ff',
} as const;

export type BaseKey = keyof typeof BASE_COLORS;

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function generateRandomSequence(length = 50): string {
  const bases: BaseKey[] = ['A', 'C', 'G', 'T'];
  let seq = '';
  for (let i = 0; i < length; i++) {
    seq += bases[Math.floor(Math.random() * bases.length)];
  }
  return seq;
}

export function generateQualityScores(length = 50): string {
  let qual = '';
  for (let i = 0; i < length; i++) {
    const q = Math.floor(Math.random() * 15) + 30;
    qual += String.fromCharCode(q + 33);
  }
  return qual;
}

export function getBaseColor(base: string): string {
  return BASE_COLORS[base as BaseKey] || '#ffffff';
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}