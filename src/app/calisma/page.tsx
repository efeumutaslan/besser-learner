"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { GraduationCap, Play, BookOpen, Headphones } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Deck {
  id: string;
  name: string;
  color: string;
  newCount: number;
  reviewCount: number;
  learningCount: number;
  totalCards: number;
}

export default function StudyOverviewPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/desteler")
      .then((res) => res.json())
      .then(setDecks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const decksWithDue = decks.filter(
    (d) => d.newCount + d.reviewCount + d.learningCount > 0
  );

  return (
    <div className="pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-1">Çalış</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Günlük tekrarlarını tamamla
        </p>
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : decksWithDue.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              {decks.length === 0
                ? "Henüz deste oluşturmadın"
                : "Bugünkü tekrarların tamamlandı!"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {decks.length === 0
                ? "Ana sayfadan yeni bir deste oluştur"
                : "Pratik modlarıyla çalışmaya devam edebilirsin"}
            </p>
            {decks.length === 0 && (
              <Button onClick={() => router.push("/")}>
                Ana Sayfaya Git
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-4 border border-brand-200 dark:border-brand-700">
              <h3 className="font-semibold text-brand-800 dark:text-brand-200 mb-1">
                Bugün çalışılacak
              </h3>
              <p className="text-sm text-brand-600">
                {decksWithDue.reduce(
                  (s, d) => s + d.newCount + d.reviewCount + d.learningCount,
                  0
                )}{" "}
                kart, {decksWithDue.length} destede bekliyor
              </p>
            </div>

            {decksWithDue.map((deck) => {
              const dueCount =
                deck.newCount + deck.reviewCount + deck.learningCount;

              return (
                <button
                  key={deck.id}
                  onClick={() => router.push(`/desteler/${deck.id}/calis`)}
                  className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-brand-300 transition-all text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: deck.color + "20" }}
                  >
                    <Play className="w-5 h-5" style={{ color: deck.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{deck.name}</h3>
                    <div className="flex gap-2 mt-1">
                      {deck.newCount > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {deck.newCount} yeni
                        </span>
                      )}
                      {deck.learningCount > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {deck.learningCount} öğrenme
                        </span>
                      )}
                      {deck.reviewCount > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {deck.reviewCount} tekrar
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-brand-600">
                    {dueCount}
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* Moduller */}
        <div className="pt-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            MODÜLLER
          </h3>
          <button
            onClick={() => router.push("/modules/easy-german")}
            className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Easy German</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Hören — YouTube videolariyla dinleme calismasi
              </p>
            </div>
            <Play className="w-5 h-5 text-orange-500" />
          </button>
        </div>

        {/* Tüm destelerde pratik yapma */}
        {decks.length > 0 && decks.some((d) => d.totalCards > 0) && (
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              PRATİK YAP
            </h3>
            <div className="space-y-2">
              {decks
                .filter((d) => d.totalCards > 0)
                .map((deck) => (
                  <div
                    key={deck.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <BookOpen
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: deck.color }}
                    />
                    <span className="flex-1 font-medium text-sm">
                      {deck.name}
                    </span>
                    <button
                      onClick={() =>
                        router.push(`/desteler/${deck.id}/ogren`)
                      }
                      className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200"
                    >
                      Öğren
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/desteler/${deck.id}/test`)
                      }
                      className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium hover:bg-purple-200"
                    >
                      Test
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
