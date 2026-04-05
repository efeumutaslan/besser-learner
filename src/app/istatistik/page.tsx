"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { BarChart3, TrendingUp, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeckStats {
  id: string;
  name: string;
  color: string;
  totalCards: number;
  newCount: number;
  reviewCount: number;
  learningCount: number;
}

export default function StatsPage() {
  const [decks, setDecks] = useState<DeckStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/desteler")
      .then((res) => res.json())
      .then(setDecks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalCards = decks.reduce((s, d) => s + d.totalCards, 0);
  const totalNew = decks.reduce((s, d) => s + d.newCount, 0);
  const totalLearning = decks.reduce((s, d) => s + d.learningCount, 0);
  const totalReview = decks.reduce((s, d) => s + d.reviewCount, 0);
  const totalMature = totalCards - totalNew - totalLearning;

  return (
    <div className="pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-1">İstatistikler</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Öğrenme ilerlemeniz</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Genel istatistikler */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-brand-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Toplam Kart</span>
            </div>
            <div className="text-2xl font-bold">{totalCards}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Öğrenilmiş</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {totalMature > 0 ? totalMature : 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Yeni Kart</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalNew}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Bekleyen</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {totalReview + totalLearning}
            </div>
          </div>
        </div>

        {/* Kart durumu çubuğu */}
        {totalCards > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              Kart Durumu
            </h3>
            <div className="h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex">
              {totalNew > 0 && (
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{
                    width: `${(totalNew / totalCards) * 100}%`,
                  }}
                />
              )}
              {totalLearning > 0 && (
                <div
                  className="bg-orange-500 h-full transition-all"
                  style={{
                    width: `${(totalLearning / totalCards) * 100}%`,
                  }}
                />
              )}
              {totalMature > 0 && (
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{
                    width: `${(Math.max(0, totalMature) / totalCards) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Yeni ({totalNew})
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Öğrenme ({totalLearning})
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Öğrenilmiş ({Math.max(0, totalMature)})
              </div>
            </div>
          </div>
        )}

        {/* Deste bazlı istatistikler */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            DESTE DETAYLARI
          </h3>
          <div className="space-y-2">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: deck.color }}
                    />
                    <span className="font-medium text-sm">{deck.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {deck.totalCards} kart
                  </span>
                </div>
                {deck.totalCards > 0 && (
                  <div className="h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex">
                    <div
                      className="bg-blue-500 h-full"
                      style={{
                        width: `${(deck.newCount / deck.totalCards) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-orange-500 h-full"
                      style={{
                        width: `${(deck.learningCount / deck.totalCards) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-green-500 h-full"
                      style={{
                        width: `${(Math.max(0, deck.totalCards - deck.newCount - deck.learningCount) / deck.totalCards) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
