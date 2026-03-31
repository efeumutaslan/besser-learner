"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CardForm, { type CardFormData } from "@/components/CardForm";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn, getArtikelBadgeColor, getArtikelBgColor, shuffle } from "@/lib/utils";
import { cachedFetch, invalidateCache } from "@/lib/fetcher";
import {
  ArrowLeft,
  Plus,
  Play,
  BookOpen,
  ListChecks,
  Zap,
  Shuffle as ShuffleIcon,
  Pencil,
  Trash2,
  Settings,
  MoreVertical,
} from "lucide-react";

interface Card {
  id: string;
  word: string;
  wordTranslation: string;
  artikel: string | null;
  plural: string | null;
  nominativ: string | null;
  akkusativ: string | null;
  dativ: string | null;
  exampleSentence: string | null;
  sentenceTranslation: string | null;
  notes: string | null;
  imageUrl: string | null;
  status: string;
  interval: number;
  dueDate: string;
}

interface DeckDetail {
  id: string;
  name: string;
  description: string | null;
  color: string;
  newPerDay: number;
  reviewPerDay: number;
  cards: Card[];
  stats: {
    total: number;
    new: number;
    learning: number;
    review: number;
    mature: number;
  };
}

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);

  const fetchDeck = useCallback(async (useCache = true) => {
    try {
      if (!useCache) invalidateCache(`/api/desteler/${deckId}`);
      const data = await cachedFetch<DeckDetail>(`/api/desteler/${deckId}`);
      setDeck(data);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [deckId, router]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  const handleAddCard = async (data: CardFormData) => {
    const res = await fetch("/api/kartlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, deckId }),
    });
    if (res.ok) {
      setShowAddCard(false);
      fetchDeck(false);
    }
  };

  const handleEditCard = async (data: CardFormData) => {
    if (!editingCard) return;
    const res = await fetch(`/api/kartlar/${editingCard.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingCard(null);
      fetchDeck(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const res = await fetch(`/api/kartlar/${cardId}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchDeck(false);
    }
  };

  const handleShuffle = () => {
    if (!deck) return;
    if (isShuffled) {
      setIsShuffled(false);
    } else {
      setShuffledCards(shuffle(deck.cards));
      setIsShuffled(true);
    }
  };

  const displayCards = isShuffled ? shuffledCards : deck?.cards || [];

  const handleDeleteDeck = async () => {
    const res = await fetch(`/api/desteler/${deckId}`, { method: "DELETE" });
    if (res.ok) {
      invalidateCache("/api/desteler");
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!deck) return null;

  const dueCount = deck.stats.new + deck.stats.learning + deck.stats.review;

  return (
    <div className="pb-20">
      {/* Header */}
      <div
        className="p-4 pt-6 rounded-b-3xl text-white"
        style={{
          background: `linear-gradient(135deg, ${deck.color}, ${deck.color}dd)`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{deck.name}</h1>
            {deck.description && (
              <p className="text-white/70 text-sm">{deck.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Toplam", value: deck.stats.total, color: "bg-white/20" },
            { label: "Yeni", value: deck.stats.new, color: "bg-blue-500/50" },
            {
              label: "Öğrenme",
              value: deck.stats.learning,
              color: "bg-orange-500/50",
            },
            {
              label: "Tekrar",
              value: deck.stats.review,
              color: "bg-green-500/50",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn("rounded-xl p-2 text-center", stat.color)}
            >
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[10px] text-white/80">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Çalışma modları */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
          ÇALIŞMA MODLARI
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/desteler/${deckId}/calis`}
            className={cn(
              "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
              dueCount > 0
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
            )}
          >
            <Play className="w-6 h-6 text-brand-600" />
            <div>
              <div className="font-semibold text-sm">Tekrar Et</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {dueCount > 0 ? `${dueCount} kart` : "Tamamlandı"}
              </div>
            </div>
          </Link>
          <Link
            href={`/desteler/${deckId}/ogren`}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50 transition-all"
          >
            <BookOpen className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-semibold text-sm">Öğren</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Yazarak öğren</div>
            </div>
          </Link>
          <Link
            href={`/desteler/${deckId}/test`}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-all"
          >
            <ListChecks className="w-6 h-6 text-purple-600" />
            <div>
              <div className="font-semibold text-sm">Test</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Çoktan seçmeli</div>
            </div>
          </Link>
          <Link
            href={`/desteler/${deckId}/eslestir`}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-all"
          >
            <ShuffleIcon className="w-6 h-6 text-orange-600" />
            <div>
              <div className="font-semibold text-sm">Eşleştir</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Zamanlı eşleştirme</div>
            </div>
          </Link>
          <Link
            href={`/desteler/${deckId}/blast`}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-300 hover:bg-yellow-50 transition-all col-span-2"
          >
            <Zap className="w-6 h-6 text-yellow-600" />
            <div>
              <div className="font-semibold text-sm">Blast</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Asteroid oyunu - hızlı tepki</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Kart listesi */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            KARTLAR ({deck.cards.length})
          </h3>
          <div className="flex items-center gap-2">
            {deck.cards.length > 1 && (
              <button
                onClick={handleShuffle}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  isShuffled
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                )}
              >
                <ShuffleIcon className="w-4 h-4" />
                {isShuffled ? "Sıralı" : "Karıştır"}
              </button>
            )}
            <Button
              size="sm"
              onClick={() => setShowAddCard(true)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Kart Ekle
            </Button>
          </div>
        </div>

        {deck.cards.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Henüz kart eklenmemiş</p>
            <p className="text-sm mt-1">İlk kartınızı ekleyerek başlayın</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayCards.map((card) => (
              <div
                key={card.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  getArtikelBgColor(card.artikel)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {card.artikel && card.artikel !== "-" && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                            getArtikelBadgeColor(card.artikel)
                          )}
                        >
                          {card.artikel}
                        </span>
                      )}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{card.word}</span>
                      {card.plural && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          (Pl. {card.plural})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                      {card.wordTranslation}
                    </p>
                    {card.exampleSentence && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                        &quot;{card.exampleSentence}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setEditingCard(card)}
                      className="p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10"
                    >
                      <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(card.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kart Ekle Modal */}
      <Modal
        isOpen={showAddCard}
        onClose={() => setShowAddCard(false)}
        title="Yeni Kart Ekle"
        size="lg"
      >
        <CardForm
          onSubmit={handleAddCard}
          onCancel={() => setShowAddCard(false)}
          submitLabel="Kart Ekle"
        />
      </Modal>

      {/* Kart Düzenle Modal */}
      <Modal
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        title="Kartı Düzenle"
        size="lg"
      >
        {editingCard && (
          <CardForm
            initialData={editingCard}
            onSubmit={handleEditCard}
            onCancel={() => setEditingCard(null)}
            submitLabel="Güncelle"
          />
        )}
      </Modal>

      {/* Silme Onay */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Kartı Sil"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Bu kartı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm(null)}
            className="flex-1"
          >
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDeleteCard(deleteConfirm)}
            className="flex-1"
          >
            Sil
          </Button>
        </div>
      </Modal>

      {/* Deste Ayarları Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Deste Ayarları"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Günlük yeni kart</span>
              <span className="font-semibold">{deck.newPerDay}</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Günlük tekrar limiti</span>
              <span className="font-semibold">{deck.reviewPerDay}</span>
            </div>
          </div>
          <div className="border-t pt-4">
            <Button
              variant="danger"
              onClick={handleDeleteDeck}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Desteyi Sil
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
