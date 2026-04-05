"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn, getArtikelBadgeColor, getArtikelColor, shuffle } from "@/lib/utils";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import { ArrowLeft, CheckCircle2, XCircle, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
}

interface ArtikelQuestion {
  card: Card;
  correctArtikel: string;
}

export default function ArtikelDrillPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ArtikelQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    startTime: Date.now(),
  });

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=artikel`);
        const data = await res.json();
        if (data.cards) {
          // Sadece artikeli olan kartları filtrele
          const artikelCards: Card[] = (data.cards as Card[]).filter(
            (c) => c.artikel && c.artikel !== "-" && ["der", "die", "das"].includes(c.artikel.toLowerCase())
          );
          setCards(artikelCards);
          if (artikelCards.length >= 1) {
            const qs: ArtikelQuestion[] = shuffle(artikelCards).map((card) => ({
              card,
              correctArtikel: card.artikel!.toLowerCase(),
            }));
            setQuestions(qs);
          }
        }
      } catch {
        router.push(`/desteler/${deckId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [deckId, router]);

  const handleAnswer = (answer: string) => {
    if (result) return;

    const question = questions[currentIndex];
    const isCorrect = answer === question.correctArtikel;

    setSelectedAnswer(answer);
    setResult(isCorrect ? "correct" : "wrong");

    setStats((prev) => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      wrong: !isCorrect ? prev.wrong + 1 : prev.wrong,
    }));

    // SRS feedback
    fetch(`/api/kartlar/${question.card.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCorrect, source: "artikel" }),
    }).catch(() => {});

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setResult(null);
      } else {
        setCompleted(true);
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
          <Type className="w-8 h-8 text-indigo-500" />
        </div>
        <p className="text-gray-800 dark:text-gray-200 mb-2 font-semibold text-lg">Artikel Drill</p>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm max-w-xs">
          Bu destede artikeli olan (der/die/das) kart bulunamadi. Kartlara artikel ekleyerek baslayabilirsin.
        </p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>Geri Don</Button>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="artikel"
        cardsStudied={stats.correct + stats.wrong}
        correctCount={stats.correct}
        wrongCount={stats.wrong}
        duration={Math.round((Date.now() - stats.startTime) / 1000)}
        onRestart={() => {
          setQuestions(shuffle(cards).map((card) => ({
            card,
            correctArtikel: card.artikel!.toLowerCase(),
          })));
          setCurrentIndex(0);
          setSelectedAnswer(null);
          setResult(null);
          setCompleted(false);
          setStats({ correct: 0, wrong: 0, startTime: Date.now() });
        }}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const artikelOptions = ["der", "die", "das"];

  // Artikel renkleri
  const artikelButtonColor = (artikel: string, state: "default" | "correct" | "wrong" | "dimmed") => {
    const colors: Record<string, Record<string, string>> = {
      der: {
        default: "border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50",
        correct: "border-blue-500 bg-blue-200 text-blue-900 dark:bg-blue-800/50 dark:text-blue-200",
        wrong: "border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        dimmed: "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600 opacity-40",
      },
      die: {
        default: "border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-800 dark:border-pink-600 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-900/50",
        correct: "border-pink-500 bg-pink-200 text-pink-900 dark:bg-pink-800/50 dark:text-pink-200",
        wrong: "border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        dimmed: "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600 opacity-40",
      },
      das: {
        default: "border-green-300 bg-green-50 hover:bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50",
        correct: "border-green-500 bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200",
        wrong: "border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        dimmed: "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600 opacity-40",
      },
    };
    return colors[artikel]?.[state] || "";
  };

  const getButtonState = (artikel: string): "default" | "correct" | "wrong" | "dimmed" => {
    if (!result) return "default";
    if (artikel === currentQuestion.correctArtikel) return "correct";
    if (artikel === selectedAnswer && artikel !== currentQuestion.correctArtikel) return "wrong";
    return "dimmed";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/desteler/${deckId}`)}
            aria-label="Geri don"
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Artikel ilerlemesi"
              className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* Skor */}
      <div className="flex justify-center gap-6 pt-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-bold text-green-600 dark:text-green-400">{stats.correct}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-600 dark:text-red-400">{stats.wrong}</span>
        </div>
      </div>

      {/* Soru */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md md:max-w-lg">
          {/* Tip etiketi */}
          <div className="text-center mb-2">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Artikel Drill
            </span>
          </div>

          {/* Kelime kartı */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.card.id + currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-8"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Bu kelimenin artikeli nedir?
              </p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {currentQuestion.card.word}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentQuestion.card.wordTranslation}
              </p>

              {/* Doğru cevap göstergesi */}
              {result === "wrong" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4"
                >
                  <span
                    className={cn(
                      "inline-block px-4 py-1.5 rounded-full text-sm font-bold",
                      getArtikelBadgeColor(currentQuestion.correctArtikel)
                    )}
                  >
                    {currentQuestion.correctArtikel}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* der / die / das butonları */}
          <div className="grid grid-cols-3 gap-3">
            {artikelOptions.map((artikel) => {
              const state = getButtonState(artikel);
              return (
                <motion.button
                  key={artikel}
                  whileTap={!result ? { scale: 0.95 } : undefined}
                  onClick={() => handleAnswer(artikel)}
                  disabled={!!result}
                  className={cn(
                    "py-5 rounded-2xl border-2 font-bold text-xl transition-all",
                    artikelButtonColor(artikel, state)
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{artikel}</span>
                    {state === "correct" && (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {state === "wrong" && (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
