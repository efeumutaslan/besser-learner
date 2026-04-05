"use client";

import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, Clock, Plus } from "lucide-react";
import Link from "next/link";

interface DeckCardProps {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  totalCards: number;
  newCount: number;
  reviewCount: number;
  learningCount: number;
}

export default function DeckCard({
  id,
  name,
  description,
  color,
  totalCards,
  newCount,
  reviewCount,
  learningCount,
}: DeckCardProps) {
  const dueCount = newCount + reviewCount + learningCount;

  return (
    <Link href={`/desteler/${id}`} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all hover:border-brand-300 dark:hover:border-brand-500 active:scale-[0.99]">
        <div className="flex items-start gap-3">
          {/* Deck icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + "20" }}
          >
            <BookOpen className="w-6 h-6" style={{ color }} />
          </div>

          {/* Deck info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base truncate">{name}</h3>
              <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-500 group-hover:text-brand-500 transition-colors flex-shrink-0" />
            </div>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {totalCards} kart
              </span>
              {dueCount > 0 && (
                <div className="flex items-center gap-1.5">
                  {newCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {newCount} yeni
                    </span>
                  )}
                  {learningCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      {learningCount} öğrenme
                    </span>
                  )}
                  {reviewCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {reviewCount} tekrar
                    </span>
                  )}
                </div>
              )}
              {dueCount === 0 && totalCards > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Clock className="w-3 h-3" />
                  Tamamlandı
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function NewDeckCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 hover:border-brand-400 hover:bg-brand-50 dark:hover:border-brand-500 dark:hover:bg-brand-900/20 transition-all group"
    >
      <div className="flex items-center justify-center gap-2 py-2">
        <Plus className="w-5 h-5 text-gray-500 group-hover:text-brand-500" />
        <span className="font-semibold text-gray-500 dark:text-gray-400 group-hover:text-brand-600">
          Yeni Deste Oluştur
        </span>
      </div>
    </button>
  );
}
