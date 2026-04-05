"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  Download,
  Upload,
  Info,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  User,
  Lock,
  LogOut,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface ImportResult {
  success: boolean;
  imported?: { decks: number; cards: number };
  errors?: string[];
  error?: string;
}

interface UserSettings {
  displayName: string | null;
  theme: string;
  defaultNewPerDay: number;
  defaultReviewPerDay: number;
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Import/Export state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile form
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Danger zone
  const [resetConfirm, setResetConfirm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [processing, setProcessing] = useState(false);

  // Sonuç mesajı
  const [toast, setToast] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Settings fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Export ---
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export başarısız");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename="(.+)"/)?.[1] ||
        `besserlernen-export-${new Date().toISOString().split("T")[0]}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      setImportResult({ success: false, error: "Dışa aktarma başarısız oldu" });
      setShowResultModal(true);
    } finally {
      setExporting(false);
    }
  };

  // --- Import ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImportResult({ success: false, error: "Dosya boyutu 5MB'dan büyük olamaz" });
      setShowResultModal(true);
      return;
    }
    if (!file.name.endsWith(".json")) {
      setImportResult({ success: false, error: "Sadece .json dosyaları kabul edilir" });
      setShowResultModal(true);
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setImportResult({ success: false, error: "Geçersiz JSON formatı" });
        setShowResultModal(true);
        return;
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      setImportResult(res.ok ? result : { success: false, error: result.error || "İçe aktarma başarısız" });
      setShowResultModal(true);
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({ success: false, error: "İçe aktarma sırasında bir hata oluştu" });
      setShowResultModal(true);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Profile ---
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) {
        await fetchSettings();
        setShowProfileModal(false);
        showToast("Profil güncellendi");
      }
    } catch (err) {
      console.error("Profile save error:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Password ---
  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("Yeni şifre en az 6 karakter olmalı");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Şifreler eşleşmiyor");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Şifre değiştirilemedi");
        return;
      }
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Şifre değiştirildi");
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError("Bir hata oluştu");
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Reset SRS ---
  const handleResetProgress = async () => {
    if (resetConfirm !== "SIFIRLA") return;
    setProcessing(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "SIFIRLA" }),
      });
      if (res.ok) {
        setShowResetModal(false);
        setResetConfirm("");
        showToast("İlerleme sıfırlandı");
      }
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setProcessing(false);
    }
  };

  // --- Delete Account ---
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "SIL") return;
    setProcessing(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "SIL" }),
      });
      if (res.ok) {
        window.location.href = "/giris";
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setProcessing(false);
    }
  };

  // --- Settings update ---
  const handleSettingUpdate = async (field: string, value: number) => {
    try {
      const res = await fetch("/api/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        await fetchSettings();
      }
    } catch (err) {
      console.error("Setting update error:", err);
    }
  };

  return (
    <div className="pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-1">Ayarlar</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Uygulama tercihleri</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top">
          {toast}
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Profil */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
            PROFİL
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y dark:divide-gray-700">
            <button
              onClick={() => {
                setDisplayName(settings?.displayName || user?.displayName || "");
                setShowProfileModal(true);
              }}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Görünen Ad</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {settings?.displayName || user?.displayName || user?.username}
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                setPasswordError("");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordModal(true);
              }}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Şifre Değiştir</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hesap şifrenizi güncelleyin
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Genel */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
            GENEL
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y dark:divide-gray-700">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-brand-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">Karanlık Mod</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Göz dostu karanlık tema
                </p>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  theme === "dark" ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
            <div className="flex items-center gap-3 p-4">
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Varsayılan Günlük Yeni Kart</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Yeni desteler için varsayılan ayar
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSettingUpdate("defaultNewPerDay", Math.max(1, (settings?.defaultNewPerDay || 20) - 5))}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  -
                </button>
                <span className="text-sm font-semibold text-brand-600 w-8 text-center">
                  {settings?.defaultNewPerDay ?? 20}
                </span>
                <button
                  onClick={() => handleSettingUpdate("defaultNewPerDay", Math.min(999, (settings?.defaultNewPerDay || 20) + 5))}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Varsayılan Günlük Tekrar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Günlük maksimum tekrar sayısı
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSettingUpdate("defaultReviewPerDay", Math.max(1, (settings?.defaultReviewPerDay || 200) - 50))}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  -
                </button>
                <span className="text-sm font-semibold text-brand-600 w-8 text-center">
                  {settings?.defaultReviewPerDay ?? 200}
                </span>
                <button
                  onClick={() => handleSettingUpdate("defaultReviewPerDay", Math.min(9999, (settings?.defaultReviewPerDay || 200) + 50))}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Veri Yönetimi */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
            VERİ YÖNETİMİ
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y dark:divide-gray-700">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Verileri Dışa Aktar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">JSON formatında indir</p>
              </div>
              {exporting && (
                <div className="animate-spin w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full" />
              )}
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Verileri İçe Aktar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">JSON dosyası yükle</p>
              </div>
              {importing && (
                <div className="animate-spin w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Çıkış */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <p className="font-medium text-sm text-red-500">Çıkış Yap</p>
        </button>

        {/* Tehlikeli Bölge */}
        <div>
          <h3 className="text-xs font-semibold text-red-400 mb-2 px-1">
            TEHLİKELİ BÖLGE
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-900/50 divide-y dark:divide-gray-700">
            <button
              onClick={() => {
                setResetConfirm("");
                setShowResetModal(true);
              }}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <RotateCcw className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="font-medium text-sm">İlerlemeyi Sıfırla</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Kartlar korunur, SRS ve istatistikler sıfırlanır
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                setDeleteConfirm("");
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-sm text-red-600">Hesabı Sil</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tüm veriler kalıcı olarak silinir
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Hakkında */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
            HAKKINDA
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 p-4">
              <Info className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">BesserLernen</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Versiyon 0.1.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* SRS açıklaması */}
        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-4 border border-brand-200 dark:border-brand-700">
          <h3 className="font-semibold text-brand-800 dark:text-brand-200 mb-2">
            SM-2 Algoritması
          </h3>
          <p className="text-sm text-brand-700 dark:text-brand-300 leading-relaxed">
            BesserLernen, Anki&apos;nin kullandığı SM-2 (SuperMemo 2) aralıklı
            tekrar algoritmasını kullanır. Bu algoritma, her kartın zorluk
            derecesine göre tekrar aralıklarını otomatik olarak ayarlar.
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-brand-700 dark:text-brand-300">Tekrar: 10 dakika sonra göster</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-brand-700 dark:text-brand-300">Zor: Daha kısa aralıkla tekrarla</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-brand-700 dark:text-brand-300">İyi: Normal aralıkla tekrarla</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-brand-700 dark:text-brand-300">Kolay: Daha uzun aralıkla tekrarla</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profil Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Görünen Adı Düzenle">
        <div className="space-y-4">
          <Input
            label="Görünen Ad"
            placeholder="Adınız"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
          />
          <Button onClick={handleSaveProfile} loading={savingProfile} className="w-full">
            Kaydet
          </Button>
        </div>
      </Modal>

      {/* Şifre Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Şifre Değiştir">
        <div className="space-y-4">
          <Input
            label="Mevcut Şifre"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
          />
          <Input
            label="Yeni Şifre"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="En az 6 karakter"
          />
          <Input
            label="Yeni Şifre (Tekrar)"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
          />
          <Button onClick={handleChangePassword} loading={savingPassword} className="w-full">
            Şifreyi Değiştir
          </Button>
        </div>
      </Modal>

      {/* Sıfırlama Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="İlerlemeyi Sıfırla">
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Bu işlem tüm SRS ilerlemesini, istatistikleri ve çalışma geçmişini sıfırlar.
              <strong> Kartlarınız ve desteleriniz korunacaktır.</strong>
            </p>
          </div>
          <Input
            label='Onaylamak için "SIFIRLA" yazın'
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            autoFocus
          />
          <Button
            variant="danger"
            onClick={handleResetProgress}
            loading={processing}
            disabled={resetConfirm !== "SIFIRLA"}
            className="w-full"
          >
            İlerlemeyi Sıfırla
          </Button>
        </div>
      </Modal>

      {/* Hesap Silme Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hesabı Sil">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Bu işlem geri alınamaz!</strong> Hesabınız, tüm desteleriniz, kartlarınız
              ve istatistikleriniz kalıcı olarak silinecektir.
            </p>
          </div>
          <Input
            label='Onaylamak için "SIL" yazın'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoFocus
          />
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            loading={processing}
            disabled={deleteConfirm !== "SIL"}
            className="w-full"
          >
            Hesabı Kalıcı Olarak Sil
          </Button>
        </div>
      </Modal>

      {/* Import/Export Sonuç Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title={importResult?.success ? "İçe Aktarma Başarılı" : "Sonuç"}
      >
        <div className="space-y-4">
          {importResult?.success ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-lg">
                {importResult.imported?.decks} deste, {importResult.imported?.cards} kart içe aktarıldı
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-3 text-left bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-1">
                    Bazı öğeler atlandı:
                  </p>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>- {err}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... ve {importResult.errors.length - 5} hata daha</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-lg">Hata</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {importResult?.error || "Bilinmeyen bir hata oluştu"}
              </p>
            </div>
          )}
          <Button
            onClick={() => {
              setShowResultModal(false);
              if (importResult?.success) window.location.reload();
            }}
            className="w-full"
          >
            {importResult?.success ? "Tamam" : "Kapat"}
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
