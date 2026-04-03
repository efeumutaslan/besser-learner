"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import {
  CheckCircle2,
  Star,
  Gem,
  Target,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LessonCompleteProps {
  deckId: string;
  type: "review" | "learn" | "test" | "match" | "blast" | "artikel" | "cloze" | "grammar";
  cardsStudied: number;
  correctCount: number;
  wrongCount: number;
  duration: number; // saniye
  onRestart?: () => void;
  onNext?: () => void;
}

interface Rewards {
  xp: number;
  gems: number;
  streak: number;
  streakBonusXP: number;
  isNewDay: boolean;
}

export default function LessonComplete({
  deckId,
  type,
  cardsStudied,
  correctCount,
  wrongCount,
  duration,
  onRestart,
  onNext,
}: LessonCompleteProps) {
  const router = useRouter();
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  const accuracy =
    cardsStudied > 0 ? Math.round((correctCount / cardsStudied) * 100) : 0;
  const minutes = Math.floor(duration / 60);

  useEffect(() => {
    const saveSession = async () => {
      try {
        const res = await fetch("/api/stats/complete-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId,
            type,
            cardsStudied,
            correctCount,
            wrongCount,
            duration,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setRewards(data.rewards);
        }
      } catch (err) {
        console.error("Session save error:", err);
      } finally {
        setSaving(false);
      }
    };
    saveSession();
  }, [deckId, type, cardsStudied, correctCount, wrongCount, duration]);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const sendFeedback = async (value: string) => {
    setFeedback(value);
    // Basit feedback - session'a eklenebilir
  };

  const typeLabels: Record<string, string> = {
    review: "Tekrar",
    learn: "Öğrenme",
    test: "Test",
    match: "Eşleştirme",
    blast: "Blast",
    artikel: "Artikel Drill",
    cloze: "Cümle Tamamlama",
    grammar: "Gramer Drill",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-brand-50 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Konfeti animasyonu */}
      <AnimatePresence>
        {showConfetti && (
          <>
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: [
                    "#6366F1",
                    "#22C55E",
                    "#F59E0B",
                    "#EF4444",
                    "#EC4899",
                    "#06B6D4",
                  ][i % 6],
                  left: `${Math.random() * 100}%`,
                }}
                initial={{ y: -20, opacity: 1, scale: 0 }}
                animate={{
                  y: typeof window !== "undefined" ? window.innerHeight + 20 : 800,
                  opacity: 0,
                  scale: 1,
                  rotate: Math.random() * 360,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Başarı ikonu */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="relative mb-6"
      >
        <div
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center",
            accuracy >= 80
              ? "bg-green-100 dark:bg-green-900/30"
              : accuracy >= 50
              ? "bg-yellow-100 dark:bg-yellow-900/30"
              : "bg-orange-100 dark:bg-orange-900/30"
          )}
        >
          <CheckCircle2
            className={cn(
              "w-12 h-12",
              accuracy >= 80
                ? "text-green-500"
                : accuracy >= 50
                ? "text-yellow-500"
                : "text-orange-500"
            )}
          />
        </div>
        {/* Yıldız efektleri */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -top-2 -right-2"
        >
          <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
        </motion.div>
      </motion.div>

      {/* Başlık */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold mb-1">
          {accuracy >= 80
            ? "Harika İş!"
            : accuracy >= 50
            ? "İyi Gidiyorsun!"
            : "Devam Et!"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {typeLabels[type]} tamamlandı
        </p>
      </motion.div>

      {/* Ödül kartları */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3 mb-6 w-full max-w-sm"
      >
        {/* XP */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-200 dark:border-brand-700 p-3 text-center">
          <div className="text-[10px] font-bold text-brand-600 mb-1">
            XP Kazanıldı
          </div>
          <div className="flex items-center justify-center gap-1">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-xl font-bold">
              {saving ? "..." : rewards?.xp || 0}
            </span>
          </div>
        </div>

        {/* Gem */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border-2 border-purple-200 dark:border-purple-700 p-3 text-center">
          <div className="text-[10px] font-bold text-purple-600 mb-1">
            Ödülün
          </div>
          <div className="flex items-center justify-center gap-1">
            <Gem className="w-5 h-5 text-purple-500" />
            <span className="text-xl font-bold">
              {saving ? "..." : rewards?.gems || 0}
            </span>
          </div>
        </div>

        {/* Doğruluk */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-200 dark:border-green-700 p-3 text-center">
          <div className="text-[10px] font-bold text-green-600 mb-1">
            Doğruluk
          </div>
          <div className="flex items-center justify-center gap-1">
            <Target className="w-5 h-5 text-green-500" />
            <span className="text-xl font-bold">%{accuracy}</span>
          </div>
        </div>
      </motion.div>

      {/* Streak bilgisi */}
      {rewards && rewards.streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm mb-6"
        >
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl border border-orange-200 dark:border-orange-700 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="w-6 h-6 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">
                {rewards.streak} Gün
              </span>
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-sm text-orange-500">
              {rewards.streak >= 7
                ? "Muhteşem seri!"
                : "Serini devam ettir!"}
            </p>
            {rewards.streakBonusXP > 0 && (
              <p className="text-xs text-orange-400 mt-1">
                +{rewards.streakBonusXP} bonus XP kazandın!
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Geri bildirim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-sm mb-6"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Ders nasıldı?</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => sendFeedback("thumbs_up")}
              className={cn(
                "p-3 rounded-full transition-all",
                feedback === "thumbs_up"
                  ? "bg-green-100 dark:bg-green-900/30 scale-110"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              )}
            >
              <ThumbsUp
                className={cn(
                  "w-6 h-6",
                  feedback === "thumbs_up"
                    ? "text-green-600"
                    : "text-gray-500 dark:text-gray-400"
                )}
              />
            </button>
            <button
              onClick={() => sendFeedback("thumbs_down")}
              className={cn(
                "p-3 rounded-full transition-all",
                feedback === "thumbs_down"
                  ? "bg-red-100 dark:bg-red-900/30 scale-110"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              )}
            >
              <ThumbsDown
                className={cn(
                  "w-6 h-6",
                  feedback === "thumbs_down"
                    ? "text-red-600"
                    : "text-gray-500 dark:text-gray-400"
                )}
              />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            {cardsStudied} kart &middot; {minutes}dk
          </p>
        </div>
      </motion.div>

      {/* Butonlar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="w-full max-w-sm space-y-3"
      >
        <Button
          onClick={() =>
            onNext
              ? onNext()
              : router.push(`/desteler/${deckId}`)
          }
          className="w-full gap-2"
          size="lg"
        >
          <ArrowRight className="w-4 h-4" />
          Devam Et
        </Button>
        {onRestart && (
          <Button
            variant="outline"
            onClick={onRestart}
            className="w-full gap-2"
            size="lg"
          >
            <RotateCcw className="w-4 h-4" />
            Tekrar Başla
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => router.push(`/desteler/${deckId}`)}
          className="w-full"
        >
          Desteye Dön
        </Button>
      </motion.div>
    </div>
  );
}
