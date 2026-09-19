"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import logo from "@/assets/logo.png";
import ThemeToggle from "./ThemeToggle";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Nav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("home") },
    { href: "/features", label: t("features") },
    { href: "/download", label: t("download") },
    { href: "/docs", label: t("docs") },
  ] as const;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <Image
            src={logo}
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-base font-semibold text-text">Rafeeq</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-subtext transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/download"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("download")}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("closeMenu") : t("openMenu")}
          aria-expanded={open}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text sm:hidden"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-4 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-subtext transition-colors hover:bg-input-bg hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/download"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("download")}
          </Link>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
