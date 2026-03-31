"use client";

import { useEffect, useState, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import DeckCard, { NewDeckCard } from "@/components/DeckCard";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { cachedFetch, invalidateCache } from "@/lib/fetcher";
import { getLast7Days, getDayName } from "@/lib/gamification";
import {
  GraduationCap,
  Flame,
  Star,
  Gem,
  TrendingUp,
} from "lucide-react";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  color: string;
  totalCards: number;
  newCount: number;
  reviewCount: number;
  learningCount: number;
}

interface UserStats {
  totalXp: number;
  totalGems: number;
  currentStreak: number;
  longestStreak: number;
}

interface DailyActivity {
  date: string;
  cardsReviewed: number;
  cardsLearned: number;
  xpEarned: number;
}

const DECK_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#22C55E", "#06B6D4", "#3B82F6",
];

export default function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [newDeckColor, setNewDeckColor] = useState(DECK_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<DailyActivity[]>([]);

  const fetchDecks = useCallback(async () => {
    try {
      const data = await cachedFetch<Deck[]>("/api/desteler");
      setDecks(data);
    } catch (err) {
      console.error("Desteler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await cachedFetch<{ stats: UserStats; recentActivity: DailyActivity[] }>("/api/stats");
      setUserStats(data.stats);
      setRecentActivity(data.recentActivity || []);
    } catch (err) {
      console.error("Stats yüklenemedi:", err);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
    fetchStats();
  }, [fetchDecks, fetchStats]);

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/desteler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeckName,
          description: newDeckDesc || null,
          color: newDeckColor,
        }),
      });
      if (res.ok) {
        setShowNewDeck(false);
        setNewDeckName("");
        setNewDeckDesc("");
        setNewDeckColor(DECK_COLORS[0]);
        invalidateCache("/api/desteler");
        fetchDecks();
      }
    } catch (err) {
      console.error("Deste oluşturulamadı:", err);
    } finally {
      setCreating(false);
    }
  };

  const totalDue = decks.reduce(
    (sum, d) => sum + d.newCount + d.reviewCount + d.learningCount,
    0
  );

  const last7Days = getLast7Days();
  const activityMap = new Map(recentActivity.map((a) => [a.date, a]));

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">BesserLernen</h1>
            <p className="text-brand-200 text-sm mt-0.5">
              Almanca Öğrenme Asistanın
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Gem */}
            <div className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1.5">
              <Gem className="w-4 h-4 text-purple-300" />
              <span className="text-sm font-semibold">
                {userStats?.totalGems || 0}
              </span>
            </div>
            {/* Streak */}
            <div className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1.5">
              <Flame className="w-4 h-4 text-orange-300" />
              <span className="text-sm font-semibold">
                {userStats?.currentStreak || 0}
              </span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-medium">
              {userStats?.totalXp || 0} XP
            </span>
          </div>
        </div>

        {/* Haftalık streak takvimi */}
        <div className="bg-white/10 rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1">
            {last7Days.map((day) => {
              const activity = activityMap.get(day);
              const hasActivity =
                activity &&
                (activity.cardsReviewed > 0 || activity.cardsLearned > 0);

              return (
                <div key={day} className="text-center">
                  <div className="text-[10px] text-white/50 mb-1">
                    {getDayName(day)}
                  </div>
                  <div
                    className={cn(
                      "w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm",
                      hasActivity
                        ? "bg-orange-400 text-white"
                        : "bg-white/10 text-white/30"
                    )}
                  >
                    {hasActivity ? "🔥" : "·"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Günlük durum */}
        <div className="bg-white/10 rounded-2xl p-4 mt-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">
                {totalDue > 0
                  ? `${totalDue} kart çalışılmayı bekliyor`
                  : "Bugünlük çalışma tamamlandı!"}
              </p>
              <p className="text-brand-200 text-sm">
                {decks.length} deste, toplam{" "}
                {decks.reduce((s, d) => s + d.totalCards, 0)} kart
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deste listesi */}
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Destelerim</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => (
              <DeckCard key={deck.id} {...deck} />
            ))}
            <NewDeckCard onClick={() => setShowNewDeck(true)} />
          </div>
        )}
      </div>

      {/* Yeni Deste Modal */}
      <Modal
        isOpen={showNewDeck}
        onClose={() => setShowNewDeck(false)}
        title="Yeni Deste Oluştur"
      >
        <div className="space-y-4">
          <Input
            label="Deste Adı"
            placeholder="ör. A1 Kelimeler, Fiiller..."
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            autoFocus
          />
          <Input
            label="Açıklama (isteğe bağlı)"
            placeholder="Bu deste hakkında kısa açıklama"
            value={newDeckDesc}
            onChange={(e) => setNewDeckDesc(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Renk
            </label>
            <div className="flex gap-2">
              {DECK_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewDeckColor(color)}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    backgroundColor: color,
                    outline:
                      newDeckColor === color
                        ? `3px solid ${color}`
                        : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={handleCreateDeck}
            loading={creating}
            disabled={!newDeckName.trim()}
            className="w-full"
            size="lg"
          >
            Deste Oluştur
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
