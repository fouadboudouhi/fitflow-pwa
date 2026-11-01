// Weights are stored in kilograms. The unit setting only changes what the user sees and types.
import { intlLocale } from './i18n.js';
import { getSettings } from './storage.js';
import { number } from './util.js';

const LB = 2.2046226218;
export const unit = () => (getSettings().unit === 'lbs' ? 'lbs' : 'kg');
const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

// Kilograms -> number in the display unit.
export const toDisplay = (kg) => (unit() === 'lbs' ? round(number(kg) * LB, 1) : number(kg));
// Typed value in the display unit -> kilograms (kept as the user typed it when the unit is kg).
export const fromDisplay = (value) => {
  if (value === '' || value == null) return '';
  if (unit() === 'kg') return String(value).replace(',', '.');
  const n = number(value);
  return n ? String(round(n / LB, 3)) : '';
};
// Field value for an input: '' stays '', numbers are shown in the display unit.
export const fieldValue = (kg) => (kg === '' || kg == null ? '' : String(toDisplay(kg)));
// "42,5 kg" / "94 lbs"
export const fmtWeight = (kg, digits = 1) => {
  const v = toDisplay(kg);
  return `${v.toLocaleString(intlLocale(), { maximumFractionDigits: digits })} ${unit()}`;
};
export const fmtVolume = (kg) => `${Math.round(toDisplay(kg)).toLocaleString(intlLocale())} ${unit()}`;
// Smallest sensible step for warm-ups and suggestions: 2.5 kg or 5 lbs, expressed in kilograms.
export const plateStep = () => (unit() === 'lbs' ? 5 / LB : 2.5);
export const roundToStep = (kg) => {
  const step = plateStep();
  return Math.max(step, Math.round(number(kg) / step) * step);
};
export const LB_PER_KG = LB;
// The usual steps of a unit, swapped when the unit changes; values set by hand stay.
const near = (a, b) => Math.abs(a - b) < 0.01;
export const inUnit = (value, unitName, kg, lbs) => {
  if (unitName === 'lbs' && near(value, kg)) return lbs / LB_PER_KG;
  if (unitName === 'kg' && near(value, lbs / LB_PER_KG)) return kg;
  return value;
};
