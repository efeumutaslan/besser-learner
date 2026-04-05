"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Store,
  Search,
  Download,
  CheckCircle2,
  BookOpen,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface MarketDeck {
  id: string;
  name: string;
  description: string;
  category: string;
  cardCount: number;
  author: string;
  file: string;
  tags?: string[];
}

export default function MarketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [decks, setDecks] = useState<MarketDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const fetchMarket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/market/browse?${params}`);
      if (!res.ok) throw new Error("Yuklenemedi");

      const data = await res.json();
      setCategories(data.categories || []);
      setDecks(data.decks || []);
    } catch {
      setError("Market yuklenemedi. Internet baglantinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  const handleInstall = async (deck: MarketDeck) => {
    setInstalling(deck.id);
    try {
      const res = await fetch("/api/market/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: deck.file }),
      });

      if (res.ok) {
        setInstalled((prev) => new Set(prev).add(deck.id));
      }
    } catch {
      // sessiz hata
    } finally {
      setInstalling(null);
    }
  };

  const CATEGORY_ICONS: Record<string, string> = {
    goethe: "G",
    telc: "T",
    kelime: "K",
    gramer: "Gr",
    gunluk: "Gn",
    topluluk: "T+",
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">Deste Marketi</h1>
            <p className="text-emerald-200 text-sm">
              Hazir desteleri kesfet ve indir
            </p>
          </div>
        </div>

        {/* Arama */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Deste ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-emerald-200 text-sm focus:outline-none focus:bg-white/25 transition-colors"
          />
        </div>
      </div>

      {/* Kategoriler */}
      {categories.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                !selectedCategory
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}
            >
              Tumu
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === cat.id
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icerik */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Desteler yukleniyor...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchMarket} variant="secondary">
              Tekrar Dene
            </Button>
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {searchQuery
                ? "Aramaniza uygun deste bulunamadi"
                : "Henuz deste eklenmemis"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => {
              const isInstalled = installed.has(deck.id);
              const isInstalling = installing === deck.id;

              return (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
                          {CATEGORY_ICONS[deck.category] || deck.category.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {deck.name}
                          </h3>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {deck.author} · {deck.cardCount} kart
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {deck.description}
                      </p>
                      {deck.tags && deck.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {deck.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] text-gray-500 dark:text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      {isInstalled ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xs font-medium">Yuklendi</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleInstall(deck)}
                          loading={isInstalling}
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Download className="w-4 h-4" />
                          Indir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
