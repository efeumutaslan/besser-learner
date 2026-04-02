/**
 * SRS Settings Parser
 * Deck'teki integer/string SRS alanlarini kullanilabilir ayarlara cevirir
 */

export interface SRSSettings {
  // Ogrenme adimlari (dakika cinsinden)
  learningSteps: number[];
  graduatingInterval: number; // gun
  easyInterval: number;       // gun

  // Hatirlamama (lapse)
  relearningSteps: number[];  // dakika cinsinden
  lapseMinInterval: number;   // gun
  leechThreshold: number;

  // Araliklar
  maxInterval: number;        // gun
  startingEase: number;       // 2.50 gibi float
  easyBonus: number;          // 1.30 gibi float
  intervalModifier: number;   // 1.00 gibi float
  hardModifier: number;       // 1.20 gibi float
}

// Varsayilan degerler (Anki defaults)
export const DEFAULT_SRS_SETTINGS: SRSSettings = {
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
  relearningSteps: [10],
  lapseMinInterval: 1,
  leechThreshold: 8,
  maxInterval: 36500,
  startingEase: 2.5,
  easyBonus: 1.3,
  intervalModifier: 1.0,
  hardModifier: 1.2,
};

/**
 * Deck veritabani kaydindaki ham alanlari SRSSettings'e cevirir
 */
export function parseDeckSettings(deck: {
  learningSteps?: string;
  graduatingInterval?: number;
  easyInterval?: number;
  relearningSteps?: string;
  lapseMinInterval?: number;
  leechThreshold?: number;
  maxInterval?: number;
  startingEase?: number;
  easyBonus?: number;
  intervalModifier?: number;
  hardModifier?: number;
}): SRSSettings {
  return {
    learningSteps: parseSteps(deck.learningSteps, [1, 10]),
    graduatingInterval: deck.graduatingInterval ?? 1,
    easyInterval: deck.easyInterval ?? 4,
    relearningSteps: parseSteps(deck.relearningSteps, [10]),
    lapseMinInterval: deck.lapseMinInterval ?? 1,
    leechThreshold: deck.leechThreshold ?? 8,
    maxInterval: deck.maxInterval ?? 36500,
    startingEase: (deck.startingEase ?? 250) / 100,
    easyBonus: (deck.easyBonus ?? 130) / 100,
    intervalModifier: (deck.intervalModifier ?? 100) / 100,
    hardModifier: (deck.hardModifier ?? 120) / 100,
  };
}

/**
 * Virgulle ayrilmis string'i sayi dizisine cevirir
 * Ornek: "1,10" -> [1, 10]
 */
function parseSteps(input: string | undefined, fallback: number[]): number[] {
  if (!input) return fallback;
  const steps = input
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n) && n > 0);
  return steps.length > 0 ? steps : fallback;
}
