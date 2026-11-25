export interface NeonColor {
  readonly name: string;
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
  readonly coreHex: string;
}

export const NEON_PALETTE: readonly NeonColor[] = [
  { name: 'Cyan', hex: '#00F0FF', rgb: [0, 240, 255], coreHex: '#D6FCFF' },
  { name: 'Magenta', hex: '#FF2EF5', rgb: [255, 46, 245], coreHex: '#FFD6FD' },
  { name: 'Electric Lime', hex: '#C8FF00', rgb: [200, 255, 0], coreHex: '#F3FFD1' },
  { name: 'Amber', hex: '#FFB000', rgb: [255, 176, 0], coreHex: '#FFEFCC' },
  { name: 'Violet', hex: '#A55EFF', rgb: [165, 94, 255], coreHex: '#EBDDFF' },
  { name: 'Coral', hex: '#FF5E57', rgb: [255, 94, 87], coreHex: '#FFDAD8' },
  { name: 'Emerald', hex: '#00E88F', rgb: [0, 232, 143], coreHex: '#D1FFEC' },
  { name: 'Sky Blue', hex: '#38B6FF', rgb: [56, 182, 255], coreHex: '#D9F1FF' },
  { name: 'Hot Pink', hex: '#FF1E7A', rgb: [255, 30, 122], coreHex: '#FFD4E6' },
  { name: 'Gold', hex: '#FFE047', rgb: [255, 224, 71], coreHex: '#FFF8D6' },
] as const;

export function rgba(rgb: readonly [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}
