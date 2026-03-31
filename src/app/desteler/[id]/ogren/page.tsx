"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  cn,
  getArtikelColor,
  getArtikelBadgeColor,
  shuffle,
} from "@/lib/utils";
import { getNextMastery, type MasteryLevel } from "@/lib/gamification";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  SkipForward,
  Lightbulb,
  Eye,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
  plural: string | null;
  exampleSentence: string | null;
  sentenceTranslation: string | null;
  mastery: string;
  correctHits: number;
}

// Quizlet'teki 4 soru tipi
type QuestionType = "multipleChoice" | "trueFalse" | "written" | "flashcard";

interface Question {
  card: Card;
  type: QuestionType;
  prompt: string;
  correctAnswer: string;
  options?: string[];     // MC ve T/F için
  tfStatement?: string;   // T/F sorusu
  tfIsTrue?: boolean;     // T/F doğru mu
  direction: "de_to_tr" | "tr_to_de" | "artikel";
}

// Kart mastery durumu (client-side tracking)
interface CardProgress {
  cardId: string;
  mastery: MasteryLevel;
  correctHits: number;
}

const CHUNK_SIZE = 20; // Her round'da maks kart sayısı

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [allCards, setAllCards] = useState<Card[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardProgress, setCardProgress] = useState<Map<string, CardProgress>>(
    new Map()
  );

  // Soru durumları
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [flipped, setFlipped] = useState(false); // Flashcard modu

  // Genel durumlar
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    startTime: Date.now(),
  });
  const [answerStreak, setAnswerStreak] = useState(0);

  // Adaptif zorluk: mastery'ye göre soru tipi seç
  const getQuestionType = useCallback(
    (card: Card, progress?: CardProgress): QuestionType => {
      const mastery = progress?.mastery || (card.mastery as MasteryLevel);

      switch (mastery) {
        case "NEW":
        case "SEEN":
          // Yeni/görülmüş: kolay sorular (MC, Flashcard)
          return Math.random() > 0.4 ? "multipleChoice" : "flashcard";
        case "FAMILIAR":
          // Aşina: orta zorluk (T/F, MC, Written)
          const r = Math.random();
          if (r < 0.33) return "trueFalse";
          if (r < 0.66) return "multipleChoice";
          return "written";
        case "MASTERED":
          // Uzmanlaşmış: zor sorular (Written, T/F)
          return Math.random() > 0.5 ? "written" : "trueFalse";
        default:
          return "multipleChoice";
      }
    },
    []
  );

  // Soru oluşturma
  const generateQuestions = useCallback(
    (
      cards: Card[],
      allCardsPool: Card[],
      progressMap: Map<string, CardProgress>
    ): Question[] => {
      const qs: Question[] = [];

      for (const card of cards) {
        const progress = progressMap.get(card.id);
        const qType = getQuestionType(card, progress);

        // Yön seçimi
        const directions: Array<"de_to_tr" | "tr_to_de" | "artikel"> = [
          "de_to_tr",
          "tr_to_de",
        ];
        if (card.artikel && card.artikel !== "-") {
          directions.push("artikel");
        }
        const direction = directions[Math.floor(Math.random() * directions.length)];

        const wrongCards = allCardsPool.filter((c) => c.id !== card.id);

        switch (qType) {
          case "multipleChoice": {
            const wrongOptions = shuffle(wrongCards)
              .slice(0, 3)
              .map((c) =>
                direction === "de_to_tr"
                  ? c.wordTranslation
                  : direction === "tr_to_de"
                  ? c.word
                  : ""
              );

            const correctAnswer =
              direction === "de_to_tr"
                ? card.wordTranslation
                : direction === "tr_to_de"
                ? card.word
                : card.artikel || "";

            const options =
              direction === "artikel"
                ? ["der", "die", "das"]
                : shuffle([correctAnswer, ...wrongOptions]);

            qs.push({
              card,
              type: "multipleChoice",
              prompt:
                direction === "de_to_tr"
                  ? card.word
                  : direction === "tr_to_de"
                  ? card.wordTranslation
                  : `"${card.word}" kelimesinin artikeli?`,
              correctAnswer,
              options,
              direction,
            });
            break;
          }

          case "trueFalse": {
            const isTrue = Math.random() > 0.5;
            let tfStatement: string;
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

            tfStatement = `"${card.word}" = "${shownTranslation}"`;

            qs.push({
              card,
              type: "trueFalse",
              prompt: "Bu doğru mu?",
              correctAnswer: isTrue ? "Doğru" : "Yanlış",
              options: ["Doğru", "Yanlış"],
              tfStatement,
              tfIsTrue: isTrue,
              direction: "de_to_tr",
            });
            break;
          }

          case "written": {
            const correctAnswer =
              direction === "de_to_tr"
                ? card.wordTranslation
                : direction === "tr_to_de"
                ? card.word
                : card.artikel || "";

            qs.push({
              card,
              type: "written",
              prompt:
                direction === "de_to_tr"
                  ? `"${card.word}" kelimesinin Türkçesi?`
                  : direction === "tr_to_de"
                  ? `"${card.wordTranslation}" kelimesinin Almancası?`
                  : `"${card.word}" kelimesinin artikeli?`,
              correctAnswer: correctAnswer.toLowerCase().trim(),
              direction,
            });
            break;
          }

          case "flashcard": {
            qs.push({
              card,
              type: "flashcard",
              prompt: card.word,
              correctAnswer: card.wordTranslation,
              direction: "de_to_tr",
            });
            break;
          }
        }
      }

      return shuffle(qs);
    },
    [getQuestionType]
  );

  // Veri yükleme
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}`);
        const data = await res.json();
        if (data.cards && data.cards.length > 0) {
          const cards = data.cards;
          setAllCards(cards);

          // Round hesapla
          const rounds = Math.ceil(cards.length / CHUNK_SIZE);
          setTotalRounds(rounds);

          // İlk round kartları
          const initialProgress = new Map<string, CardProgress>();
          cards.forEach((c: Card) => {
            initialProgress.set(c.id, {
              cardId: c.id,
              mastery: (c.mastery as MasteryLevel) || "NEW",
              correctHits: c.correctHits || 0,
            });
          });
          setCardProgress(initialProgress);

          const chunk = cards.slice(0, CHUNK_SIZE);
          setQuestions(generateQuestions(chunk, cards, initialProgress));
        }
      } catch {
        router.push(`/desteler/${deckId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [deckId, router, generateQuestions]);

  useEffect(() => {
    if (!result && questions[currentIndex]?.type === "written") {
      inputRef.current?.focus();
    }
  }, [currentIndex, result, questions]);

  const currentQuestion = questions[currentIndex];

  // Cevap kontrolü
  const handleAnswer = useCallback(
    (answer: string, isCorrectOverride?: boolean) => {
      if (!currentQuestion || result) return;

      let isCorrect: boolean;

      if (isCorrectOverride !== undefined) {
        isCorrect = isCorrectOverride;
      } else if (currentQuestion.type === "written") {
        isCorrect =
          answer.toLowerCase().trim() ===
          currentQuestion.correctAnswer.toLowerCase().trim();
      } else {
        isCorrect = answer === currentQuestion.correctAnswer;
      }

      setResult(isCorrect ? "correct" : "wrong");
      setSelectedOption(answer);

      // Stats güncelle
      setStats((prev) => ({
        ...prev,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        wrong: !isCorrect ? prev.wrong + 1 : prev.wrong,
      }));

      // Answer streak
      if (isCorrect) {
        setAnswerStreak((prev) => prev + 1);
      } else {
        setAnswerStreak(0);
      }

      // Card mastery güncelle
      const cardId = currentQuestion.card.id;
      setCardProgress((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(cardId) || {
          cardId,
          mastery: "NEW" as MasteryLevel,
          correctHits: 0,
        };
        const updated = getNextMastery(
          current.mastery,
          isCorrect,
          current.correctHits
        );
        newMap.set(cardId, {
          cardId,
          mastery: updated.mastery,
          correctHits: updated.correctHits,
        });
        return newMap;
      });

      // Mastery'yi sunucuya da bildir
      fetch(`/api/kartlar/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mastery: isCorrect
            ? getNextMastery(
                (currentQuestion.card.mastery as MasteryLevel) || "NEW",
                true,
                currentQuestion.card.correctHits || 0
              ).mastery
            : getNextMastery(
                (currentQuestion.card.mastery as MasteryLevel) || "NEW",
                false,
                currentQuestion.card.correctHits || 0
              ).mastery,
        }),
      }).catch(() => {});
    },
    [currentQuestion, result]
  );

  // Sonraki soru
  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Mastered olmayan kartlar var mı kontrol et
      const currentChunkStart = currentRound * CHUNK_SIZE;
      const currentChunkEnd = Math.min(
        currentChunkStart + CHUNK_SIZE,
        allCards.length
      );
      const chunkCards = allCards.slice(currentChunkStart, currentChunkEnd);

      const unmasteredCards = chunkCards.filter((c) => {
        const p = cardProgress.get(c.id);
        return !p || p.mastery !== "MASTERED";
      });

      if (unmasteredCards.length > 0 && stats.correct + stats.wrong < chunkCards.length * 3) {
        // Mastered olmayan kartlarla devam et
        const newQuestions = generateQuestions(
          unmasteredCards,
          allCards,
          cardProgress
        );
        setQuestions(newQuestions);
        setCurrentIndex(0);
      } else if (currentRound + 1 < totalRounds) {
        // Sonraki round
        const nextRoundStart = (currentRound + 1) * CHUNK_SIZE;
        const nextRoundEnd = Math.min(
          nextRoundStart + CHUNK_SIZE,
          allCards.length
        );
        const nextChunk = allCards.slice(nextRoundStart, nextRoundEnd);

        setCurrentRound((prev) => prev + 1);
        setQuestions(generateQuestions(nextChunk, allCards, cardProgress));
        setCurrentIndex(0);
      } else {
        setCompleted(true);
      }
    }

    setUserAnswer("");
    setSelectedOption(null);
    setResult(null);
    setShowHint(false);
    setFlipped(false);
  }, [
    currentIndex,
    questions.length,
    currentRound,
    totalRounds,
    allCards,
    cardProgress,
    generateQuestions,
    stats,
  ]);

  // Klavye kısayolları
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (currentQuestion?.type === "written" && !result) return; // Input'ta yazarken engelleme

      if (result && e.key === "Enter") {
        nextQuestion();
        return;
      }

      if (currentQuestion?.type === "flashcard" && !flipped && e.code === "Space") {
        e.preventDefault();
        setFlipped(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentQuestion, result, flipped, nextQuestion]);

  const handleWrittenSubmit = () => {
    if (!userAnswer.trim()) return;
    handleAnswer(userAnswer);
  };

  const restartSession = () => {
    setCurrentRound(0);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, startTime: Date.now() });
    setAnswerStreak(0);
    setCompleted(false);
    setResult(null);
    setSelectedOption(null);
    setUserAnswer("");

    const initialProgress = new Map<string, CardProgress>();
    allCards.forEach((c) => {
      initialProgress.set(c.id, {
        cardId: c.id,
        mastery: "NEW",
        correctHits: 0,
      });
    });
    setCardProgress(initialProgress);

    const chunk = allCards.slice(0, CHUNK_SIZE);
    setQuestions(generateQuestions(chunk, allCards, initialProgress));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Bu destede henüz kart yok</p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>
          Geri Dön
        </Button>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="learn"
        cardsStudied={stats.correct + stats.wrong}
        correctCount={stats.correct}
        wrongCount={stats.wrong}
        duration={Math.round((Date.now() - stats.startTime) / 1000)}
        onRestart={restartSession}
      />
    );
  }

  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Mastery sayıları
  const masteredCount = Array.from(cardProgress.values()).filter(
    (p) => p.mastery === "MASTERED"
  ).length;
  const totalInRound = Math.min(
    CHUNK_SIZE,
    allCards.length - currentRound * CHUNK_SIZE
  );

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
                className="h-full bg-green-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalRounds > 1 && (
              <span className="text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-medium">
                {currentRound + 1}/{totalRounds}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {masteredCount}/{totalInRound}
            </span>
          </div>
        </div>

        {/* Answer streak */}
        <AnimatePresence>
          {answerStreak >= 3 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-center gap-1 mt-2"
            >
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                {answerStreak} doğru seri!
              </span>
              <Zap className="w-4 h-4 text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Soru tipi etiketi */}
      <div className="text-center pt-4">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {currentQuestion.type === "multipleChoice" && "Çoktan Seçmeli"}
          {currentQuestion.type === "trueFalse" && "Doğru / Yanlış"}
          {currentQuestion.type === "written" && "Yazılı"}
          {currentQuestion.type === "flashcard" && "Flashcard"}
        </span>
      </div>

      {/* İçerik */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* ===== MULTIPLE CHOICE ===== */}
          {currentQuestion.type === "multipleChoice" && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-6">
                {currentQuestion.direction === "de_to_tr" &&
                  currentQuestion.card.artikel &&
                  currentQuestion.card.artikel !== "-" && (
                    <span
                      className={cn(
                        "inline-block px-3 py-1 rounded-full text-sm font-bold mb-2",
                        getArtikelBadgeColor(currentQuestion.card.artikel)
                      )}
                    >
                      {currentQuestion.card.artikel}
                    </span>
                  )}
                <h2
                  className={cn(
                    "text-2xl font-bold",
                    currentQuestion.direction === "de_to_tr" &&
                      getArtikelColor(currentQuestion.card.artikel)
                  )}
                >
                  {currentQuestion.prompt}
                </h2>
              </div>

              <div className="space-y-3">
                {currentQuestion.options?.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrectOption =
                    option === currentQuestion.correctAnswer;
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
                          "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-400",
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
                          "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-40"
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

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <Button onClick={nextQuestion} className="w-full" size="lg">
                    Devam Et
                  </Button>
                </motion.div>
              )}
            </>
          )}

          {/* ===== TRUE / FALSE ===== */}
          {currentQuestion.type === "trueFalse" && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-6">
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Bu doğru mu?</p>
                <h2 className="text-xl font-bold">
                  {currentQuestion.tfStatement}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["Doğru", "Yanlış"].map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrectOption =
                    option === currentQuestion.correctAnswer;
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

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <Button onClick={nextQuestion} className="w-full" size="lg">
                    Devam Et
                  </Button>
                </motion.div>
              )}
            </>
          )}

          {/* ===== WRITTEN ===== */}
          {currentQuestion.type === "written" && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center mb-6">
                {currentQuestion.card.artikel &&
                  currentQuestion.card.artikel !== "-" &&
                  currentQuestion.direction !== "artikel" && (
                    <span
                      className={cn(
                        "inline-block px-3 py-1 rounded-full text-sm font-bold mb-2",
                        getArtikelBadgeColor(currentQuestion.card.artikel)
                      )}
                    >
                      {currentQuestion.card.artikel}
                    </span>
                  )}
                <h2 className="text-xl font-bold">{currentQuestion.prompt}</h2>
              </div>

              {showHint && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 mb-4 text-center">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    İpucu: {currentQuestion.correctAnswer.charAt(0)}...
                  </p>
                </div>
              )}

              <div className="relative mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (result) nextQuestion();
                      else handleWrittenSubmit();
                    }
                  }}
                  placeholder="Cevabınızı yazın..."
                  disabled={!!result}
                  className={cn(
                    "w-full px-4 py-4 rounded-2xl border-2 text-lg text-center font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                    "focus:outline-none transition-colors",
                    !result && "border-gray-300 dark:border-gray-600 focus:border-green-500",
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

              {!result ? (
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                    className="gap-1"
                    size="sm"
                  >
                    <Lightbulb className="w-4 h-4" />
                    İpucu
                  </Button>
                  <Button
                    onClick={handleWrittenSubmit}
                    disabled={!userAnswer.trim()}
                    className="flex-1"
                    size="lg"
                  >
                    Kontrol Et
                  </Button>
                </div>
              ) : (
                <Button onClick={nextQuestion} className="w-full" size="lg">
                  Devam Et
                </Button>
              )}
            </>
          )}

          {/* ===== FLASHCARD ===== */}
          {currentQuestion.type === "flashcard" && (
            <>
              <div
                className="cursor-pointer"
                onClick={() => !flipped && setFlipped(true)}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 text-center min-h-[200px] flex flex-col items-center justify-center"
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {!flipped ? (
                    <div>
                      {currentQuestion.card.artikel &&
                        currentQuestion.card.artikel !== "-" && (
                          <span
                            className={cn(
                              "inline-block px-3 py-1 rounded-full text-sm font-bold mb-3",
                              getArtikelBadgeColor(
                                currentQuestion.card.artikel
                              )
                            )}
                          >
                            {currentQuestion.card.artikel}
                          </span>
                        )}
                      <h2
                        className={cn(
                          "text-3xl font-bold",
                          getArtikelColor(currentQuestion.card.artikel)
                        )}
                      >
                        {currentQuestion.prompt}
                      </h2>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-4">
                        <Eye className="w-4 h-4 inline mr-1" />
                        Çevirmek için tıkla
                      </p>
                    </div>
                  ) : (
                    <div style={{ transform: "rotateY(180deg)" }}>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {currentQuestion.correctAnswer}
                      </h2>
                      {currentQuestion.card.exampleSentence && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 italic">
                          &quot;{currentQuestion.card.exampleSentence}&quot;
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>

              {flipped && !result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Bildin mi?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleAnswer("", false)}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                      size="lg"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Bilmedim
                    </Button>
                    <Button
                      onClick={() => handleAnswer("", true)}
                      className="bg-green-500 hover:bg-green-600"
                      size="lg"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Bildim
                    </Button>
                  </div>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <Button onClick={nextQuestion} className="w-full" size="lg">
                    Devam Et
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mastery durumları (alt bar) */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-3 safe-bottom">
        <div className="flex justify-center gap-6 text-[10px] font-medium">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-gray-400 dark:text-gray-500">
              Yeni{" "}
              {
                Array.from(cardProgress.values()).filter(
                  (p) => p.mastery === "NEW"
                ).length
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-orange-500">
              Görüldü{" "}
              {
                Array.from(cardProgress.values()).filter(
                  (p) => p.mastery === "SEEN"
                ).length
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-yellow-600 dark:text-yellow-400">
              Aşina{" "}
              {
                Array.from(cardProgress.values()).filter(
                  (p) => p.mastery === "FAMILIAR"
                ).length
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-600 dark:text-green-400">
              Uzman{" "}
              {
                Array.from(cardProgress.values()).filter(
                  (p) => p.mastery === "MASTERED"
                ).length
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
