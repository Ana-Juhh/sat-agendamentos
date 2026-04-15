import Link from 'next/link';
import { type RefObject } from 'react';

import { type HomeLocale } from '@/components/HomePageContent';

type HeaderContent = {
  admin: string;
  login: string;
  languageLabel: string;
  options: Array<{
    code: HomeLocale;
    label: string;
    shortLabel: string;
    flag: string;
  }>;
};

type HeaderProps = {
  locale: HomeLocale;
  content: HeaderContent;
  isLanguageMenuOpen: boolean;
  onLanguageMenuToggle: () => void;
  onLanguageChange: (locale: HomeLocale) => void;
  languageMenuRef: RefObject<HTMLDivElement | null>;
};

export default function Header({
  locale,
  content,
  isLanguageMenuOpen,
  onLanguageMenuToggle,
  onLanguageChange,
  languageMenuRef,
}: HeaderProps) {
  const currentOption = content.options.find((option) => option.code === locale) ?? content.options[0];

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Colégio Satélite" className="site-logo site-logo--light h-12" />
            <img src="/logobranco.png" alt="Colégio Satélite" className="site-logo site-logo--dark h-12" />
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/admin" className="font-medium text-gray-700 hover:text-gray-900">
              {content.admin}
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition hover:bg-blue-600"
            >
              {content.login}
            </Link>

            <div className="relative" ref={languageMenuRef}>
              <button
                type="button"
                onClick={onLanguageMenuToggle}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                aria-haspopup="menu"
                aria-expanded={isLanguageMenuOpen}
                aria-label={content.languageLabel}
                title={content.languageLabel}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-lg shadow-inner">
                  {currentOption.flag}
                </span>
                <span className="hidden text-sm font-semibold sm:block">{currentOption.shortLabel}</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isLanguageMenuOpen ? (
                <div
                  className="absolute right-0 z-20 mt-3 w-52 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl"
                  role="menu"
                  aria-label={content.languageLabel}
                >
                  {content.options.map((option) => {
                    const isActive = option.code === locale;

                    return (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => onLanguageChange(option.code)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        role="menuitemradio"
                        aria-checked={isActive}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg">
                          {option.flag}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="block text-xs text-gray-500">{option.shortLabel}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
