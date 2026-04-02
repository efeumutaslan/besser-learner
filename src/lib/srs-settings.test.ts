import { describe, it, expect } from "vitest";
import { parseDeckSettings, DEFAULT_SRS_SETTINGS } from "./srs-settings";

describe("parseDeckSettings", () => {
  it("should return defaults for empty object", () => {
    const result = parseDeckSettings({});
    expect(result.learningSteps).toEqual([1, 10]);
    expect(result.graduatingInterval).toBe(1);
    expect(result.easyInterval).toBe(4);
    expect(result.relearningSteps).toEqual([10]);
    expect(result.startingEase).toBe(2.5);
    expect(result.easyBonus).toBe(1.3);
    expect(result.intervalModifier).toBe(1.0);
    expect(result.hardModifier).toBe(1.2);
    expect(result.maxInterval).toBe(36500);
  });

  it("should parse learning steps string", () => {
    const result = parseDeckSettings({ learningSteps: "1,5,15" });
    expect(result.learningSteps).toEqual([1, 5, 15]);
  });

  it("should handle whitespace in steps", () => {
    const result = parseDeckSettings({ learningSteps: " 2 , 10 , 30 " });
    expect(result.learningSteps).toEqual([2, 10, 30]);
  });

  it("should fall back for invalid steps", () => {
    const result = parseDeckSettings({ learningSteps: "abc,xyz" });
    expect(result.learningSteps).toEqual([1, 10]); // fallback
  });

  it("should filter out zero/negative steps", () => {
    const result = parseDeckSettings({ learningSteps: "0,-5,10" });
    expect(result.learningSteps).toEqual([10]);
  });

  it("should convert startingEase from integer to float", () => {
    const result = parseDeckSettings({ startingEase: 300 });
    expect(result.startingEase).toBe(3.0);
  });

  it("should convert easyBonus from integer to float", () => {
    const result = parseDeckSettings({ easyBonus: 150 });
    expect(result.easyBonus).toBe(1.5);
  });

  it("should convert intervalModifier from integer to float", () => {
    const result = parseDeckSettings({ intervalModifier: 80 });
    expect(result.intervalModifier).toBe(0.8);
  });

  it("should convert hardModifier from integer to float", () => {
    const result = parseDeckSettings({ hardModifier: 110 });
    expect(result.hardModifier).toBe(1.1);
  });

  it("should pass through integer fields directly", () => {
    const result = parseDeckSettings({
      graduatingInterval: 3,
      easyInterval: 7,
      lapseMinInterval: 2,
      leechThreshold: 5,
      maxInterval: 180,
    });
    expect(result.graduatingInterval).toBe(3);
    expect(result.easyInterval).toBe(7);
    expect(result.lapseMinInterval).toBe(2);
    expect(result.leechThreshold).toBe(5);
    expect(result.maxInterval).toBe(180);
  });
});

describe("DEFAULT_SRS_SETTINGS", () => {
  it("should match Anki defaults", () => {
    expect(DEFAULT_SRS_SETTINGS.learningSteps).toEqual([1, 10]);
    expect(DEFAULT_SRS_SETTINGS.graduatingInterval).toBe(1);
    expect(DEFAULT_SRS_SETTINGS.easyInterval).toBe(4);
    expect(DEFAULT_SRS_SETTINGS.startingEase).toBe(2.5);
    expect(DEFAULT_SRS_SETTINGS.easyBonus).toBe(1.3);
    expect(DEFAULT_SRS_SETTINGS.intervalModifier).toBe(1.0);
    expect(DEFAULT_SRS_SETTINGS.hardModifier).toBe(1.2);
    expect(DEFAULT_SRS_SETTINGS.maxInterval).toBe(36500);
  });
});
