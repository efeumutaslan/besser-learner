"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Headphones,
  Shuffle,
  CheckCircle2,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  ThumbsUp,
} from "lucide-react";

interface VideoData {
  id: string;
  title: string;
  duration: number;
  level: string;
  topic: string;
  progress: number;
  watched: boolean;
  lastWatchedAt: string | null;
}

interface VideoStats {
  total: number;
  watched: number;
  remaining: number;
}

interface HistoryItem extends VideoData {}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

const LEVELS = ["A1", "A2", "B1", "B2"];

export default function EasyGermanPage() {
  const router = useRouter();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerolling, setRerolling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const fetchVideo = useCallback(
    async (withHistory = false) => {
      try {
        const params = new URLSearchParams();
        if (selectedLevel) params.set("level", selectedLevel);
        if (withHistory) params.set("history", "true");

        const res = await fetch(`/api/modules/easy-german?${params}`);
        if (!res.ok) throw new Error("Yuklenemedi");

        const data = await res.json();
        setVideo(data.video);
        setStats(data.stats);
        if (data.history) setHistory(data.history);
      } catch {
        // hata
      }
    },
    [selectedLevel]
  );

  // Ilk yuklenme
  useEffect(() => {
    setLoading(true);
    fetchVideo(true).finally(() => setLoading(false));
  }, [fetchVideo]);

  const handleReroll = async () => {
    setRerolling(true);
    await fetchVideo(false);
    setRerolling(false);
  };

  const handleMarkWatched = async () => {
    if (!video) return;
    setMarking(true);
    try {
      await fetch("/api/modules/easy-german/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          progress: 1,
          duration: video.duration || 600,
        }),
      });
      setVideo((prev) => (prev ? { ...prev, progress: 1, watched: true } : null));
      if (stats) {
        setStats({
          ...stats,
          watched: stats.watched + 1,
          remaining: Math.max(0, stats.remaining - 1),
        });
      }
    } catch {
      // sessiz
    } finally {
      setMarking(false);
    }
  };

  const handleLevelFilter = (level: string | null) => {
    setSelectedLevel(level);
  };

  const handleSelectFromHistory = (historyVideo: HistoryItem) => {
    setVideo(historyVideo);
    setShowHistory(false);
  };

  if (loading) {
    return (
      <div className="pb-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Video yukleniyor...
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-4 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Headphones className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">Easy German</h1>
              <p className="text-orange-200 text-xs">
                Hören — Dinleme Calismasi
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-lg">
              <Eye className="w-3.5 h-3.5" />
              <span>
                {stats.watched}/{stats.total} izlendi
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.remaining} kaldi</span>
            </div>
          </div>
        )}
      </div>

      {/* Level Filter */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleLevelFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              !selectedLevel
                ? "bg-orange-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            )}
          >
            <Filter className="w-3 h-3 inline mr-1" />
            Tumu
          </button>
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => handleLevelFilter(level)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                selectedLevel === level
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Video Player */}
      {video && (
        <div className="px-4 pt-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* YouTube Embed — key ile video degisince iframe yenilenir */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                key={video.id}
                src={`https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1&cc_load_policy=1&hl=de`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            </div>

            {/* Video Bilgileri */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                    {video.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        video.level === "A1" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                        video.level === "A2" &&
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                        video.level === "B1" &&
                          "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
                        video.level === "B2" &&
                          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      )}
                    >
                      {video.level}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {video.topic}
                    </span>
                  </div>
                </div>
                {video.watched && (
                  <div className="flex items-center gap-1 text-emerald-500 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-medium">Izlendi</span>
                  </div>
                )}
              </div>

              {/* Gecmiste izlendi uyarisi */}
              {video.watched && video.lastWatchedAt && (
                <div className="mt-2 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    Bu videoyu {formatDate(video.lastWatchedAt)} tarihinde izledin
                  </span>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-2 mt-3">
                {!video.watched && (
                  <Button
                    onClick={handleMarkWatched}
                    loading={marking}
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Izledim
                  </Button>
                )}
                <Button
                  onClick={handleReroll}
                  loading={rerolling}
                  variant="secondary"
                  className={cn("gap-2", video.watched ? "flex-1" : "")}
                >
                  <Shuffle className="w-4 h-4" />
                  Baska Video
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gecmis */}
      <div className="px-4 mt-4">
        <button
          onClick={() => {
            if (!showHistory && history.length === 0) {
              fetchVideo(true);
            }
            setShowHistory(!showHistory);
          }}
          className="w-full flex items-center justify-between py-3 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <span>Izleme Gecmisi</span>
          {showHistory ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showHistory && (
          <div className="space-y-2 pb-4">
            {history.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                Henuz video izlemedin
              </p>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectFromHistory(item)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all",
                    video?.id === item.id
                      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-semibold",
                            item.level === "A1" &&
                              "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                            item.level === "A2" &&
                              "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                            item.level === "B1" &&
                              "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
                            item.level === "B2" &&
                              "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          )}
                        >
                          {item.level}
                        </span>
                        {item.lastWatchedAt && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {formatDate(item.lastWatchedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {item.watched ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          {Math.round(item.progress * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
