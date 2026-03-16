// New file - date/time utilities
export function now(): Date {
  return new Date();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function nowTimestamp(): number {
  return Date.now();
}