"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getArtikelBadgeColor, cn } from "@/lib/utils";
import { ImagePlus, Volume2, X, Upload } from "lucide-react";

export interface CardFormData {
  word: string;
  wordTranslation: string;
  artikel: string;
  plural: string;
  nominativ: string;
  akkusativ: string;
  dativ: string;
  exampleSentence: string;
  sentenceTranslation: string;
  notes: string;
  imageUrl: string;
  wordAudioUrl: string;
  sentenceAudioUrl: string;
}

function ImageUpload({
  imageUrl,
  onImageUploaded,
  onImageRemoved,
}: {
  imageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onImageUploaded(data.url);
      }
    } catch (err) {
      console.error("Resim yüklenemedi:", err);
    } finally {
      setUploading(false);
    }
  };

  if (imageUrl) {
    return (
      <div className="relative inline-block">
        <img
          src={imageUrl}
          alt="Kart resmi"
          className="w-32 h-32 object-cover rounded-xl border"
        />
        <button
          type="button"
          onClick={onImageRemoved}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
      >
        {uploading ? (
          <div className="animate-spin w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full" />
        ) : (
          <>
            <ImagePlus className="w-6 h-6" />
          </>
        )}
      </button>
    </>
  );
}

function AudioUpload({
  audioUrl,
  label,
  onAudioUploaded,
  onAudioRemoved,
}: {
  audioUrl?: string;
  label: string;
  onAudioUploaded: (url: string) => void;
  onAudioRemoved: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onAudioUploaded(data.url);
      }
    } catch (err) {
      console.error("Ses yüklenemedi:", err);
    } finally {
      setUploading(false);
    }
  };

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <Volume2 className="w-4 h-4 text-brand-500 shrink-0" />
        <audio src={audioUrl} controls className="h-8 flex-1 min-w-0" />
        <button
          type="button"
          onClick={onAudioRemoved}
          className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <X className="w-4 h-4 text-red-500" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-500 transition-all w-full"
      >
        {uploading ? (
          <div className="animate-spin w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {label}
      </button>
    </>
  );
}

type InitialCardData = {
  [K in keyof CardFormData]?: CardFormData[K] | null;
};

