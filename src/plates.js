// Plate calculator for barbell exercises: which plates go on each side.
import { libraryOf } from './library.js';
import { LB_PER_KG, unit } from './units.js';
import { number } from './util.js';

export const PLATES = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lbs: [45, 35, 25, 10, 5, 2.5] };
export const BARS = { kg: [20, 15, 10], lbs: [45, 35, 15] };

// All values in the display unit. Returns the plates per side (largest first) and what could not be loaded.
export function platesPerSide(target, bar, available = PLATES[unit()]) {
  let perSide = (number(target) - number(bar)) / 2;
  if (perSide <= 0) return { plates: [], remainder: 0, perSide: Math.max(0, perSide) };
  const plates = [];
  for (const plate of available) {
    while (perSide + 1e-9 >= plate) {
      plates.push(plate);
      perSide -= plate;
    }
  }
  return { plates, remainder: Math.round(perSide * 100) / 100, perSide: (number(target) - number(bar)) / 2 };
}
// Catalogue exercises decide by equipment; custom exercises only have the name the user typed.
export const isBarbell = (ex) => {
  const lib = libraryOf(ex);
  if (lib) return lib.equipment === 'barbell' || lib.equipment === 'ez barbell';
  return /barbell|langhantel|sz-|ez |deadlift|kreuzheben|squat|kniebeuge|bench press|bankdrücken/i.test(
    ex?.name || ''
  );
};
export const defaultBar = () => (unit() === 'lbs' ? 45 : 20);
export const barInKg = (bar) => (unit() === 'lbs' ? number(bar) / LB_PER_KG : number(bar));
