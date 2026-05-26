import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten an EVM address to 0x1234…abcd for display. */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format a USD price, adapting decimal places to the magnitude (e.g. SHIB). */
export function formatPrice(value: number): string {
  const decimals = value >= 100 ? 2 : value >= 1 ? 3 : value >= 0.01 ? 4 : 8;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
