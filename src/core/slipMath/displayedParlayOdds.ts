import { americanToDecimal } from './parlayMath';

export const parseAmericanOdds = (value: string | number | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return Math.trunc(value);
  if (typeof value !== 'string') return null;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return Math.trunc(parsed);
};

export const decimalToAmericanDisplayed = (decimal: number): number => {
  if (!Number.isFinite(decimal) || decimal <= 1) return 100;
  const raw = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
  return raw >= 0 ? Math.round(raw / 5) * 5 : Math.round(raw);
};

export const combineDisplayedParlayOdds = (legs: Array<string | number | undefined>): { american: number; decimal: number; usedLegs: number } => {
  const parsed = legs.map(parseAmericanOdds).filter((v): v is number => typeof v === 'number');
  const decimal = parsed.reduce((acc, odd) => acc * americanToDecimal(odd), 1);
  return {
    american: decimalToAmericanDisplayed(decimal),
    decimal: Number(decimal.toFixed(4)),
    usedLegs: parsed.length
  };
};
