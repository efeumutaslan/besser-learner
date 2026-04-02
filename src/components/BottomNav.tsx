"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Desteler", icon: BookOpen },
  { href: "/calisma", label: "Çalış", icon: GraduationCap },
  { href: "/market", label: "Market", icon: Store },
  { href: "/istatistik", label: "İstatistik", icon: BarChart3 },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom">
      <div className="mx-auto max-w-lg lg:max-w-6xl">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
                  isActive
                    ? "text-brand-600"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                )}
              >
                <Icon
                  className={cn("w-5 h-5", isActive && "stroke-[2.5]")}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
