"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn, shuffle } from "@/lib/utils";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
  exampleSentence: string | null;
  sentenceTranslation: string | null;
}

interface ClozeQuestion {
  card: Card;
  sentence: string;       // blanked sentence: "Ich ___ ein Buch."
  answer: string;          // the blanked word
  sentenceTranslation: string | null;
  hint: string;            // first letter hint
}

/**
 * Cümle içinden kelimeyi bulup boşluk bırakır.
 * Kelime büyük/küçük harf fark etmeksizin aranır.
 * Kelimenin conjugated/declined formları da bulunabilsin diye
 * word stem'ini de arar (en az 3 karakter).
 */
function createCloze(sentence: string, word: string): { blanked: string; answer: string } | null {
  // Tam eşleşme dene (case-insensitive)
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  const match = sentence.match(regex);
  if (match) {
    const blanked = sentence.replace(regex, "___");
    return { blanked, answer: match[0] };
  }

  // Kök eşleşme dene (en az 3 karakter stem)
  if (word.length >= 4) {
    const stem = word.slice(0, Math.max(3, Math.ceil(word.length * 0.6)));
    const stemRegex = new RegExp(`\\b(${escapeRegExp(stem)}\\w*)\\b`, "i");
    const stemMatch = sentence.match(stemRegex);
    if (stemMatch) {
      const blanked = sentence.replace(stemRegex, "___");
      return { blanked, answer: stemMatch[1] };
    }
  }

  return null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function ClozeModePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ClozeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    startTime: Date.now(),
  });

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=cloze`);
        const data = await res.json();
        if (data.cards) {
          const cardsWithSentences = (data.cards as Card[]).filter(
            (c) => c.exampleSentence && c.exampleSentence.length > 0
          );

          const qs: ClozeQuestion[] = [];
          for (const card of shuffle(cardsWithSentences)) {
            const cloze = createCloze(card.exampleSentence!, card.word);
            if (cloze) {
              qs.push({
                card,
                sentence: cloze.blanked,
                answer: cloze.answer,
                sentenceTranslation: card.sentenceTranslation,
                hint: cloze.answer[0].toUpperCase() + "...",
              });
            }
          }
          setQuestions(qs);
        }
      } catch {
        router.push(`/desteler/${deckId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [deckId, router]);

  useEffect(() => {
    if (!result && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, result]);

  const handleSubmit = () => {
    if (result || !userAnswer.trim()) return;

    const question = questions[currentIndex];
    const isCorrect = userAnswer.trim().toLowerCase() === question.answer.toLowerCase();

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
      body: JSON.stringify({ isCorrect, source: "cloze" }),
    }).catch(() => {});

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setUserAnswer("");
        setResult(null);
        setShowHint(false);
      } else {
        setCompleted(true);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">Cümle Tamamlama</p>
        <p className="text-gray-400 dark:text-gray-500 mb-4 text-sm">
          Bu destede örnek cümlesi olan kart bulunamadı.
        </p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>Geri Dön</Button>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="cloze"
        cardsStudied={stats.correct + stats.wrong}
        correctCount={stats.correct}
        wrongCount={stats.wrong}
        duration={Math.round((Date.now() - stats.startTime) / 1000)}
        onRestart={() => {
          setQuestions(shuffle(questions));
          setCurrentIndex(0);
          setUserAnswer("");
          setResult(null);
          setShowHint(false);
          setCompleted(false);
          setStats({ correct: 0, wrong: 0, startTime: Date.now() });
        }}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Cümlede boşluğu vurgulayarak render et
  const parts = currentQuestion.sentence.split("___");

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
                className="h-full bg-teal-500 rounded-full"
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
              Cümle Tamamlama
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
              {/* Kelime ve çeviri */}
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                {currentQuestion.card.wordTranslation}
              </p>

              {/* Cümle */}
              <p className="text-xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
                {parts[0]}
                <span className={cn(
                  "inline-block min-w-[80px] mx-1 border-b-2 font-bold",
                  !result && "border-teal-400 text-teal-600 dark:text-teal-400",
                  result === "correct" && "border-green-500 text-green-600 dark:text-green-400",
                  result === "wrong" && "border-red-500 text-red-600 dark:text-red-400",
                )}>
                  {result ? currentQuestion.answer : "___"}
                </span>
                {parts[1]}
              </p>

              {/* Çeviri */}
              {currentQuestion.sentenceTranslation && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 italic">
                  {currentQuestion.sentenceTranslation}
                </p>
              )}

              {/* Yanlış cevap göstergesi */}
              {result === "wrong" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-sm text-red-500"
                >
                  Senin cevabın: <span className="font-bold line-through">{userAnswer}</span>
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Input + butonlar */}
          <div className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && userAnswer.trim() && !result) {
                    handleSubmit();
                  }
                }}
                placeholder="Boşluğu doldurun..."
                disabled={!!result}
                autoFocus
                className={cn(
                  "w-full px-4 py-4 rounded-2xl border-2 text-lg text-center font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                  "focus:outline-none transition-colors",
                  !result && "border-gray-300 dark:border-gray-600 focus:border-teal-500",
                  result === "correct" && "border-green-500 bg-green-50 dark:bg-green-900/30",
                  result === "wrong" && "border-red-500 bg-red-50 dark:bg-red-900/30"
                )}
              />
              {result && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {result === "correct" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
              )}
            </div>

            {!result && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHint(true)}
                  disabled={showHint}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    showHint
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-amber-900/20"
                  )}
                >
                  <Lightbulb className="w-4 h-4" />
                  {showHint ? currentQuestion.hint : "İpucu"}
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="flex-1"
                  size="lg"
                >
                  Kontrol Et
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