interface CardFormProps {
  initialData?: InitialCardData;
  onSubmit: (data: CardFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const ARTIKEL_OPTIONS = [
  { value: "", label: "Artikel seçin" },
  { value: "der", label: "der (Maskulin)" },
  { value: "die", label: "die (Feminin)" },
  { value: "das", label: "das (Neutrum)" },
  { value: "die (Pl.)", label: "die (Plural)" },
  { value: "-", label: "Yok (Fiil, Sıfat vb.)" },
];

export default function CardForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Kaydet",
}: CardFormProps) {
  const [form, setForm] = useState<CardFormData>({
    word: initialData?.word || "",
    wordTranslation: initialData?.wordTranslation || "",
    artikel: initialData?.artikel || "",
    plural: initialData?.plural || "",
    nominativ: initialData?.nominativ || "",
    akkusativ: initialData?.akkusativ || "",
    dativ: initialData?.dativ || "",
    exampleSentence: initialData?.exampleSentence || "",
    sentenceTranslation: initialData?.sentenceTranslation || "",
    notes: initialData?.notes || "",
    imageUrl: initialData?.imageUrl || "",
    wordAudioUrl: initialData?.wordAudioUrl || "",
    sentenceAudioUrl: initialData?.sentenceAudioUrl || "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const newUploadsRef = useRef<string[]>([]);
  const savedRef = useRef(false);

  // Component unmount olursa (modal X, overlay tik vb.) ve kaydetmediyse temizle
  useEffect(() => {
    return () => {
      if (!savedRef.current && newUploadsRef.current.length > 0) {
        fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: newUploadsRef.current }),
        }).catch(() => {});
      }
    };
  }, []);

  const trackUpload = useCallback((url: string) => {
    newUploadsRef.current.push(url);
  }, []);

  const cleanupUploads = useCallback(async () => {
    const urls = newUploadsRef.current;
    if (urls.length === 0) return;
    try {
      await fetch("/api/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
    } catch {
      // Temizleme basarisiz olursa sessizce devam et
    }
    newUploadsRef.current = [];
  }, []);

  const update = (field: keyof CardFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.word.trim()) errs.word = "Kelime gerekli";
    if (!form.wordTranslation.trim())
      errs.wordTranslation = "Çeviri gerekli";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      savedRef.current = true; // Basarili kayit, cleanup yapma
      newUploadsRef.current = [];
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await cleanupUploads();
    onCancel();
  };

  return (
    <div className="space-y-4">
      {/* Artikel göstergesi */}
      {form.artikel && form.artikel !== "-" && (
        <div className="flex justify-center">
          <span
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-bold",
              getArtikelBadgeColor(form.artikel)
            )}
          >
            {form.artikel}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Almanca Kelime *"
          placeholder="ör. Haus, laufen, schön"
          value={form.word}
          onChange={(e) => update("word", e.target.value)}
          error={errors.word}
          autoFocus
        />
        <Input
          label="Türkçe Çevirisi *"
          placeholder="ör. ev, koşmak, güzel"
          value={form.wordTranslation}
          onChange={(e) => update("wordTranslation", e.target.value)}
          error={errors.wordTranslation}
        />
      </div>

      <Select
        label="Artikel"
        options={ARTIKEL_OPTIONS}
        value={form.artikel}
        onChange={(e) => update("artikel", e.target.value)}
      />

      <Input
        label="Çoğul Hali"
        placeholder="ör. Häuser"
        value={form.plural}
        onChange={(e) => update("plural", e.target.value)}
        hint="İsimler için çoğul formu"
      />

      <div className="border-t dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
          Hal Ekleri (Deklinasyon)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Nominativ"
            placeholder="ör. der Hund"
            value={form.nominativ}
            onChange={(e) => update("nominativ", e.target.value)}
          />
          <Input
            label="Akkusativ"
            placeholder="ör. den Hund"
            value={form.akkusativ}
            onChange={(e) => update("akkusativ", e.target.value)}
          />
          <Input
            label="Dativ"
            placeholder="ör. dem Hund"
            value={form.dativ}
            onChange={(e) => update("dativ", e.target.value)}
          />
        </div>
      </div>

      <div className="border-t dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
          Örnek Cümle
        </h4>
        <div className="space-y-3">
          <Input
            label="Almanca Cümle"
            placeholder="ör. Das Haus ist groß."
            value={form.exampleSentence}
            onChange={(e) => update("exampleSentence", e.target.value)}
          />
          <Input
            label="Türkçe Çevirisi"
            placeholder="ör. Ev büyüktür."
            value={form.sentenceTranslation}
            onChange={(e) => update("sentenceTranslation", e.target.value)}
          />
        </div>
      </div>

      {/* Resim yükleme */}
      <div className="border-t dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
          Resim
        </h4>
        <ImageUpload
          imageUrl={form.imageUrl}
          onImageUploaded={(url) => { trackUpload(url); update("imageUrl", url); }}
          onImageRemoved={() => update("imageUrl", "")}
        />
      </div>

      {/* Ses yukleme */}
      <div className="border-t dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
          Ses Dosyaları
        </h4>
        <div className="space-y-2">
          <AudioUpload
            audioUrl={form.wordAudioUrl}
            label="Kelime sesi yükle"
            onAudioUploaded={(url) => { trackUpload(url); update("wordAudioUrl", url); }}
            onAudioRemoved={() => update("wordAudioUrl", "")}
          />
          <AudioUpload
            audioUrl={form.sentenceAudioUrl}
            label="Cümle sesi yükle"
            onAudioUploaded={(url) => { trackUpload(url); update("sentenceAudioUrl", url); }}
            onAudioRemoved={() => update("sentenceAudioUrl", "")}
          />
        </div>
      </div>

      <Input
        label="Notlar"
        placeholder="Ek notlar, ipuçları..."
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
      />

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={handleCancel} className="flex-1">
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          className="flex-1"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
