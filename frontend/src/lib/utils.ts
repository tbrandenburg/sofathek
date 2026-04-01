import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Pure utility: cap grid columns to the actual number of cards (max 4).
// Uses complete Tailwind class literals so JIT purging never removes them.
export const getGridColsClass = (count: number): string => {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-4'; // cap at 4 for larger groups
};
