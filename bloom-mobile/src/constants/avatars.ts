import { getAvatarImageUri } from './avatarImages';

/**
 * Avatar options – hodnoty odpovídají backendu a webu, obsahují image pro zobrazení
 */
export const AVATAR_OPTIONS = [
  { value: 'fem-pink', label: 'Růžové' },
  { value: 'fem-lavender', label: 'Levandulové' },
  { value: 'fem-peach', label: 'Broskvové' },
  { value: 'fem-dark', label: 'Tmavé' },
  { value: 'masc-blue', label: 'Modré' },
  { value: 'masc-teal', label: 'Tyrkysové' },
  { value: 'masc-navy', label: 'Tmavé krátké' },
  { value: 'masc-brown', label: 'Hnědé' },
  { value: 'nb-mint', label: 'Mátové' },
  { value: 'nb-lilac', label: 'Šeříkové' },
  { value: 'nb-curly', label: 'Kudrnaté mátové' },
  { value: 'nb-sage', label: 'Kudrnaté šalvějové' },
  { value: 'animal-cat', label: 'Kočka' },
  { value: 'animal-fox', label: 'Liška' },
  { value: 'animal-rabbit', label: 'Králík' },
  { value: 'animal-panda', label: 'Panda' },
  { value: 'animal-owl', label: 'Sova' },
  { value: 'sym-flower', label: 'Květ' },
  { value: 'sym-butterfly', label: 'Motýl' },
  { value: 'sym-rainbow', label: 'Duha' },
  { value: 'sym-star', label: 'Hvězda' },
  { value: 'sym-lotus', label: 'Lotos' },
  { value: 'sym-trans', label: 'Trans symbol' },
  { value: 'sym-pride', label: 'Trans duha' },
].map((o) => ({ ...o, image: getAvatarImageUri(o.value) }));
