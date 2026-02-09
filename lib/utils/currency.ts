import { APP_CURRENCY, APP_LOCALE } from "@/lib/constants/app";

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
});

export function formatZar(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "R0.00";
  }

  return currencyFormatter.format(value);
}
