// =========== AVATAR SYSTEM ===========
// Inline SVG avatars - no external deps, always works
import { fixAvatarUrl } from '../lib/api';

const svgAvatar = (bg, hair, skin = '#FDEBD0', eyes = '#2F3441', hairPath) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" fill="${bg}"/>
    <circle cx="50" cy="55" r="28" fill="${skin}"/>
    ${hairPath}
    <circle cx="40" cy="50" r="2.5" fill="${eyes}"/>
    <circle cx="60" cy="50" r="2.5" fill="${eyes}"/>
    <circle cx="40" cy="49" r="1" fill="white" opacity="0.6"/>
    <circle cx="60" cy="49" r="1" fill="white" opacity="0.6"/>
    <path d="M43 60 Q50 66 57 60" stroke="${eyes}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="35" cy="57" rx="4" ry="2.5" fill="#F5A9B8" opacity="0.3"/>
    <ellipse cx="65" cy="57" rx="4" ry="2.5" fill="#F5A9B8" opacity="0.3"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const HAIR = {
  longPink: `<ellipse cx="50" cy="38" rx="30" ry="22" fill="#E8A0BF"/><path d="M22 42 Q20 75 30 80" stroke="#E8A0BF" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M78 42 Q80 75 70 80" stroke="#E8A0BF" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  longLavender: `<ellipse cx="50" cy="38" rx="30" ry="22" fill="#C3AED6"/><path d="M22 42 Q20 75 30 80" stroke="#C3AED6" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M78 42 Q80 75 70 80" stroke="#C3AED6" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  longPeach: `<ellipse cx="50" cy="38" rx="30" ry="22" fill="#F7C59F"/><path d="M22 42 Q20 75 30 80" stroke="#F7C59F" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M78 42 Q80 75 70 80" stroke="#F7C59F" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  longDark: `<ellipse cx="50" cy="38" rx="30" ry="22" fill="#6B4E71"/><path d="M22 42 Q20 75 30 80" stroke="#6B4E71" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M78 42 Q80 75 70 80" stroke="#6B4E71" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  shortBlue: `<ellipse cx="50" cy="36" rx="29" ry="20" fill="#7FB5D5"/><rect x="25" y="28" width="50" height="10" rx="5" fill="#7FB5D5"/>`,
  shortTeal: `<ellipse cx="50" cy="36" rx="29" ry="20" fill="#5DADE2"/><rect x="25" y="28" width="50" height="10" rx="5" fill="#5DADE2"/>`,
  shortNavy: `<ellipse cx="50" cy="36" rx="29" ry="20" fill="#34495E"/><rect x="25" y="28" width="50" height="10" rx="5" fill="#34495E"/>`,
  shortBrown: `<ellipse cx="50" cy="36" rx="29" ry="20" fill="#A0522D"/><rect x="25" y="28" width="50" height="10" rx="5" fill="#A0522D"/>`,
  buzzMint: `<ellipse cx="50" cy="38" rx="26" ry="18" fill="#A8E6CF"/>`,
  buzzLilac: `<ellipse cx="50" cy="38" rx="26" ry="18" fill="#D4A5E5"/>`,
  curlyMint: `<circle cx="35" cy="32" r="10" fill="#A8E6CF"/><circle cx="50" cy="28" r="10" fill="#A8E6CF"/><circle cx="65" cy="32" r="10" fill="#A8E6CF"/><circle cx="42" cy="26" r="8" fill="#A8E6CF"/><circle cx="58" cy="26" r="8" fill="#A8E6CF"/>`,
  curlySage: `<circle cx="35" cy="32" r="10" fill="#B5C99A"/><circle cx="50" cy="28" r="10" fill="#B5C99A"/><circle cx="65" cy="32" r="10" fill="#B5C99A"/><circle cx="42" cy="26" r="8" fill="#B5C99A"/><circle cx="58" cy="26" r="8" fill="#B5C99A"/>`,
};

const BEARD = `<path d="M35 60 Q42 72 50 74 Q58 72 65 60" fill="#8B7355" opacity="0.5"/><path d="M38 62 Q50 78 62 62" stroke="#8B7355" stroke-width="1.5" fill="none" opacity="0.4"/>`;

