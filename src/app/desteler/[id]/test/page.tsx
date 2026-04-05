"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  cn,
  getArtikelBadgeColor,
  getArtikelColor,
  shuffle,
} from "@/lib/utils";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Timer,
  Settings,
  Play,
} from "lucide-react";
import { motion } from "framer-motion";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
}

type QuestionFormat = "multipleChoice" | "written" | "trueFalse" | "matching";

interface TestQuestion {
  card: Card;
  format: QuestionFormat;
  question: string;
  correctAnswer: string;
  options?: string[];
  tfStatement?: string;
  tfIsTrue?: boolean;
  matchPairs?: { left: string; right: string }[];
}

interface TestConfig {
  questionCount: number;
  formats: QuestionFormat[];
  timerEnabled: boolean;
  timerMinutes: number;
  shuffleOptions: boolean;
}

const DEFAULT_CONFIG: TestConfig = {
  questionCount: 20,
  formats: ["multipleChoice", "written", "trueFalse"],
  timerEnabled: false,
  timerMinutes: 5,
  shuffleOptions: true,
};

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const directionPref = (searchParams.get("direction") || "mixed") as "de_to_tr" | "tr_to_de" | "mixed";
  const inputRef = useRef<HTMLInputElement>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Config
  const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(true);

  // Test
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Map<number, { answer: string; isCorrect: boolean }>
  >(new Map());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tamamlanma
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    startTime: Date.now(),
  });

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=test`);
        const data = await res.json();
        if (data.cards && data.cards.length >= 2) {
          setCards(data.cards);
        }
      } catch {
        router.push(`/desteler/${deckId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deckId, router]);

  const generateQuestions = useCallback(
    (cfg: TestConfig): TestQuestion[] => {
      if (cards.length < 2) return [];

      const qs: TestQuestion[] = [];
      const shuffledCards = shuffle(cards);
      const count = Math.min(cfg.questionCount, shuffledCards.length * cfg.formats.length);

      for (let i = 0; i < count; i++) {
        const card = shuffledCards[i % shuffledCards.length];
        const format = cfg.formats[i % cfg.formats.length];
        const wrongCards = cards.filter((c) => c.id !== card.id);

        switch (format) {
          case "multipleChoice": {
            // Yön: true = DE→TR, false = TR→DE
            const isDeToTr = directionPref === "de_to_tr" ? true
              : directionPref === "tr_to_de" ? false
              : Math.random() > 0.5;
            const wrongOpts = shuffle(wrongCards)
              .slice(0, 3)
              .map((c) => (isDeToTr ? c.wordTranslation : c.word));

            qs.push({
              card,
              format: "multipleChoice",
              question: isDeToTr ? card.word : card.wordTranslation,
              correctAnswer: isDeToTr ? card.wordTranslation : card.word,
              options: shuffle([
                isDeToTr ? card.wordTranslation : card.word,
                ...wrongOpts,
              ]),
            });
            break;
          }

          case "written": {
            const isDeToTr = directionPref === "de_to_tr" ? true
              : directionPref === "tr_to_de" ? false
              : Math.random() > 0.5;
            qs.push({
              card,
              format: "written",
              question: isDeToTr
                ? `"${card.word}" kelimesinin Türkçesi nedir?`
                : `"${card.wordTranslation}" kelimesinin Almancası nedir?`,
              correctAnswer: isDeToTr
                ? card.wordTranslation.toLowerCase().trim()
                : card.word.toLowerCase().trim(),
            });
            break;
          }

          case "trueFalse": {
            const isTrue = Math.random() > 0.5;
            let shownTranslation: string;

            if (isTrue) {
              shownTranslation = card.wordTranslation;
            } else {
              const wrongCard =
                wrongCards[Math.floor(Math.random() * wrongCards.length)];
              shownTranslation = wrongCard
                ? wrongCard.wordTranslation
                : card.wordTranslation;
            }

            qs.push({
              card,
              format: "trueFalse",
              question: "Bu eşleşme doğru mu?",
              correctAnswer: isTrue ? "Doğru" : "Yanlış",
              options: ["Doğru", "Yanlış"],
              tfStatement: `${card.word} = ${shownTranslation}`,
              tfIsTrue: isTrue,
            });
            break;
          }
        }
      }

      return shuffle(qs);
    },
    [cards, directionPref]
  );

  const startTest = () => {
    const qs = generateQuestions(config);
    setQuestions(qs);
    setShowConfig(false);
    setCurrentIndex(0);
    setAnswers(new Map());
    setStats({ correct: 0, wrong: 0, startTime: Date.now() });

    if (config.timerEnabled) {
      setTimeLeft(config.timerMinutes * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleAnswer = (answer: string) => {
    if (result) return;

    const question = questions[currentIndex];
    let isCorrect: boolean;

    if (question.format === "written") {
      isCorrect =
        answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    } else {
      isCorrect = answer === question.correctAnswer;
    }

    setResult(isCorrect ? "correct" : "wrong");
    setSelectedAnswer(answer);

    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(currentIndex, { answer, isCorrect });
      return next;
    });

    setStats((prev) => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      wrong: !isCorrect ? prev.wrong + 1 : prev.wrong,
    }));

    // SRS feedback bildir
    fetch(`/api/kartlar/${question.card.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCorrect, source: "test" }),
    }).catch(() => {});

    // Otomatik sonraki soruya geç
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setWrittenAnswer("");
        setResult(null);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setCompleted(true);
      }
    }, 1200);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleFormat = (format: QuestionFormat) => {
    setConfig((prev) => {
      const formats = prev.formats.includes(format)
        ? prev.formats.filter((f) => f !== format)
        : [...prev.formats, format];
      if (formats.length === 0) return prev;
      return { ...prev, formats };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (cards.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Test için en az 2 kart gerekli</p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>
          Geri Dön
        </Button>
      </div>
    );
  }

  // Test config ekranı
  if (showConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/desteler/${deckId}`)}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Test Ayarları</h1>
        </div>

        <div className="p-4 space-y-6 max-w-md md:max-w-lg mx-auto">
          {/* Soru sayısı */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
              Soru Sayısı
            </label>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setConfig((p) => ({ ...p, questionCount: n }))
                  }
                  className={cn(
                    "flex-1 py-2 rounded-xl border-2 font-semibold text-sm transition-all",
                    config.questionCount === n
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Soru tipleri */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
              Soru Tipleri
            </label>
            <div className="space-y-2">
              {[
                {
                  key: "multipleChoice" as QuestionFormat,
                  label: "Çoktan Seçmeli",
                },
                { key: "written" as QuestionFormat, label: "Yazılı" },
                { key: "trueFalse" as QuestionFormat, label: "Doğru / Yanlış" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleFormat(key)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                    config.formats.includes(key)
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  )}
                >
                  <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{label}</span>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center",
                      config.formats.includes(key)
                        ? "border-purple-500 bg-purple-500"
                        : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {config.formats.includes(key) && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
              Zamanlayıcı
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    timerEnabled: !p.timerEnabled,
                  }))
                }
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                  config.timerEnabled ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    config.timerEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
              {config.timerEnabled && (
                <div className="flex gap-2">
                  {[3, 5, 10, 15].map((m) => (
                    <button
                      key={m}
                      onClick={() =>
                        setConfig((p) => ({ ...p, timerMinutes: m }))
                      }
                      className={cn(
                        "px-3 py-1 rounded-lg border text-sm font-medium",
                        config.timerMinutes === m
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {m}dk
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button onClick={startTest} className="w-full gap-2" size="lg">
            <Play className="w-5 h-5" />
            Testi Başlat
          </Button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="test"
        cardsStudied={stats.correct + stats.wrong}
        correctCount={stats.correct}
        wrongCount={stats.wrong}
        duration={Math.round((Date.now() - stats.startTime) / 1000)}
        onRestart={() => {
          setShowConfig(true);
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
          <button
            onClick={() => router.push(`/desteler/${deckId}`)}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-purple-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.timerEnabled && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-mono font-bold",
                  timeLeft < 60 ? "text-red-500" : "text-gray-600 dark:text-gray-300"
                )}
              >
                <Timer className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Soru tipi etiketi */}
      <div className="text-center pt-4">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {currentQuestion.format === "multipleChoice" && "Çoktan Seçmeli"}
          {currentQuestion.format === "written" && "Yazılı"}
          {currentQuestion.format === "trueFalse" && "Doğru / Yanlış"}
        </span>
      </div>

      {/* İçerik */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md md:max-w-lg">
          {/* Soru */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-6">
            {currentQuestion.format === "trueFalse" ? (
              <>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
                  Bu eşleşme doğru mu?
                </p>
                <h2 className="text-xl font-bold">
                  {currentQuestion.tfStatement}
                </h2>
              </>
            ) : (
              <h2
                className={cn(
                  "text-2xl font-bold",
                  getArtikelColor(currentQuestion.card.artikel)
                )}
              >
                {currentQuestion.question}
              </h2>
            )}
          </div>

          {/* MC Seçenekler */}
          {currentQuestion.format === "multipleChoice" && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, idx) => {
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
                      "w-full p-4 rounded-2xl border-2 text-left font-medium transition-all",
                      !showResult &&
                        "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400",
                      showResult &&
                        isCorrectOption &&
                        "border-green-500 bg-green-50 dark:bg-green-900/30",
                      showResult &&
                        isSelected &&
                        !isCorrectOption &&
                        "border-red-500 bg-red-50 dark:bg-red-900/30",
                      showResult &&
                        !isSelected &&
                        !isCorrectOption &&
                        "border-gray-200 dark:border-gray-700 opacity-40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showResult && isCorrectOption && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {showResult && isSelected && !isCorrectOption && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* T/F */}
          {currentQuestion.format === "trueFalse" && (
            <div className="grid grid-cols-2 gap-3">
              {["Doğru", "Yanlış"].map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrectOption = option === currentQuestion.correctAnswer;
                const showResult = result !== null;

                return (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAnswer(option)}
                    disabled={!!result}
                    className={cn(
                      "p-6 rounded-2xl border-2 font-bold text-lg text-center transition-all",
                      !showResult &&
                        option === "Doğru" &&
                        "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/30 hover:border-green-400",
                      !showResult &&
                        option === "Yanlış" &&
                        "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30 hover:border-red-400",
                      showResult &&
                        isCorrectOption &&
                        "border-green-500 bg-green-100 dark:bg-green-900/50",
                      showResult &&
                        isSelected &&
                        !isCorrectOption &&
                        "border-red-500 bg-red-100 dark:bg-red-900/50",
                      showResult &&
                        !isSelected &&
                        !isCorrectOption &&
                        "opacity-40"
                    )}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Written */}
          {currentQuestion.format === "written" && (
            <>
              <div className="relative mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={writtenAnswer}
                  onChange={(e) => setWrittenAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && writtenAnswer.trim() && !result) {
                      handleAnswer(writtenAnswer);
                    }
                  }}
                  placeholder="Cevabınızı yazın..."
                  disabled={!!result}
                  autoFocus
                  className={cn(
                    "w-full px-4 py-4 rounded-2xl border-2 text-lg text-center font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                    "focus:outline-none transition-colors",
                    !result && "border-gray-300 dark:border-gray-600 focus:border-purple-500",
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

              {result === "wrong" && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 mb-4 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Doğru cevap:{" "}
                    <span className="font-bold">
                      {currentQuestion.correctAnswer}
                    </span>
                  </p>
                </div>
              )}

              {!result && (
                <Button
                  onClick={() => handleAnswer(writtenAnswer)}
                  disabled={!writtenAnswer.trim()}
                  className="w-full"
                  size="lg"
                >
                  Kontrol Et
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
