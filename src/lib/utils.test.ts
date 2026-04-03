import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getArtikelColor,
  getArtikelBgColor,
  getArtikelBadgeColor,
  formatDate,
  formatDuration,
  percentage,
  shuffle,
} from "./utils";

// --- getArtikelColor ---

describe("getArtikelColor", () => {
  it("returns der color for 'der'", () => {
    expect(getArtikelColor("der")).toBe("text-artikel-der");
  });

  it("returns die color for 'die'", () => {
    expect(getArtikelColor("die")).toBe("text-artikel-die");
  });

  it("returns das color for 'das'", () => {
    expect(getArtikelColor("das")).toBe("text-artikel-das");
  });

  it("returns default for null", () => {
    expect(getArtikelColor(null)).toBe("text-gray-700");
  });

  it("returns default for undefined", () => {
    expect(getArtikelColor(undefined)).toBe("text-gray-700");
  });

  it("is case insensitive", () => {
    expect(getArtikelColor("Der")).toBe("text-artikel-der");
    expect(getArtikelColor("DIE")).toBe("text-artikel-die");
    expect(getArtikelColor("DAS")).toBe("text-artikel-das");
  });

  it("returns default for unknown artikel", () => {
    expect(getArtikelColor("ein")).toBe("text-gray-700");
  });
});

// --- getArtikelBgColor ---

describe("getArtikelBgColor", () => {
  it("returns blue bg for der", () => {
    expect(getArtikelBgColor("der")).toContain("bg-blue-50");
  });

  it("returns pink bg for die", () => {
    expect(getArtikelBgColor("die")).toContain("bg-pink-50");
  });

  it("returns green bg for das", () => {
    expect(getArtikelBgColor("das")).toContain("bg-green-50");
  });

  it("returns gray bg for null", () => {
    expect(getArtikelBgColor(null)).toContain("bg-gray-50");
  });
});

// --- getArtikelBadgeColor ---

describe("getArtikelBadgeColor", () => {
  it("returns blue badge for der", () => {
    expect(getArtikelBadgeColor("der")).toBe("bg-blue-500 text-white");
  });

  it("returns pink badge for die", () => {
    expect(getArtikelBadgeColor("die")).toBe("bg-pink-500 text-white");
  });

  it("returns green badge for das", () => {
    expect(getArtikelBadgeColor("das")).toBe("bg-green-500 text-white");
  });

  it("returns gray badge for unknown", () => {
    expect(getArtikelBadgeColor(null)).toBe("bg-gray-500 text-white");
  });
});

// --- formatDuration ---

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45sn");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1dk 30sn");
  });

  it("formats hours, minutes", () => {
    expect(formatDuration(3661)).toBe("1sa 1dk");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0sn");
  });

  it("formats exact minutes", () => {
    expect(formatDuration(120)).toBe("2dk 0sn");
  });

  it("boundary at 59 seconds", () => {
    expect(formatDuration(59)).toBe("59sn");
  });

  it("boundary at 60 seconds", () => {
    expect(formatDuration(60)).toBe("1dk 0sn");
  });
});

// --- percentage ---

describe("percentage", () => {
  it("calculates correct percentage", () => {
    expect(percentage(50, 100)).toBe(50);
  });

  it("returns 0 when total is 0", () => {
    expect(percentage(5, 0)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
  });

  it("returns 100 for equal values", () => {
    expect(percentage(10, 10)).toBe(100);
  });

  it("returns 0 for zero part", () => {
    expect(percentage(0, 100)).toBe(0);
  });
});

// --- shuffle ---

describe("shuffle", () => {
  it("returns array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(5);
  });

  it("contains all original elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it("handles empty array", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

// --- formatDate ---

describe("formatDate", () => {
  it("formats date in Turkish locale", () => {
    const date = new Date("2026-04-01T12:00:00");
    const result = formatDate(date);
    // Should contain day, month name in Turkish, and year
    expect(result).toContain("2026");
    expect(result).toMatch(/\d/); // has a number (day)
  });
});
