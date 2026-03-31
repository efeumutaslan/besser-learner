import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Artikel rengini döndür
export function getArtikelColor(artikel: string | null | undefined): string {
  switch (artikel?.toLowerCase()) {
    case "der":
      return "text-artikel-der"; // Mavi
    case "die":
      return "text-artikel-die"; // Kırmızı
    case "das":
      return "text-artikel-das"; // Yeşil
    default:
      return "text-gray-700";
  }
}

export function getArtikelBgColor(artikel: string | null | undefined): string {
  switch (artikel?.toLowerCase()) {
    case "der":
      return "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700";
    case "die":
      return "bg-pink-50 border-pink-300 dark:bg-pink-950 dark:border-pink-700";
    case "das":
      return "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700";
    default:
      return "bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600";
  }
}

export function getArtikelBadgeColor(artikel: string | null | undefined): string {
  switch (artikel?.toLowerCase()) {
    case "der":
      return "bg-blue-500 text-white";
    case "die":
      return "bg-pink-500 text-white";
    case "das":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

// Tarih formatlama
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

// Süre formatlama (saniye -> okunabilir)
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}sn`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}dk ${secs}sn`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}sa ${remainMins}dk`;
}

// Yüzde hesapla
export function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// Diziyi karıştır (Fisher-Yates)
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
