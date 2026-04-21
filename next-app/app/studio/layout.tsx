"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/studio", label: "대시보드", icon: "📊" },
  { href: "/studio/works", label: "작품 관리", icon: "📚" },
  { href: "/studio/format-studio", label: "연출 도우미", icon: "✨" },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--ink-bg)]">
      {/* Sidebar — desktop */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-[var(--ink-border-white)] bg-[var(--ink-surface)] lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--ink-border-white)] px-6">
          <span className="text-lg font-black tracking-tight text-[var(--ink-gold)]">
            INKROAD
          </span>
          <span className="rounded-full bg-[var(--ink-gold)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--ink-gold)]">
            STUDIO
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/studio"
                ? pathname === "/studio"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[var(--ink-gold)]/15 text-[var(--ink-gold)]"
                    : "text-[var(--ink-fg-3)] hover:bg-[var(--ink-surface-2)] hover:text-[var(--ink-fg-1)]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--ink-border-white)] p-4">
          <Link
            href="/login"
            className="flex items-center gap-2 text-xs font-medium text-[var(--ink-fg-3)] transition-colors hover:text-[var(--ink-fg-1)]"
          >
            <span>⚙️</span> 설정 & 로그아웃
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--ink-border-white)] bg-[var(--ink-bg)]/90 px-4 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-fg-2)]"
        >
          <span className="text-xl">{sidebarOpen ? "✕" : "☰"}</span>
        </button>
        <span className="text-sm font-black tracking-tight text-[var(--ink-gold)]">
          INKROAD STUDIO
        </span>
        <div className="w-9" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-[var(--ink-border-white)] bg-[var(--ink-surface)] lg:hidden">
            <div className="flex h-14 items-center justify-between border-b border-[var(--ink-border-white)] px-5">
              <span className="text-lg font-black text-[var(--ink-gold)]">INKROAD</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-[var(--ink-fg-3)]"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/studio"
                    ? pathname === "/studio"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[var(--ink-gold)]/15 text-[var(--ink-gold)]"
                        : "text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 pt-14 lg:ml-60 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
