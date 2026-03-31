"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl",
          "max-h-[90vh] overflow-y-auto",
          "animate-in slide-in-from-bottom duration-300",
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700 rounded-t-2xl z-10">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
