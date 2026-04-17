import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "./date";

/** Pin Date.now() to a fixed timestamp so tests are deterministic */
function mockNow(isoString: string) {
  const fixed = new Date(isoString).getTime();
  vi.spyOn(Date, "now").mockReturnValue(fixed);
}

const NOW = "2026-04-17T12:00:00Z";

beforeEach(() => {
  vi.useFakeTimers();
  mockNow(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function daysAgo(n: number): string {
  return new Date(new Date(NOW).getTime() - n * 86_400_000).toISOString();
}

function minutesAgo(n: number): string {
  return new Date(new Date(NOW).getTime() - n * 60_000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(new Date(NOW).getTime() - n * 3_600_000).toISOString();
}

describe("formatRelativeTime", () => {
  it("returns '0m ago' for now", () => {
    expect(formatRelativeTime(NOW)).toBe("0m ago");
  });

  it("returns '1m ago' for 1 minute ago", () => {
    expect(formatRelativeTime(minutesAgo(1))).toBe("1m ago");
  });

  it("returns '59m ago' for 59 minutes ago", () => {
    expect(formatRelativeTime(minutesAgo(59))).toBe("59m ago");
  });

  it("returns '1h ago' for exactly 1 hour ago", () => {
    expect(formatRelativeTime(hoursAgo(1))).toBe("1h ago");
  });

  it("returns '23h ago' for 23 hours ago", () => {
    expect(formatRelativeTime(hoursAgo(23))).toBe("23h ago");
  });

  it("returns '1d ago' for 1 day ago", () => {
    expect(formatRelativeTime(daysAgo(1))).toBe("1d ago");
  });

  it("returns '6d ago' for 6 days ago", () => {
    expect(formatRelativeTime(daysAgo(6))).toBe("6d ago");
  });

  it("returns '1wk ago' for 7 days ago", () => {
    expect(formatRelativeTime(daysAgo(7))).toBe("1wk ago");
  });

  it("returns '4wk ago' for 29 days ago", () => {
    expect(formatRelativeTime(daysAgo(29))).toBe("4wk ago");
  });

  it("returns '1mo ago' for 30 days ago", () => {
    expect(formatRelativeTime(daysAgo(30))).toBe("1mo ago");
  });

  it("returns '12mo ago' for 364 days ago (floor(364/30) = 12)", () => {
    expect(formatRelativeTime(daysAgo(364))).toBe("12mo ago");
  });

  it("returns '1y ago' for exactly 365 days ago", () => {
    expect(formatRelativeTime(daysAgo(365))).toBe("1y ago");
  });

  it("returns '2y ago' for 730 days ago", () => {
    expect(formatRelativeTime(daysAgo(730))).toBe("2y ago");
  });
});
