import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// lib/utils.ts
export function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + "K";
  }
  return num.toFixed(decimals);
}

export function formatCurrency(num: number, decimals: number = 2): string {
  if (num === 0) return "$0.00";
  if (Math.abs(num) < 0.01) {
    return "<$0.01";
  }

  if (num >= 1_000_000_000) {
    return "$" + (num / 1_000_000_000).toFixed(decimals) + "B";
  }
  if (num >= 1_000_000) {
    return "$" + (num / 1_000_000).toFixed(decimals) + "M";
  }
  if (num >= 1_000) {
    return "$" + (num / 1_000).toFixed(decimals) + "K";
  }
  return "$" + num.toFixed(decimals);
}

export function calculatePercentChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function parseTokenAmount(amount: string | number): number {
  if (typeof amount === "string") {
    return parseFloat(amount.replace(/,/g, ""));
  }
  return amount;
}

export function validateNumber(value: any): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}
