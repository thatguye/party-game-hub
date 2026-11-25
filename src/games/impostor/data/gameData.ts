import { CategoryDeck } from '../types/game';
import { DECKS_01_02 } from './decks/d01_02';
import { DECKS_03_04 } from './decks/d03_04';
import { DECKS_05_06 } from './decks/d05_06';
import { DECKS_07_08 } from './decks/d07_08';
import { DECKS_09_10 } from './decks/d09_10';
import { DECKS_11_12 } from './decks/d11_12';
import { DECKS_13_14 } from './decks/d13_14';
import { DECKS_15_16 } from './decks/d15_16';
import { DECKS_17_18 } from './decks/d17_18';
import { DECKS_19_20 } from './decks/d19_20';
import { DECKS_21_22 } from './decks/d21_22';

export const BUILT_IN_CATEGORIES: CategoryDeck[] = [
  ...DECKS_01_02,
  ...DECKS_03_04,
  ...DECKS_05_06,
  ...DECKS_07_08,
  ...DECKS_09_10,
  ...DECKS_11_12,
  ...DECKS_13_14,
  ...DECKS_15_16,
  ...DECKS_17_18,
  ...DECKS_19_20,
  ...DECKS_21_22,
];

export const PLAYER_AVATAR_EMOJIS = [
  '🦊', '🐙', '🦁', '🐼', '🐸', '🦉', '🦄', '🐯',
  '🐨', '🐺', '🦋', '🦖', '🦈', '🐝', '🦩', '🦝',
  '👾', '🤖', '👻', '🎭', '🔥', '⚡', '🌙', '🍄',
];

export const PLAYER_AVATAR_COLORS = [
  '#22D3EE', // Cyan
  '#F43F5E', // Crimson Rose
  '#A78BFA', // Electric Violet
  '#34D399', // Emerald
  '#FBBF24', // Amber
  '#FB923C', // Tangerine
  '#60A5FA', // Sky Blue
  '#E879F9', // Fuchsia
  '#2DD4BF', // Teal
  '#FB7185', // Coral Pink
];

export const DECK_EMOJIS = [
  '🎯', '🔥', '🎲', '🧠', '🍕', '🎬', '🎧', '⚽',
  '🌍', '🚀', '🎭', '👾', '🥂', '🎈', '💎', '⚡',
];

export const DEFAULT_SELECTED_DECK_IDS = BUILT_IN_CATEGORIES.filter(
  (d) => !d.isSpicy
).map((d) => d.id);
