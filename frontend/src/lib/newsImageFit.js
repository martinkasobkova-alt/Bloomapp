/**
 * Možnosti ořezu fotky u aktualit a zkušeností.
 * image_fit se ukládá do API a použije se při zobrazení obrázku (object-fit + object-position).
 */
export const IMAGE_FIT_OPTIONS = [
  { value: 'cover', label: 'Vyplnit (oříznutí)' },
  { value: 'cover-top', label: 'Vyplnit – důraz na horní část' },
  { value: 'cover-center', label: 'Vyplnit – důraz na střed' },
  { value: 'cover-bottom', label: 'Vyplnit – důraz na spodní část' },
  { value: 'contain', label: 'Celá fotka (bez oříznutí)' },
];

const FIT_CLASSES = {
  cover: 'object-cover object-center',
  'cover-top': 'object-cover object-top',
  'cover-center': 'object-cover object-center',
  'cover-bottom': 'object-cover object-bottom',
  contain: 'object-contain object-center',
};

export function getImageFitClass(imageFit) {
  return FIT_CLASSES[imageFit] || FIT_CLASSES.cover;
}
