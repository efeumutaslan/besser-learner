"use client";

import { useEffect, useState } from "react";
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
  givenForm: string;       // gösterilen form (nominativ)
  options: string[];
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
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=grammar`);
        const data = await res.json();
        if (data.cards) {
          const grammarCards = (data.cards as Card[]).filter(
            (c) => c.nominativ && (c.akkusativ || c.dativ)
          );

          const qs: GrammarQuestion[] = [];

          for (const card of grammarCards) {
            // Nominativ verilip Akkusativ soran soru
            if (card.akkusativ && card.nominativ) {
              qs.push({
                card,
                targetCase: "akkusativ",
                correctAnswer: card.akkusativ,
                givenForm: card.nominativ,
                options: generateOptions(card, "akkusativ", grammarCards),
              });
            }
            // Nominativ verilip Dativ soran soru
            if (card.dativ && card.nominativ) {
              qs.push({
                card,
                targetCase: "dativ",
                correctAnswer: card.dativ,
                givenForm: card.nominativ,
                options: generateOptions(card, "dativ", grammarCards),
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

  const handleAnswer = (answer: string) => {
    if (result) return;

    const question = questions[currentIndex];
    const isCorrect = answer === question.correctAnswer;

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
      body: JSON.stringify({ isCorrect, source: "grammar" }),
    }).catch(() => {});

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setResult(null);
      } else {
        setCompleted(true);
      }
    }, 1200);
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
          Bu destede hal eki (Nominativ/Akkusativ/Dativ) bilgisi olan kart bulunamadı.
        </p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>Geri Dön</Button>
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
        <div className="w-full max-w-md">
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
                  {CASE_LABELS[currentQuestion.targetCase]} hali nedir?
                </p>
              </div>

              {/* Doğru cevap */}
              {result === "wrong" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-sm font-bold text-green-600 dark:text-green-400"
                >
                  Doğru: {currentQuestion.correctAnswer}
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Seçenekler */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === currentQuestion.correctAnswer;
              const showResult = result !== null;

              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(option)}
                  disabled={!!result}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-center font-semibold transition-all",
                    !showResult &&
                      "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 text-gray-800 dark:text-gray-200",
                    showResult && isCorrectOption &&
                      "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                    showResult && isSelected && !isCorrectOption &&
                      "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
                    showResult && !isSelected && !isCorrectOption &&
                      "border-gray-200 dark:border-gray-700 opacity-40"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{option}</span>
                    {showResult && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {showResult && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500" />}
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

/** Yanlış seçenekler oluşturur */
function generateOptions(card: Card, targetCase: GrammarCase, allCards: Card[]): string[] {
  const correct = card[targetCase]!;
  const wrongOptions: string[] = [];

  // Diğer kartlardan aynı hal ekini al
  for (const c of shuffle(allCards)) {
    if (c.id === card.id) continue;
    const val = c[targetCase];
    if (val && val !== correct && !wrongOptions.includes(val)) {
      wrongOptions.push(val);
    }
    if (wrongOptions.length >= 3) break;
  }

  // Yeterli seçenek yoksa, aynı kartın farklı hallerini ekle
  if (wrongOptions.length < 3 && card.nominativ && card.nominativ !== correct && !wrongOptions.includes(card.nominativ)) {
    wrongOptions.push(card.nominativ);
  }
  if (wrongOptions.length < 3 && card.akkusativ && card.akkusativ !== correct && !wrongOptions.includes(card.akkusativ)) {
    wrongOptions.push(card.akkusativ);
  }
  if (wrongOptions.length < 3 && card.dativ && card.dativ !== correct && !wrongOptions.includes(card.dativ)) {
    wrongOptions.push(card.dativ);
  }

  return shuffle([correct, ...wrongOptions.slice(0, 3)]);
}
