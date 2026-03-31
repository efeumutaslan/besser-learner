"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mic, Square, Play, Pause, Trash2, Volume2 } from "lucide-react";

interface AudioRecorderProps {
  audioUrl?: string | null;
  onAudioSaved: (url: string) => void;
  onAudioRemoved: () => void;
  label?: string;
}

export default function AudioRecorder({
  audioUrl,
  onAudioSaved,
  onAudioRemoved,
  label = "Ses Kaydı",
}: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(audioUrl || null);
  const [duration, setDuration] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (localUrl && localUrl.startsWith("blob:")) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [localUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setLocalUrl(url);

        // Dosyayı sunucuya yükle
        uploadAudio(blob);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mikrofon erişimi reddedildi:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const uploadAudio = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, `audio-${Date.now()}.webm`);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onAudioSaved(data.url);
      }
    } catch (err) {
      console.error("Ses yüklenemedi:", err);
    }
  };

  const togglePlay = () => {
    if (!localUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(localUrl);
      audioRef.current.onended = () => setPlaying(false);
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const removeAudio = () => {
    if (localUrl && localUrl.startsWith("blob:")) {
      URL.revokeObjectURL(localUrl);
    }
    setLocalUrl(null);
    setAudioBlob(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    onAudioRemoved();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {localUrl ? (
        // Kayıt mevcut
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <button
            type="button"
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
          >
            {playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-1.5 bg-green-200 rounded-full">
              <div className="h-full bg-green-500 rounded-full w-full" />
            </div>
          </div>
          <button
            type="button"
            onClick={removeAudio}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : recording ? (
        // Kayıt yapılıyor
        <button
          type="button"
          onClick={stopRecording}
          className="w-full flex items-center justify-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl animate-pulse"
        >
          <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
          <span className="font-medium text-red-600">
            Kayıt yapılıyor... {duration}s
          </span>
          <Square className="w-5 h-5 text-red-500" />
        </button>
      ) : (
        // Kayıt başlat
        <button
          type="button"
          onClick={startRecording}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
        >
          <Mic className="w-5 h-5" />
          <span className="text-sm font-medium">Ses Kaydet</span>
        </button>
      )}
    </div>
  );
}

// Basit ses oynatma butonu (kart görüntülemede kullanılacak)
export function PlayAudioButton({
  url,
  size = "sm",
}: {
  url: string;
  size?: "sm" | "md";
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }

    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        sizeClasses,
        "rounded-full flex items-center justify-center transition-colors",
        playing
          ? "bg-brand-500 text-white"
          : "bg-brand-100 text-brand-600 hover:bg-brand-200"
      )}
    >
      <Volume2 className={iconSize} />
    </button>
  );
}
