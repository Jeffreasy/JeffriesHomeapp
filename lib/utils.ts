import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert color_temp Kelvin to a warm/cool color for visual feedback */
export function kelvinToHex(k: number): string {
  const clamped = Math.max(2200, Math.min(6500, k));
  const t = (clamped - 2200) / (6500 - 2200);
  const r = Math.round(255 - t * 60);
  const g = Math.round(200 + t * 30);
  const b = Math.round(120 + t * 135);
  return `rgb(${r},${g},${b})`;
}

/** Convert RGB to hex string */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Convert hex to RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
}

/** Format device status for display */
export function formatStatus(status: string): string {
  return status === "online" ? "Online" : "Offline";
}
