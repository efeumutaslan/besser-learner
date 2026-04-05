"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider, useToast } from "@/context/ToastContext";

function SWManager() {
  const { toast } = useToast();
  const pathname = usePathname();
  const [showUpdate, setShowUpdate] = useState(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setShowUpdate(true);
      }
      if (event.data?.type === "SYNC_COMPLETE") {
        toast(`${event.data.count} offline tekrar senkronize edildi`, "success");
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Online olunca kuyrugu isle
    const handleOnline = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage("PROCESS_SYNC_QUEUE");
      });
    };
    window.addEventListener("online", handleOnline);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
    };
  }, [handleMessage]);

  const isAuthPage = pathname === "/giris" || pathname === "/kayit";
  if (!showUpdate || isAuthPage) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9998] flex justify-center">
      <div className="bg-brand-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium">
        <span>Yeni versiyon mevcut</span>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-white text-brand-700 rounded-lg font-semibold hover:bg-brand-50 transition-all"
        >
          Guncelle
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="text-white/60 hover:text-white"
        >
          Sonra
        </button>
      </div>
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SWManager />
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
