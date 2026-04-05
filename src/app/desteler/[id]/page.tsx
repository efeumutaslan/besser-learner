"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
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
  Type,
  PenLine,
  GraduationCap,
  ImageIcon,
} from "lucide-react";

type StudyDirection = "de_to_tr" | "tr_to_de" | "mixed";

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
  // SRS ayarlari
  learningSteps: string;
  graduatingInterval: number;
  easyInterval: number;
  relearningSteps: string;
  lapseMinInterval: number;
  leechThreshold: number;
  maxInterval: number;
  startingEase: number;
  easyBonus: number;
  intervalModifier: number;
  hardModifier: number;
  cards: Card[];
  stats: {
    total: number;
    new: number;
    learning: number;
    review: number;
    mature: number;
  };
}

const CardListItem = memo(function CardListItem({
  card,
  onEdit,
  onDelete,
}: {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        getArtikelBgColor(card.artikel)
      )}
    >
      <div className="flex items-start justify-between">
        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt={card.word}
            className="w-10 h-10 rounded-lg object-cover mr-3 flex-shrink-0"
          />
        )}
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
            <span className="font-semibold text-gray-900 dark:text-white">{card.word}</span>
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
            onClick={() => onEdit(card)}
            className="p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10"
          >
            <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [direction, setDirection] = useState<StudyDirection>("mixed");
  const [savingSettings, setSavingSettings] = useState(false);
  const [fetchingImages, setFetchingImages] = useState(false);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [srsForm, setSrsForm] = useState({
    newPerDay: 20,
    reviewPerDay: 200,
    learningSteps: "1,10",
    graduatingInterval: 1,
    easyInterval: 4,
    relearningSteps: "10",
    lapseMinInterval: 1,
    startingEase: 250,
    easyBonus: 130,
    intervalModifier: 100,
    hardModifier: 120,
    maxInterval: 36500,
  });

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

  // Deck yuklenince SRS form'u doldur
  useEffect(() => {
    if (deck) {
      setSrsForm({
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
        learningSteps: deck.learningSteps ?? "1,10",
        graduatingInterval: deck.graduatingInterval ?? 1,
        easyInterval: deck.easyInterval ?? 4,
        relearningSteps: deck.relearningSteps ?? "10",
        lapseMinInterval: deck.lapseMinInterval ?? 1,
        startingEase: deck.startingEase ?? 250,
        easyBonus: deck.easyBonus ?? 130,
        intervalModifier: deck.intervalModifier ?? 100,
        hardModifier: deck.hardModifier ?? 120,
        maxInterval: deck.maxInterval ?? 36500,
      });
    }
  }, [deck]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/desteler/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(srsForm),
      });
      if (res.ok) {
        setShowSettings(false);
        fetchDeck(false);
      }
    } catch {
      toast("Ayarlar kaydedilemedi", "error");
    } finally {
      setSavingSettings(false);
    }
  };

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

  const handleEditClick = useCallback((card: Card) => setEditingCard(card), []);
  const handleDeleteClick = useCallback((id: string) => setDeleteConfirm(id), []);

  const displayCards = isShuffled ? shuffledCards : deck?.cards || [];

  const handleFetchImages = async () => {
    setFetchingImages(true);
    setImageResult(null);
    try {
      const res = await fetch(`/api/desteler/${deckId}/fetch-images`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setImageResult(`${data.updated} karta resim eklendi`);
        fetchDeck(false);
      } else {
        const msg = data.error || "Bilinmeyen hata";
        setImageResult("Hata: " + msg);
        toast(msg, "error");
      }
    } catch {
      setImageResult("Baglanti hatasi");
      toast("Resim cekme basarisiz", "error");
    } finally {
      setFetchingImages(false);
    }
  };

  const cardsWithoutImage = useMemo(
    () => deck?.cards.filter((c) => !c.imageUrl).length || 0,
    [deck?.cards]
  );

  const handleDeleteDeck = async () => {
    const res = await fetch(`/api/desteler/${deckId}`, { method: "DELETE" });
    if (res.ok) {
      invalidateCache("/api/desteler");
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="p-4 pt-6 rounded-b-3xl bg-gray-300 dark:bg-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-white/20" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 bg-white/20 rounded" />
              <div className="h-3 w-24 bg-white/10 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white/10" />
            ))}
          </div>
        </div>
        {/* Study modes skeleton */}
        <div className="p-4 space-y-3">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
            ))}
          </div>
        </div>
        {/* Card list skeleton */}
        <div className="p-4 space-y-2">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!deck) return null;

  const dueCount = deck.stats.learning + deck.stats.review;

  const withDirection = (path: string) => `${path}?direction=${direction}`;

  const handleFunModeClick = (path: string) => {
    if (dueCount > 0) {
      setPendingNav(path);
    } else {
      router.push(withDirection(path));
    }
  };

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

      {/* Yön seçici */}
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          ÇALIŞMA YÖNÜ
        </h3>
        <div className="flex gap-2">
          {([
            { key: "de_to_tr" as StudyDirection, label: "DE → TR", desc: "Almanca → Türkçe" },
            { key: "tr_to_de" as StudyDirection, label: "TR → DE", desc: "Türkçe → Almanca" },
            { key: "mixed" as StudyDirection, label: "Karışık", desc: "Her iki yön" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDirection(key)}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all text-center",
                direction === key
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}
            >
              {label}
            </button>
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
            href={withDirection(`/desteler/${deckId}/calis`)}
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
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/ogren`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left"
          >
            <BookOpen className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-semibold text-sm">Öğren</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Yazarak öğren</div>
            </div>
          </button>
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/test`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left"
          >
            <ListChecks className="w-6 h-6 text-purple-600" />
            <div>
              <div className="font-semibold text-sm">Test</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Çoktan seçmeli</div>
            </div>
          </button>
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/eslestir`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all text-left"
          >
            <ShuffleIcon className="w-6 h-6 text-orange-600" />
            <div>
              <div className="font-semibold text-sm">Eşleştir</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Zamanlı eşleştirme</div>
            </div>
          </button>
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/blast`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all text-left"
          >
            <Zap className="w-6 h-6 text-yellow-600" />
            <div>
              <div className="font-semibold text-sm">Blast</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Hızlı tepki</div>
            </div>
          </button>
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/artikel`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
          >
            <Type className="w-6 h-6 text-indigo-600" />
            <div>
              <div className="font-semibold text-sm">Artikel</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">der/die/das quiz</div>
            </div>
          </button>
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/bosluk`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all text-left col-span-2"
          >
            <PenLine className="w-6 h-6 text-teal-600" />
            <div>
              <div className="font-semibold text-sm">Cümle Tamamla</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Boşluk doldurma</div>
            </div>
          </button>
          <button
            onClick={() => handleFunModeClick(`/desteler/${deckId}/gramer`)}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left col-span-2"
          >
            <GraduationCap className="w-6 h-6 text-violet-600" />
            <div>
              <div className="font-semibold text-sm">Gramer</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Akkusativ / Dativ drill</div>
            </div>
          </button>
        </div>
      </div>

      {/* Toplu resim çekme banner */}
      {cardsWithoutImage > 0 && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">
                    {cardsWithoutImage} kart resim bekliyor
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Pixabay&apos;dan otomatik resim ekle
                  </p>
                </div>
              </div>
              <button
                onClick={handleFetchImages}
                disabled={fetchingImages}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {fetchingImages ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Çekiliyor...
                  </>
                ) : (
                  "Resimleri Çek"
                )}
              </button>
            </div>
            {imageResult && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 font-medium">{imageResult}</p>
            )}
          </div>
        </div>
      )}

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
              <CardListItem
                key={card.id}
                card={card}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
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

      {/* Deste Ayarlari Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Deste Ayarlari"
        size="lg"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Gunluk Limitler */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Gunluk Limitler</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Yeni kart / gun</label>
                <input type="number" min={0} max={999}
                  value={srsForm.newPerDay}
                  onChange={(e) => setSrsForm(p => ({ ...p, newPerDay: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tekrar / gun</label>
                <input type="number" min={0} max={9999}
                  value={srsForm.reviewPerDay}
                  onChange={(e) => setSrsForm(p => ({ ...p, reviewPerDay: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Ogrenme Adimlari */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Ogrenme</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ogrenme adimlari (dk, virgul ile)</label>
                <input type="text"
                  value={srsForm.learningSteps}
                  onChange={(e) => setSrsForm(p => ({ ...p, learningSteps: e.target.value }))}
                  placeholder="1,10"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Mezuniyet araligi (gun)</label>
                  <input type="number" min={1} max={365}
                    value={srsForm.graduatingInterval}
                    onChange={(e) => setSrsForm(p => ({ ...p, graduatingInterval: +e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Kolay araligi (gun)</label>
                  <input type="number" min={1} max={365}
                    value={srsForm.easyInterval}
                    onChange={(e) => setSrsForm(p => ({ ...p, easyInterval: +e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hatirlamama (Lapse) */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Hatirlamama</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tekrar ogrenme adimlari (dk)</label>
                <input type="text"
                  value={srsForm.relearningSteps}
                  onChange={(e) => setSrsForm(p => ({ ...p, relearningSteps: e.target.value }))}
                  placeholder="10"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Minimum aralik (gun)</label>
                <input type="number" min={1} max={365}
                  value={srsForm.lapseMinInterval}
                  onChange={(e) => setSrsForm(p => ({ ...p, lapseMinInterval: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Gelismis Ayarlar */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Gelismis</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Baslangic kolayligi (%)</label>
                <input type="number" min={130} max={500}
                  value={srsForm.startingEase}
                  onChange={(e) => setSrsForm(p => ({ ...p, startingEase: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Kolay bonusu (%)</label>
                <input type="number" min={100} max={500}
                  value={srsForm.easyBonus}
                  onChange={(e) => setSrsForm(p => ({ ...p, easyBonus: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Aralik carpani (%)</label>
                <input type="number" min={50} max={300}
                  value={srsForm.intervalModifier}
                  onChange={(e) => setSrsForm(p => ({ ...p, intervalModifier: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Zor carpani (%)</label>
                <input type="number" min={100} max={300}
                  value={srsForm.hardModifier}
                  onChange={(e) => setSrsForm(p => ({ ...p, hardModifier: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Maks aralik (gun)</label>
                <input type="number" min={1} max={36500}
                  value={srsForm.maxInterval}
                  onChange={(e) => setSrsForm(p => ({ ...p, maxInterval: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-3 pt-2 border-t dark:border-gray-700">
            <Button
              onClick={handleSaveSettings}
              loading={savingSettings}
              className="flex-1"
            >
              Kaydet
            </Button>
          </div>
          <div className="pt-2">
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

      {/* Tekrar Uyarı Dialogu */}
      <Modal
        isOpen={!!pendingNav}
        onClose={() => setPendingNav(null)}
        title="Bekleyen Tekrarlar"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Bu destede <span className="font-bold text-brand-600">{dueCount} tekrar kartın</span> var.
          Önce tekrarlarını tamamlamak ister misin?
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              const nav = pendingNav;
              setPendingNav(null);
              if (nav) router.push(withDirection(nav));
            }}
            className="flex-1"
          >
            Devam Et
          </Button>
          <Button
            onClick={() => {
              setPendingNav(null);
              router.push(withDirection(`/desteler/${deckId}/calis`));
            }}
            className="flex-1"
          >
            Tekrar Et
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
