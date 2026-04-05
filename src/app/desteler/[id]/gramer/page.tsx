"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn, shuffle } from "@/lib/utils";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
  nominativ: string | null;
  akkusativ: string | null;
  dativ: string | null;
}

type GrammarCase = "nominativ" | "akkusativ" | "dativ";

interface GrammarQuestion {
  card: Card;
  targetCase: GrammarCase;
  correctAnswer: string;
  givenForm: string;
}

const CASE_LABELS: Record<GrammarCase, string> = {
  nominativ: "Nominativ",
  akkusativ: "Akkusativ",
  dativ: "Dativ",
};

const CASE_COLORS: Record<GrammarCase, string> = {
  nominativ: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  akkusativ: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  dativ: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function GrammarDrillPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    startTime: Date.now(),
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=grammar`);
        const data = await res.json();
        if (data.cards) {
          const grammarCards = (data.cards as Card[]).filter(
            (c) => c.nominativ && (c.akkusativ || c.dativ)
          );

          const qs: GrammarQuestion[] = [];

          for (const card of grammarCards) {
            if (card.akkusativ && card.nominativ) {
              qs.push({
                card,
                targetCase: "akkusativ",
                correctAnswer: card.akkusativ,
                givenForm: card.nominativ,
              });
            }
            if (card.dativ && card.nominativ) {
              qs.push({
                card,
                targetCase: "dativ",
                correctAnswer: card.dativ,
                givenForm: card.nominativ,
              });
            }
          }

          setQuestions(shuffle(qs));
        }
      } catch {
        router.push(`/desteler/${deckId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [deckId, router]);

  // Auto-focus input on question change
  useEffect(() => {
    if (!loading && !completed && !result) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, loading, completed, result]);

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  const handleSubmit = () => {
    if (result || !userInput.trim()) return;

    const question = questions[currentIndex];
    const isCorrect = normalize(userInput) === normalize(question.correctAnswer);

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
      body: JSON.stringify({ isCorrect, source: "grammar" }),
    }).catch(() => {});
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput("");
      setResult(null);
    } else {
      setCompleted(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (result) {
        handleNext();
      } else {
        handleSubmit();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">Gramer Drill</p>
        <p className="text-gray-400 dark:text-gray-500 mb-4 text-sm">
          Bu destede hal eki (Nominativ/Akkusativ/Dativ) bilgisi olan kart bulunamadi.
        </p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>Geri Don</Button>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="grammar"
        cardsStudied={stats.correct + stats.wrong}
        correctCount={stats.correct}
        wrongCount={stats.wrong}
        duration={Math.round((Date.now() - stats.startTime) / 1000)}
        onRestart={() => {
          setQuestions(shuffle(questions));
          setCurrentIndex(0);
          setUserInput("");
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/desteler/${deckId}`)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-violet-500 rounded-full"
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
          <div className="text-center mb-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Gramer Drill
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.card.id + currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-6"
            >
              {/* Hal eki badge */}
              <span className={cn(
                "inline-block px-3 py-1 rounded-full text-xs font-bold mb-4",
                CASE_COLORS[currentQuestion.targetCase]
              )}>
                {CASE_LABELS[currentQuestion.targetCase]}
              </span>

              {/* Nominativ formu */}
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">Nominativ:</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {currentQuestion.givenForm}
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                ({currentQuestion.card.wordTranslation})
              </p>

              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {CASE_LABELS[currentQuestion.targetCase]} halini yaz:
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Input */}
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!result}
              placeholder="ör: dem Haus"
              autoComplete="off"
              autoCapitalize="off"
              className={cn(
                "w-full px-5 py-4 rounded-2xl border-2 text-center text-lg font-semibold transition-all outline-none",
                !result && "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800",
                result === "correct" && "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                result === "wrong" && "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              )}
            />

            {/* Sonuç mesajı */}
            {result === "correct" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Dogru!</span>
              </motion.div>
            )}

            {result === "wrong" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-1">
                  <XCircle className="w-5 h-5" />
                  <span className="font-semibold">Yanlis</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Dogru cevap: <span className="font-bold text-green-600 dark:text-green-400">{currentQuestion.correctAnswer}</span>
                </p>
              </motion.div>
            )}

            {/* Buton */}
            {!result ? (
              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="w-full py-4 rounded-2xl bg-violet-500 text-white font-semibold text-lg hover:bg-violet-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Kontrol Et
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-2xl bg-violet-500 text-white font-semibold text-lg hover:bg-violet-600 transition-all"
              >
                {currentIndex + 1 < questions.length ? "Sonraki" : "Bitir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
