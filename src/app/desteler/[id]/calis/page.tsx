"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn, getArtikelBadgeColor, getArtikelColor } from "@/lib/utils";
import { getEstimatedIntervals, type AnkiRating } from "@/lib/srs";
import { parseDeckSettings } from "@/lib/srs-settings";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import {
  ArrowLeft,
  Volume2,
  Eye,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface StudyCard {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
  plural: string | null;
  nominativ: string | null;
  akkusativ: string | null;
  dativ: string | null;
  exampleSentence: string | null;
  sentenceTranslation: string | null;
  notes: string | null;
  imageUrl: string | null;
  interval: number;
  repetitions: number;
  easeFactor: number;
  lapses: number;
  learningStep?: number;
  status: string;
}

interface StudyData {
  deck: {
    id: string;
    name: string;
    learningSteps?: string;
    graduatingInterval?: number;
    easyInterval?: number;
    relearningSteps?: string;
    lapseMinInterval?: number;
    maxInterval?: number;
    startingEase?: number;
    easyBonus?: number;
    intervalModifier?: number;
    hardModifier?: number;
  };
  queue: StudyCard[];
  counts: {
    learning: number;
    review: number;
    new: number;
    total: number;
  };
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [data, setData] = useState<StudyData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    startTime: Date.now(),
  });

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/calisma/${deckId}`);
      const result = await res.json();
      setData(result);
      if (result.queue.length === 0) {
        setCompleted(true);
      }
    } catch {
      router.push(`/desteler/${deckId}`);
    } finally {
      setLoading(false);
    }
  }, [deckId, router]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const currentCard = data?.queue[currentIndex];

  const handleRating = async (rating: AnkiRating) => {
    if (!currentCard || reviewing) return;
    setReviewing(true);

    try {
      await fetch("/api/calisma/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: currentCard.id, rating }),
      });

      setSessionStats((prev) => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: rating !== "again" ? prev.correct + 1 : prev.correct,
      }));

      // Sonraki kart
      if (currentIndex + 1 < (data?.queue.length || 0)) {
        setCurrentIndex((prev) => prev + 1);
        setShowAnswer(false);
      } else {
        // Kuyruktan tekrar fetch et (again seçilenler geri gelebilir)
        const res = await fetch(`/api/calisma/${deckId}`);
        const result = await res.json();
        if (result.queue.length === 0) {
          setCompleted(true);
        } else {
          setData(result);
          setCurrentIndex(0);
          setShowAnswer(false);
        }
      }
    } finally {
      setReviewing(false);
    }
  };

  // Klavye kısayolları
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!showAnswer && e.code === "Space") {
        e.preventDefault();
        setShowAnswer(true);
      }
      if (showAnswer) {
        if (e.key === "1") handleRating("again");
        if (e.key === "2") handleRating("hard");
        if (e.key === "3") handleRating("good");
        if (e.key === "4") handleRating("easy");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Tamamlandı ekranı
  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="review"
        cardsStudied={sessionStats.reviewed}
        correctCount={sessionStats.correct}
        wrongCount={sessionStats.reviewed - sessionStats.correct}
        duration={Math.round((Date.now() - sessionStats.startTime) / 1000)}
      />
    );
  }

  if (!currentCard || !data) return null;

  const progress = data.queue.length > 0
    ? ((currentIndex) / data.queue.length) * 100
    : 0;

  const deckSettings = data?.deck ? parseDeckSettings(data.deck) : undefined;
  const intervals = getEstimatedIntervals(
    {
      interval: currentCard.interval,
      repetitions: currentCard.repetitions,
      easeFactor: currentCard.easeFactor,
      lapses: currentCard.lapses,
      learningStep: currentCard.learningStep ?? 0,
    },
    deckSettings
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Üst bar */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/desteler/${deckId}`)}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2 text-xs font-medium">
            <span className="text-blue-600">{data.counts.new}</span>
            <span className="text-orange-500">{data.counts.learning}</span>
            <span className="text-green-600">{data.counts.review}</span>
          </div>
        </div>
      </div>

      {/* Kart */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Ön yüz - Almanca */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-6">
            {currentCard.artikel && currentCard.artikel !== "-" && (
              <span
                className={cn(
                  "inline-block px-3 py-1 rounded-full text-sm font-bold mb-3",
                  getArtikelBadgeColor(currentCard.artikel)
                )}
              >
                {currentCard.artikel}
              </span>
            )}
            <h2
              className={cn(
                "text-3xl font-bold mb-2",
                getArtikelColor(currentCard.artikel)
              )}
            >
              {currentCard.word}
            </h2>
            {currentCard.plural && (
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Çoğul: {currentCard.plural}
              </p>
            )}

            {/* Status badge */}
            <div className="mt-4">
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                  currentCard.status === "NEW" && "bg-blue-100 text-blue-700",
                  currentCard.status === "LEARNING" &&
                    "bg-orange-100 text-orange-700",
                  currentCard.status === "REVIEW" &&
                    "bg-green-100 text-green-700",
                  currentCard.status === "RELEARN" &&
                    "bg-red-100 text-red-700"
                )}
              >
                {currentCard.status === "NEW" && "Yeni"}
                {currentCard.status === "LEARNING" && "Öğrenme"}
                {currentCard.status === "REVIEW" && "Tekrar"}
                {currentCard.status === "RELEARN" && "Tekrar Öğrenme"}
              </span>
            </div>
          </div>

          {/* Arka yüz - Çeviri ve detaylar */}
          {showAnswer ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {currentCard.wordTranslation}
                </p>
              </div>

              {(currentCard.nominativ ||
                currentCard.akkusativ ||
                currentCard.dativ) && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
                    HAL EKLERİ
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {currentCard.nominativ && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">NOM</div>
                        <div className="font-medium">
                          {currentCard.nominativ}
                        </div>
                      </div>
                    )}
                    {currentCard.akkusativ && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">AKK</div>
                        <div className="font-medium">
                          {currentCard.akkusativ}
                        </div>
                      </div>
                    )}
                    {currentCard.dativ && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">DAT</div>
                        <div className="font-medium">{currentCard.dativ}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentCard.exampleSentence && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                    ÖRNEK CÜMLE
                  </h4>
                  <p className="text-sm italic text-gray-700 dark:text-gray-200">
                    &quot;{currentCard.exampleSentence}&quot;
                  </p>
                  {currentCard.sentenceTranslation && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {currentCard.sentenceTranslation}
                    </p>
                  )}
                </div>
              )}

              {currentCard.notes && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                    NOT
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{currentCard.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Cevabı Göster
            </button>
          )}
        </div>
      </div>

      {/* SRS Butonları */}
      {showAnswer && (
        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 safe-bottom">
          <div className="flex gap-2 max-w-md mx-auto">
            <button
              onClick={() => handleRating("again")}
              disabled={reviewing}
              className="srs-btn srs-again"
            >
              <div className="text-xs opacity-80">{intervals.again}</div>
              <div>Tekrar</div>
            </button>
            <button
              onClick={() => handleRating("hard")}
              disabled={reviewing}
              className="srs-btn srs-hard"
            >
              <div className="text-xs opacity-80">{intervals.hard}</div>
              <div>Zor</div>
            </button>
            <button
              onClick={() => handleRating("good")}
              disabled={reviewing}
              className="srs-btn srs-good"
            >
              <div className="text-xs opacity-80">{intervals.good}</div>
              <div>İyi</div>
            </button>
            <button
              onClick={() => handleRating("easy")}
              disabled={reviewing}
              className="srs-btn srs-easy"
            >
              <div className="text-xs opacity-80">{intervals.easy}</div>
              <div>Kolay</div>
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Kısayollar: 1=Tekrar, 2=Zor, 3=İyi, 4=Kolay | Boşluk=Cevabı Göster
          </p>
        </div>
      )}
    </div>
  );
}
