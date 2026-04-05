"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn, shuffle } from "@/lib/utils";
import Button from "@/components/ui/Button";
import LessonComplete from "@/components/LessonComplete";
import { ArrowLeft, Timer, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
}

interface MatchItem {
  id: string;
  text: string;
  cardId: string;
  matched: boolean;
}

function DraggableCard({
  item,
  isSelected,
  matchResult,
  onClick,
  isDragging,
}: {
  item: MatchItem;
  isSelected: boolean;
  matchResult: "correct" | "wrong" | null;
  onClick: () => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: item.matched || !!matchResult,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  if (item.matched) return null;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 font-semibold text-center transition-all active:scale-[0.97] flex items-center justify-center gap-2 touch-none",
        isDragging && "opacity-50",
        isSelected && matchResult === "correct" && "border-green-500 bg-green-100 dark:bg-green-900/30",
        isSelected && matchResult === "wrong" && "border-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse",
        isSelected && !matchResult && "border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md",
        !isSelected && "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-300 hover:shadow-sm"
      )}
    >
      <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      <span>{item.text}</span>
    </button>
  );
}

function DroppableCard({
  item,
  isSelected,
  matchResult,
  onClick,
  isOver,
}: {
  item: MatchItem;
  isSelected: boolean;
  matchResult: "correct" | "wrong" | null;
  onClick: () => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: item.id,
    disabled: item.matched || !!matchResult,
  });

  if (item.matched) return null;

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 font-semibold text-center transition-all active:scale-[0.97]",
        isOver && !matchResult && "border-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-lg scale-[1.03]",
        isSelected && matchResult === "correct" && "border-green-500 bg-green-100 dark:bg-green-900/30",
        isSelected && matchResult === "wrong" && "border-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse",
        isSelected && !matchResult && !isOver && "border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md",
        !isSelected && !isOver && "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-300 hover:shadow-sm"
      )}
    >
      {item.text}
    </button>
  );
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const directionPref = (searchParams.get("direction") || "mixed") as "de_to_tr" | "tr_to_de" | "mixed";

  const [cards, setCards] = useState<Card[]>([]);
  const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [penaltyTime, setPenaltyTime] = useState(0);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<number | null>(null);
  const timerStartRef = useRef<number>(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const setupGame = useCallback(
    (allCards: Card[]) => {
      const gameCards = shuffle(allCards).slice(0, Math.min(6, allCards.length));
      const isReversed = directionPref === "tr_to_de";

      const left: MatchItem[] = shuffle(
        gameCards.map((c) => ({
          id: `l-${c.id}`,
          text: isReversed ? c.wordTranslation : c.word,
          cardId: c.id,
          matched: false,
        }))
      );

      const right: MatchItem[] = shuffle(
        gameCards.map((c) => ({
          id: `r-${c.id}`,
          text: isReversed ? c.word : c.wordTranslation,
          cardId: c.id,
          matched: false,
        }))
      );

      setLeftItems(left);
      setRightItems(right);
      setSelectedLeft(null);
      setSelectedRight(null);
      setMatchResult(null);
      setCompleted(false);
      setTimer(0);
      setMistakes(0);
      setMatchedCount(0);
      setPenaltyTime(0);

      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      timerStartRef.current = performance.now();
      const tick = () => {
        const elapsed = performance.now() - timerStartRef.current;
        setTimer(Math.floor(elapsed / 100));
        timerRef.current = requestAnimationFrame(tick);
      };
      timerRef.current = requestAnimationFrame(tick);
    },
    [directionPref]
  );

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/desteler/${deckId}/smart-pool?mode=match`);
        const data = await res.json();
        if (data.cards && data.cards.length >= 2) {
          setCards(data.cards);
          setupGame(data.cards);
        }
      } catch {
        router.push(`/desteler/${deckId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [deckId, router, setupGame]);

  const checkMatch = useCallback(
    (leftId: string | null, rightId: string | null) => {
      if (!leftId || !rightId) return;

      const leftItem = leftItems.find((i) => i.id === leftId);
      const rightItem = rightItems.find((i) => i.id === rightId);

      if (!leftItem || !rightItem) return;

      if (leftItem.cardId === rightItem.cardId) {
        fetch(`/api/kartlar/${leftItem.cardId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCorrect: true, source: "match" }),
        }).catch(() => {});
        setMatchResult("correct");
        setTimeout(() => {
          setLeftItems((prev) =>
            prev.map((i) => (i.id === leftId ? { ...i, matched: true } : i))
          );
          setRightItems((prev) =>
            prev.map((i) => (i.id === rightId ? { ...i, matched: true } : i))
          );
          setSelectedLeft(null);
          setSelectedRight(null);
          setMatchResult(null);
          setMatchedCount((prev) => {
            const newCount = prev + 1;
            if (newCount >= leftItems.length) {
              setCompleted(true);
              if (timerRef.current) cancelAnimationFrame(timerRef.current);
            }
            return newCount;
          });
        }, 400);
      } else {
        setMatchResult("wrong");
        setMistakes((prev) => prev + 1);
        setPenaltyTime((prev) => prev + 10);
        setTimeout(() => {
          setSelectedLeft(null);
          setSelectedRight(null);
          setMatchResult(null);
        }, 600);
      }
    },
    [leftItems, rightItems]
  );

  const handleLeftClick = (id: string) => {
    if (leftItems.find((i) => i.id === id)?.matched) return;
    if (matchResult) return;
    setSelectedLeft(id);
    if (selectedRight) {
      checkMatch(id, selectedRight);
    }
  };

  const handleRightClick = (id: string) => {
    if (rightItems.find((i) => i.id === id)?.matched) return;
    if (matchResult) return;
    setSelectedRight(id);
    if (selectedLeft) {
      checkMatch(selectedLeft, id);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setSelectedLeft(event.active.id as string);
    setSelectedRight(null);
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    setOverDropId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setOverDropId(null);

    if (event.over) {
      const leftId = event.active.id as string;
      const rightId = event.over.id as string;
      setSelectedLeft(leftId);
      setSelectedRight(rightId);
      checkMatch(leftId, rightId);
    }
  };

  const formatTime = (ticks: number) => {
    const totalSeconds = Math.floor(ticks / 10);
    const tenths = ticks % 10;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`;
  };

  const activeDragItem = activeDragId
    ? leftItems.find((i) => i.id === activeDragId)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (cards.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Eslestirme icin en az 2 kart gerekli
        </p>
        <Button onClick={() => router.push(`/desteler/${deckId}`)}>
          Geri Don
        </Button>
      </div>
    );
  }

  if (completed) {
    const totalTime = timer + penaltyTime;
    return (
      <LessonComplete
        deckId={deckId}
        type="match"
        cardsStudied={leftItems.length}
        correctCount={leftItems.length}
        wrongCount={mistakes}
        duration={Math.round(totalTime / 10)}
        onRestart={() => setupGame(cards)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/desteler/${deckId}`)}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm font-mono font-bold text-gray-600 dark:text-gray-300">
              <Timer className="w-4 h-4" />
              {formatTime(timer + penaltyTime)}
            </div>
            {penaltyTime > 0 && (
              <span className="text-xs text-red-500 font-medium">
                +{Math.floor(penaltyTime / 10)}s ceza
              </span>
            )}
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {matchedCount}/{leftItems.length}
            </div>
          </div>
        </div>
      </div>

      {/* Eslestirme alani */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg md:max-w-xl">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Sol — suruklenebilir */}
              <div className="space-y-3">
                <AnimatePresence>
                  {leftItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{
                        opacity: item.matched ? 0 : 1,
                        scale: item.matched ? 0.8 : 1,
                        height: item.matched ? 0 : "auto",
                        marginBottom: item.matched ? 0 : undefined,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {!item.matched && (
                        <DraggableCard
                          item={item}
                          isSelected={selectedLeft === item.id}
                          matchResult={selectedLeft === item.id ? matchResult : null}
                          onClick={() => handleLeftClick(item.id)}
                          isDragging={activeDragId === item.id}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Sag — birakilabilir */}
              <div className="space-y-3">
                <AnimatePresence>
                  {rightItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{
                        opacity: item.matched ? 0 : 1,
                        scale: item.matched ? 0.8 : 1,
                        height: item.matched ? 0 : "auto",
                        marginBottom: item.matched ? 0 : undefined,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {!item.matched && (
                        <DroppableCard
                          item={item}
                          isSelected={selectedRight === item.id}
                          matchResult={selectedRight === item.id ? matchResult : null}
                          onClick={() => handleRightClick(item.id)}
                          isOver={overDropId === item.id}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeDragItem && (
                <div className="p-4 rounded-2xl border-2 border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-xl font-semibold text-center">
                  {activeDragItem.text}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