export const avatarOptions = [
  // Feminine
  { value: 'fem-pink', label: 'Růžové vlasy', gender: 'feminine', image: svgAvatar('#FFE4EC', '', '#FDEBD0', '#2F3441', HAIR.longPink) },
  { value: 'fem-lavender', label: 'Levandulové vlasy', gender: 'feminine', image: svgAvatar('#EDE4F3', '', '#FDEBD0', '#2F3441', HAIR.longLavender) },
  { value: 'fem-peach', label: 'Broskvové vlasy', gender: 'feminine', image: svgAvatar('#FFF0E1', '', '#FDEBD0', '#2F3441', HAIR.longPeach) },
  { value: 'fem-dark', label: 'Tmavé vlasy', gender: 'feminine', image: svgAvatar('#F3E5F5', '', '#FDEBD0', '#2F3441', HAIR.longDark) },
  // Masculine
  { value: 'masc-blue', label: 'Modré krátké vlasy', gender: 'masculine', image: svgAvatar('#E3F2FD', '', '#FDEBD0', '#2F3441', HAIR.shortBlue) },
  { value: 'masc-teal', label: 'Tyrkysové vlasy', gender: 'masculine', image: svgAvatar('#E0F7FA', '', '#FDEBD0', '#2F3441', HAIR.shortTeal) },
  { value: 'masc-navy', label: 'Tmavé krátké vlasy', gender: 'masculine', image: svgAvatar('#E8EAF6', '', '#FDEBD0', '#2F3441', HAIR.shortNavy + BEARD) },
  { value: 'masc-brown', label: 'Hnědé vlasy', gender: 'masculine', image: svgAvatar('#FFF3E0', '', '#FDEBD0', '#2F3441', HAIR.shortBrown) },
  // Neutral
  { value: 'nb-mint', label: 'Mátové vlasy', gender: 'neutral', image: svgAvatar('#E8F5E9', '', '#FDEBD0', '#2F3441', HAIR.buzzMint) },
  { value: 'nb-lilac', label: 'Šeříkové vlasy', gender: 'neutral', image: svgAvatar('#F3E5F5', '', '#FDEBD0', '#2F3441', HAIR.buzzLilac) },
  { value: 'nb-curly', label: 'Kudrnaté mátové', gender: 'neutral', image: svgAvatar('#E0F2F1', '', '#FDEBD0', '#2F3441', HAIR.curlyMint) },
  { value: 'nb-sage', label: 'Kudrnaté šalvějové', gender: 'neutral', image: svgAvatar('#F1F8E9', '', '#FDEBD0', '#2F3441', HAIR.curlySage) },
  // Animals
  {
    value: 'animal-cat', label: 'Kočka', gender: 'animal',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F3E5F5"/><ellipse cx="50" cy="58" rx="24" ry="20" fill="#D4A5E5"/><polygon points="28,38 35,18 42,38" fill="#D4A5E5"/><polygon points="58,38 65,18 72,38" fill="#D4A5E5"/><circle cx="40" cy="50" r="3" fill="#5D3A6E"/><circle cx="60" cy="50" r="3" fill="#5D3A6E"/><path d="M44 60 Q50 65 56 60" stroke="#5D3A6E" stroke-width="2" fill="none"/><line x1="30" y1="55" x2="45" y2="53" stroke="#9C6AB8" stroke-width="1.5"/><line x1="70" y1="55" x2="55" y2="53" stroke="#9C6AB8" stroke-width="1.5"/><line x1="28" y1="58" x2="43" y2="57" stroke="#9C6AB8" stroke-width="1.5"/></svg>')}`,
  },
  {
    value: 'animal-fox', label: 'Liška', gender: 'animal',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF3E0"/><ellipse cx="50" cy="58" rx="24" ry="20" fill="#F7A64B"/><polygon points="28,40 20,18 40,38" fill="#F7A64B"/><polygon points="72,40 80,18 60,38" fill="#F7A64B"/><ellipse cx="50" cy="62" rx="12" ry="10" fill="#FFF3E0"/><circle cx="40" cy="50" r="3" fill="#2F3441"/><circle cx="60" cy="50" r="3" fill="#2F3441"/><path d="M44 61 Q50 67 56 61" stroke="#2F3441" stroke-width="2" fill="none"/></svg>')}`,
  },
  {
    value: 'animal-rabbit', label: 'Králík', gender: 'animal',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF9F9"/><ellipse cx="50" cy="60" rx="22" ry="19" fill="#FADADD"/><ellipse cx="36" cy="22" rx="7" ry="18" fill="#FADADD"/><ellipse cx="64" cy="22" rx="7" ry="18" fill="#FADADD"/><ellipse cx="36" cy="22" rx="3.5" ry="14" fill="#F5A9B8" opacity="0.7"/><ellipse cx="64" cy="22" rx="3.5" ry="14" fill="#F5A9B8" opacity="0.7"/><circle cx="40" cy="52" r="3" fill="#2F3441"/><circle cx="60" cy="52" r="3" fill="#2F3441"/><ellipse cx="50" cy="62" rx="5" ry="3" fill="#F5A9B8"/></svg>')}`,
  },
  {
    value: 'animal-panda', label: 'Panda', gender: 'animal',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F5F5F5"/><circle cx="50" cy="55" r="25" fill="white"/><circle cx="36" cy="45" r="8" fill="#2F3441"/><circle cx="64" cy="45" r="8" fill="#2F3441"/><circle cx="36" cy="43" r="4" fill="white"/><circle cx="64" cy="43" r="4" fill="white"/><circle cx="37" cy="43" r="2.5" fill="#1a1a2e"/><circle cx="65" cy="43" r="2.5" fill="#1a1a2e"/><ellipse cx="50" cy="62" rx="10" ry="7" fill="#F5F5F5"/><path d="M44 62 Q50 68 56 62" stroke="#2F3441" stroke-width="2" fill="none"/><circle cx="28" cy="40" r="8" fill="#2F3441"/><circle cx="72" cy="40" r="8" fill="#2F3441"/></svg>')}`,
  },
  {
    value: 'animal-owl', label: 'Sova', gender: 'animal',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#EDE4F3"/><ellipse cx="50" cy="58" rx="24" ry="22" fill="#C3AED6"/><polygon points="34,32 42,18 50,32" fill="#C3AED6"/><polygon points="66,32 58,18 50,32" fill="#C3AED6"/><circle cx="38" cy="48" r="10" fill="white"/><circle cx="62" cy="48" r="10" fill="white"/><circle cx="38" cy="48" r="6" fill="#4A235A"/><circle cx="62" cy="48" r="6" fill="#4A235A"/><circle cx="38" cy="47" r="2" fill="white"/><circle cx="62" cy="47" r="2" fill="white"/><polygon points="46,57 50,63 54,57" fill="#F7A64B"/></svg>')}`,
  },
  // Symbols & Mascots
  {
    value: 'sym-flower', label: 'Květ', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF0F5"/><circle cx="50" cy="30" r="12" fill="#F5A9B8"/><circle cx="50" cy="70" r="12" fill="#F5A9B8"/><circle cx="30" cy="50" r="12" fill="#F5A9B8"/><circle cx="70" cy="50" r="12" fill="#F5A9B8"/><circle cx="35" cy="35" r="10" fill="#FFD1DC"/><circle cx="65" cy="35" r="10" fill="#FFD1DC"/><circle cx="35" cy="65" r="10" fill="#FFD1DC"/><circle cx="65" cy="65" r="10" fill="#FFD1DC"/><circle cx="50" cy="50" r="14" fill="#FFEEF4"/><circle cx="50" cy="50" r="8" fill="#F5A9B8"/></svg>')}`,
  },
  {
    value: 'sym-butterfly', label: 'Motýl', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#E8F4FD"/><ellipse cx="28" cy="38" rx="20" ry="16" fill="#5BCEFA" opacity="0.7"/><ellipse cx="72" cy="38" rx="20" ry="16" fill="#5BCEFA" opacity="0.7"/><ellipse cx="30" cy="62" rx="16" ry="12" fill="#F5A9B8" opacity="0.7"/><ellipse cx="70" cy="62" rx="16" ry="12" fill="#F5A9B8" opacity="0.7"/><ellipse cx="50" cy="50" rx="4" ry="18" fill="#2F3441" opacity="0.6"/><ellipse cx="50" cy="50" rx="2" ry="18" fill="#5D3A6E" opacity="0.4"/><line x1="46" y1="34" x2="36" y2="24" stroke="#2F3441" stroke-width="1.5" opacity="0.6"/><line x1="54" y1="34" x2="64" y2="24" stroke="#2F3441" stroke-width="1.5" opacity="0.6"/></svg>')}`,
  },
  {
    value: 'sym-rainbow', label: 'Duha', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF8FF"/><path d="M15 65 A35 35 0 0 1 85 65" stroke="#E53E3E" stroke-width="4" fill="none"/><path d="M18 65 A32 32 0 0 1 82 65" stroke="#F6AD55" stroke-width="4" fill="none"/><path d="M21 65 A29 29 0 0 1 79 65" stroke="#ECC94B" stroke-width="4" fill="none"/><path d="M24 65 A26 26 0 0 1 76 65" stroke="#68D391" stroke-width="4" fill="none"/><path d="M27 65 A23 23 0 0 1 73 65" stroke="#63B3ED" stroke-width="4" fill="none"/><path d="M30 65 A20 20 0 0 1 70 65" stroke="#B794F4" stroke-width="4" fill="none"/><ellipse cx="25" cy="72" rx="10" ry="6" fill="white" opacity="0.8"/><ellipse cx="75" cy="72" rx="10" ry="6" fill="white" opacity="0.8"/></svg>')}`,
  },
  {
    value: 'sym-star', label: 'Hvězda', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFFCEE"/><polygon points="50,18 56,38 76,38 61,50 67,70 50,58 33,70 39,50 24,38 44,38" fill="#F7C59F" stroke="#E8A85A" stroke-width="1.5"/><polygon points="50,24 55,40 70,40 58,50 63,66 50,56 37,66 42,50 30,40 45,40" fill="#FFE4A0"/></svg>')}`,
  },
  {
    value: 'sym-lotus', label: 'Lotos (Bloom)', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F0F8FF"/><path d="M50 75 Q30 55 32 38 Q40 18 50 28 Q60 18 68 38 Q70 55 50 75Z" fill="#A8E6CF" opacity="0.8"/><path d="M50 75 Q15 58 18 42 Q22 22 35 35 Q38 18 50 28 Q50 28 50 75Z" fill="#5BCEFA" opacity="0.6"/><path d="M50 75 Q85 58 82 42 Q78 22 65 35 Q62 18 50 28 Q50 28 50 75Z" fill="#F5A9B8" opacity="0.6"/><ellipse cx="50" cy="80" rx="22" ry="5" fill="#6FE3C1" opacity="0.3"/></svg>')}`,
  },
  {
    value: 'sym-trans', label: 'Trans symbol', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F0F8FF"/><circle cx="50" cy="50" r="36" fill="none" stroke="#5BCEFA" stroke-width="5"/><circle cx="50" cy="50" r="24" fill="none" stroke="#F5A9B8" stroke-width="4"/><path d="M50 14 L50 86" stroke="#5BCEFA" stroke-width="4" stroke-linecap="round"/><path d="M14 50 L86 50" stroke="#F5A9B8" stroke-width="4" stroke-linecap="round"/><path d="M50 14 L58 28 L50 24 L42 28 Z" fill="#5BCEFA"/><path d="M50 86 L42 72 L50 76 L58 72 Z" fill="#F5A9B8"/></svg>')}`,
  },
  {
    value: 'sym-pride', label: 'Trans duha', gender: 'symbol',
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF8FF"/><path d="M50 20 C30 20 25 45 25 55 C25 70 38 82 50 82 C62 82 75 70 75 55 C75 45 70 20 50 20 Z" fill="#5BCEFA" opacity="0.9"/><path d="M50 28 C35 28 31 48 31 56 C31 68 40 76 50 76 C60 76 69 68 69 56 C69 48 65 28 50 28 Z" fill="#F5A9B8" opacity="0.9"/><path d="M50 36 C40 36 37 51 37 57 C37 66 44 72 50 72 C56 72 63 66 63 57 C63 51 60 36 50 36 Z" fill="white" opacity="0.95"/><ellipse cx="50" cy="52" rx="8" ry="6" fill="#F5A9B8" opacity="0.6"/></svg>')}`,
  },
  { value: 'animal-dog', label: 'Pes', gender: 'animal', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F5E6D3"/><ellipse cx="50" cy="58" rx="24" ry="20" fill="#D4A574"/><ellipse cx="50" cy="45" rx="16" ry="18" fill="#D4A574"/><circle cx="42" cy="42" r="2.5" fill="#2F3441"/><circle cx="58" cy="42" r="2.5" fill="#2F3441"/><ellipse cx="50" cy="52" rx="4" ry="3" fill="#2F3441"/><path d="M38 38 Q35 32 40 30" stroke="#2F3441" stroke-width="1.5" fill="none"/><path d="M62 38 Q65 32 60 30" stroke="#2F3441" stroke-width="1.5" fill="none"/></svg>')}` },
  { value: 'animal-bear', label: 'Medvěd', gender: 'animal', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#EFE4D8"/><ellipse cx="50" cy="58" rx="26" ry="22" fill="#8B7355"/><circle cx="38" cy="42" r="10" fill="#8B7355"/><circle cx="62" cy="42" r="10" fill="#8B7355"/><circle cx="50" cy="50" r="14" fill="#A67B5B"/><circle cx="40" cy="48" r="3" fill="#2F3441"/><circle cx="60" cy="48" r="3" fill="#2F3441"/><ellipse cx="50" cy="56" rx="5" ry="4" fill="#2F3441"/><ellipse cx="32" cy="35" rx="5" ry="6" fill="#8B7355"/><ellipse cx="68" cy="35" rx="5" ry="6" fill="#8B7355"/></svg>')}` },
  { value: 'hum-pink-med', label: 'Růžové vlasy (tmavší pleť)', gender: 'feminine', image: svgAvatar('#FFE4EC', '', '#E8C4A0', '#2F3441', HAIR.longPink) },
  { value: 'hum-lav-tan', label: 'Levandule (opálená)', gender: 'feminine', image: svgAvatar('#EDE4F3', '', '#C4956A', '#2F3441', HAIR.longLavender) },
  { value: 'hum-short-wht', label: 'Krátké blonďaté', gender: 'neutral', image: svgAvatar('#FFF8E7', '', '#FDEBD0', '#2F3441', `<ellipse cx="50" cy="36" rx="29" ry="20" fill="#E8C882"/><rect x="25" y="28" width="50" height="10" rx="5" fill="#E8C882"/>`) },
  { value: 'hum-curly-red', label: 'Kudrnaté zrzavé', gender: 'neutral', image: svgAvatar('#FFF4E6', '', '#FDEBD0', '#2F3441', `<circle cx="35" cy="32" r="10" fill="#B5651D"/><circle cx="50" cy="28" r="10" fill="#B5651D"/><circle cx="65" cy="32" r="10" fill="#B5651D"/><circle cx="42" cy="26" r="8" fill="#B5651D"/><circle cx="58" cy="26" r="8" fill="#B5651D"/>`) },
  { value: 'sym-heart', label: 'Srdce', gender: 'symbol', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF0F5"/><path d="M50 78 C20 55 18 32 50 18 C82 32 80 55 50 78Z" fill="#F5A9B8" stroke="#E89AA9" stroke-width="1.5"/></svg>')}` },
  { value: 'sym-sun', label: 'Slunce', gender: 'symbol', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#FFF9E6"/><circle cx="50" cy="50" r="22" fill="#F7C59F"/><path d="M50 15 L50 5 M50 95 L50 85 M15 50 L5 50 M95 50 L85 50 M25 25 L18 18 M82 82 L75 75 M25 75 L18 82 M82 25 L75 18" stroke="#F7C59F" stroke-width="4" stroke-linecap="round"/></svg>')}` },
  { value: 'sym-moon', label: 'Měsíc', gender: 'symbol', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F0F4FF"/><path d="M50 15 A22 22 0 1 1 50 85 A18 18 0 1 0 50 15" fill="#C3AED6"/></svg>')}` },
  { value: 'sym-circle', label: 'Kruh', gender: 'symbol', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F8F4FF"/><circle cx="50" cy="50" r="32" fill="none" stroke="#8A7CFF" stroke-width="6"/></svg>')}` },
  { value: 'sym-diamond', label: 'Kosočtverec', gender: 'symbol', image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F5F0FF"/><polygon points="50,18 78,50 50,82 22,50" fill="#A8E6CF" stroke="#8FD4B8" stroke-width="2"/></svg>')}` },
  // Custom upload
  { value: 'custom', label: 'Nahrát vlastní foto', gender: 'custom', image: null },
];

const initialsAvatar = (name, bg = '#8A7CFF') => {
  const initials = (name || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><text x="50" y="56" text-anchor="middle" dominant-baseline="middle" font-size="38" font-family="DM Sans,sans-serif" font-weight="600" fill="white">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const getAvatarImage = (avatarValue, customImage = null) => {
  if (avatarValue === 'custom' && customImage) return fixAvatarUrl(customImage);
  const found = avatarOptions.find(a => a.value === avatarValue);
  if (found?.image) return found.image;
  return avatarOptions[0].image;
};

export const getAvatarFallback = (username) => initialsAvatar(username);
