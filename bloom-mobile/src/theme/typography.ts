/**
 * Bloom typografie – Nunito jako u loga
 */
import { BLOOM_COLORS } from './colors';

export const BLOOM_FONTS = {
  /** Hlavní nadpisy (jako Bloom v logu) */
  heading: 'Nunito_800ExtraBold',
  /** Silnější text */
  semiBold: 'Nunito_600SemiBold',
  /** Běžný text */
  regular: 'Nunito_400Regular',
} as const;

/** Sdílený styl nadpisů sekcí – jemnější šedá, font jako na homepage */
export const SECTION_HEADING = {
  fontSize: 24,
  fontFamily: BLOOM_FONTS.semiBold,
  color: BLOOM_COLORS.sub,
} as const;

/** Sdílený styl podnadpisů v sekcích (např. Rychlé odkazy, Podobné cesty) */
export const SECTION_SUBTITLE = {
  fontSize: 18,
  fontFamily: BLOOM_FONTS.semiBold,
  color: BLOOM_COLORS.sub,
  marginBottom: 12,
} as const;

/** Nadpisy článků v detailu */
export const ARTICLE_TITLE = {
  fontSize: 22,
  fontFamily: BLOOM_FONTS.semiBold,
  color: BLOOM_COLORS.sub,
  marginBottom: 8,
} as const;
