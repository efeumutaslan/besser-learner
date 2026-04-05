"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn, shuffle } from "@/lib/utils";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import { ArrowLeft, Play, Timer, Zap, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
}

interface Asteroid {
  id: string;
  text: string;
  cardId: string;
  isCorrect: boolean;
  x: number;
  y: number;
  speed: number;
  direction: number; // 0-360 derece
}

interface BlastConfig {
  speed: "slow" | "normal" | "fast";
  choices: 3 | 4 | 5;
  duration: 60 | 90 | 120;
}

const SPEED_MAP = { slow: 0.3, normal: 0.6, fast: 1.0 };

export default function BlastPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const directionPref = (searchParams.get("direction") || "mixed") as "de_to_tr" | "tr_to_de" | "mixed";

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Config
  const [config, setConfig] = useState<BlastConfig>({
    speed: "normal",
    choices: 4,
    duration: 60,
  });
  const [showConfig, setShowConfig] = useState(true);

  // Oyun durumu
  const [playing, setPlaying] = useState(false);
  const [prompt, setPrompt] = useState<Card | null>(null);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    startTime: Date.now(),
  });
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);
  const [combo, setCombo] = useState(0);
  const [roundIsDeToTr, setRoundIsDeToTr] = useState(true);

  const gameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=blast`);
        const data = await res.json();
        if (data.cards && data.cards.length >= 3) {
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
      if (gameRef.current) clearInterval(gameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deckId, router]);

  const spawnNewRound = useCallback(() => {
    if (cards.length < 3) return;

    // Yön: her round için belirle
    const isDeToTr = directionPref === "de_to_tr" ? true
      : directionPref === "tr_to_de" ? false
      : Math.random() > 0.5;

    setRoundIsDeToTr(isDeToTr);

    const correctCard = cards[Math.floor(Math.random() * cards.length)];
    setPrompt(correctCard);

    const wrongCards = shuffle(cards.filter((c) => c.id !== correctCard.id)).slice(
      0,
      config.choices - 1
    );

    const allOptions = shuffle([correctCard, ...wrongCards]);

    const newAsteroids: Asteroid[] = allOptions.map((card, i) => {
      const angle = (i / allOptions.length) * 360;
      const radius = 120;
      const centerX = 50;
      const centerY = 50;

      return {
        id: `${card.id}-${Date.now()}-${i}`,
        text: isDeToTr ? card.wordTranslation : card.word,
        cardId: card.id,
        isCorrect: card.id === correctCard.id,
        x: centerX + radius * Math.cos((angle * Math.PI) / 180) * 0.3,
        y: centerY + radius * Math.sin((angle * Math.PI) / 180) * 0.3,
        speed: SPEED_MAP[config.speed] * (0.8 + Math.random() * 0.4),
        direction: Math.random() * 360,
      };
    });

    setAsteroids(newAsteroids);
  }, [cards, config.choices, config.speed, directionPref]);

  const startGame = useCallback(() => {
    setShowConfig(false);
    setPlaying(true);
    setScore(0);
    setCombo(0);
    setTimeLeft(config.duration);
    setStats({ correct: 0, wrong: 0, startTime: Date.now() });

    spawnNewRound();

    // Asteroid hareketi
    gameRef.current = setInterval(() => {
      setAsteroids((prev) =>
        prev.map((a) => {
          const rad = (a.direction * Math.PI) / 180;
          let newX = a.x + Math.cos(rad) * a.speed * 0.5;
          let newY = a.y + Math.sin(rad) * a.speed * 0.5;
          let newDir = a.direction;

          // Duvar çarpışması - yön değiştir
          if (newX < 5 || newX > 95) {
            newDir = 180 - newDir;
            newX = Math.max(5, Math.min(95, newX));
          }
          if (newY < 5 || newY > 85) {
            newDir = -newDir;
            newY = Math.max(5, Math.min(85, newY));
          }

          return { ...a, x: newX, y: newY, direction: newDir };
        })
      );
    }, 50);

    // Timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (gameRef.current) clearInterval(gameRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setPlaying(false);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [config, spawnNewRound]);

  const handleAsteroidClick = (asteroid: Asteroid) => {
    if (!playing) return;

    // Prompt kartının ID'sini al (doğru cevabın kartı)
    const correctAsteroid = asteroids.find((a) => a.isCorrect);
    const feedbackCardId = correctAsteroid?.cardId;

    if (asteroid.isCorrect) {
      // Doğru
      const comboBonus = Math.min(combo, 5);
      setScore((prev) => prev + 1 + comboBonus);
      setCombo((prev) => prev + 1);
      setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
      setFlashColor("green");
    } else {
      // Yanlış
      setScore((prev) => Math.max(0, prev - 1));
      setCombo(0);
      setStats((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      setFlashColor("red");
    }

    // SRS feedback bildir
    if (feedbackCardId) {
      fetch(`/api/kartlar/${feedbackCardId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCorrect: asteroid.isCorrect, source: "blast" }),
      }).catch(() => {});
    }

    setTimeout(() => setFlashColor(null), 300);

    // Yeni round
    setTimeout(() => {
      spawnNewRound();
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (cards.length < 3) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Blast için en az 3 kart gerekli</p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>
          Geri Dön
        </Button>
      </div>
    );
  }

  // Config ekranı
  if (showConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/desteler/${deckId}`)}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Blast
          </h1>
        </div>

        <div className="p-6 space-y-8 max-w-md md:max-w-lg mx-auto mt-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Hazır mısın?</h2>
            <p className="text-gray-400 text-sm">
              Doğru çeviriyi tıklayarak puan kazan. Yanlış tıklama -1 puan!
            </p>
          </div>

          {/* Hız */}
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-2 block">
              Hız
            </label>
            <div className="flex gap-2">
              {(["slow", "normal", "fast"] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setConfig((p) => ({ ...p, speed }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                    config.speed === speed
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                      : "border-gray-700 text-gray-500"
                  )}
                >
                  {speed === "slow" ? "Yavaş" : speed === "normal" ? "Normal" : "Hızlı"}
                </button>
              ))}
            </div>
          </div>

          {/* Seçenek sayısı */}
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-2 block">
              Asteroid Sayısı
            </label>
            <div className="flex gap-2">
              {([3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setConfig((p) => ({ ...p, choices: n }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-semibold transition-all",
                    config.choices === n
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                      : "border-gray-700 text-gray-500"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Süre */}
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-2 block">
              Süre
            </label>
            <div className="flex gap-2">
              {([60, 90, 120] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setConfig((p) => ({ ...p, duration: d }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                    config.duration === d
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                      : "border-gray-700 text-gray-500"
                  )}
                >
                  {d}sn
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={startGame}
            className="w-full gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            size="lg"
          >
            <Zap className="w-5 h-5" />
            Başla!
          </Button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        deckId={deckId}
        type="blast"
        cardsStudied={stats.correct + stats.wrong}
        correctCount={stats.correct}
        wrongCount={stats.wrong}
        duration={config.duration}
        onRestart={() => {
          setCompleted(false);
          startGame();
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-gray-900 relative overflow-hidden transition-colors duration-200",
        flashColor === "green" && "bg-green-900",
        flashColor === "red" && "bg-red-900"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between z-10 bg-black/30">
        <button
          onClick={() => {
            if (gameRef.current) clearInterval(gameRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            router.push(`/desteler/${deckId}`);
          }}
          className="p-1 text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-1 text-lg font-mono font-bold",
              timeLeft < 10 ? "text-red-400 animate-pulse" : "text-white"
            )}
          >
            <Timer className="w-5 h-5" />
            {timeLeft}s
          </div>
          <div className="flex items-center gap-1 text-yellow-400 font-bold text-lg">
            <Zap className="w-5 h-5" />
            {score}
          </div>
          {combo > 1 && (
            <motion.span
              key={combo}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-bold text-orange-400"
            >
              x{combo}
            </motion.span>
          )}
        </div>
      </div>

      {/* Prompt */}
      {prompt && (
        <div className="text-center py-4 z-10">
          <motion.div
            key={prompt.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
              <p className="text-white/60 text-xs mb-1">Bu kelimenin çevirisi?</p>
              <h2 className="text-2xl font-bold text-white">
                {roundIsDeToTr ? prompt.word : prompt.wordTranslation}
              </h2>
            </div>
          </motion.div>
        </div>
      )}

      {/* Asteroid alanı */}
      <div ref={containerRef} className="flex-1 relative">
        <AnimatePresence>
          {asteroids.map((asteroid) => (
            <motion.button
              key={asteroid.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                left: `${asteroid.x}%`,
                top: `${asteroid.y}%`,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", damping: 20 }}
              onClick={() => handleAsteroidClick(asteroid)}
              className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:from-indigo-400 hover:to-purple-500 active:scale-95 transition-all cursor-pointer border border-white/20 min-w-[80px] text-center"
              style={{
                left: `${asteroid.x}%`,
                top: `${asteroid.y}%`,
              }}
            >
              {asteroid.text}
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Yıldız arka planı */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
