"use client";

import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Bir hata olustu
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        {error.message || "Beklenmeyen bir hata meydana geldi. Lutfen tekrar deneyin."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Tekrar Dene</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Ana Sayfa
        </Button>
      </div>
    </div>
  );
}
