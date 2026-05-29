'use client';

import { useEffect, useRef, useState } from 'react';

import CalendarSection from '@/components/CalendarSection';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';

export type HomeLocale = 'pt-BR' | 'en';

type HomeTranslations = {
  header: {
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
  hero: {
    title: string;
    highlight: string;
    description: string;
    rules: Array<{
      title: string;
      text: string;
      accentClass: string;
    }>;
    cta: string;
    imageAlt: string;
    onlineBadge: string;
  };
  calendar: {
    month: string;
    weekDays: string[];
    bookings: Array<{
      teacher: string;
      classGroup: string;
      time: string;
      tone: 'blue-500' | 'blue-300' | 'pink-500';
    }>;
    title: string;
    description: string;
    activeTeachers: string;
    activeTeachersHighlight: string;
    activeTeacherTitle: string;
    previousMonthLabel: string;
    nextMonthLabel: string;
  };
  footer: {
    supportEmailLabel: string;
    copyright: string;
  };
};

const STORAGE_KEY = 'home-locale';

const translations: Record<HomeLocale, HomeTranslations> = {
  'pt-BR': {
    header: {
      admin: 'Admin',
      login: 'Login',
      languageLabel: 'Selecionar idioma',
      options: [
        { code: 'pt-BR', label: 'Português (Brasil)', shortLabel: 'PT-BR', flag: '🇧🇷' },
        { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇺🇸' },
      ],
    },
    hero: {
      title: 'Sistema de agendamento de',
      highlight: 'Chromebooks',
      description:
        'Bem-vindo ao sistema de agendamento digital. Para garantir que todos os alunos tenham acesso à tecnologia, pedimos que siga as diretrizes abaixo:',
      rules: [
        {
          title: 'Antecedência:',
          text: 'Realize sua reserva com pelo menos 1 hora de antecedência.',
          accentClass: 'border-yellow-400',
        },
        {
          title: 'Conferência:',
          text: 'Verifique se todos os aparelhos foram conectados à energia ao final da aula.',
          accentClass: 'border-blue-400',
        },
        {
          title: 'Suporte:',
          text: 'Relate defeitos imediatamente no campo de observações.',
          accentClass: 'border-red-400',
        },
      ],
      cta: 'Login',
      imageAlt: 'Chromebook',
      onlineBadge: 'Sistema Online',
    },
    calendar: {
      month: 'janeiro 2026',
      weekDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      bookings: [
        { teacher: 'Professora Claudia', classGroup: '2º ano A', time: '09:00 - 10:00', tone: 'blue-500' },
        { teacher: 'Professora Vanessa', classGroup: '5º ano C', time: '09:00 - 10:00', tone: 'blue-300' },
        { teacher: 'Professora Rita', classGroup: '7º ano B', time: '11:00 - 12:00', tone: 'pink-500' },
      ],
      title: 'Controle total dos seus agendamentos',
      description:
        'Nossa interface permite que você visualize todos os horários ocupados e disponíveis de forma clara. Veja rapidamente quais colegas já reservaram os Chromebooks, o horário exato e para qual turma, evitando conflitos de agenda e facilitando o planejamento da sua semana.',
      activeTeachers: 'Professores da rede já',
      activeTeachersHighlight: 'estão agendando.',
      activeTeacherTitle: 'Professor ativo',
      previousMonthLabel: 'Mês anterior',
      nextMonthLabel: 'Próximo mês',
    },
    footer: {
      supportEmailLabel: 'Email de suporte:',
      copyright: 'Copyright 2026 - AJS',
    },
  },
  en: {
    header: {
      admin: 'Admin',
      login: 'Login',
      languageLabel: 'Select language',
      options: [
        { code: 'pt-BR', label: 'Português (Brasil)', shortLabel: 'PT-BR', flag: '🇧🇷' },
        { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇺🇸' },
      ],
    },
    hero: {
      title: 'Chromebook booking',
      highlight: 'system',
      description:
        'Welcome to the digital booking system. To make sure every student has access to technology, please follow the guidelines below:',
      rules: [
        {
          title: 'Advance notice:',
          text: 'Please place your reservation at least 1 hour in advance.',
          accentClass: 'border-yellow-400',
        },
        {
          title: 'Check-in:',
          text: 'Make sure all devices are plugged back into power at the end of class.',
          accentClass: 'border-blue-400',
        },
        {
          title: 'Support:',
          text: 'Report any defects immediately in the notes field.',
          accentClass: 'border-red-400',
        },
      ],
      cta: 'Login',
      imageAlt: 'Chromebook',
      onlineBadge: 'System Online',
    },
    calendar: {
      month: 'January 2026',
      weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      bookings: [
        { teacher: 'Teacher Claudia', classGroup: '2nd grade A', time: '09:00 - 10:00', tone: 'blue-500' },
        { teacher: 'Teacher Vanessa', classGroup: '5th grade C', time: '09:00 - 10:00', tone: 'blue-300' },
        { teacher: 'Teacher Rita', classGroup: '7th grade B', time: '11:00 - 12:00', tone: 'pink-500' },
      ],
      title: 'Full control of your bookings',
      description:
        'Our interface lets you view all occupied and available time slots clearly. Quickly see which colleagues have already reserved the Chromebooks, the exact time, and for which class, helping you avoid conflicts and plan your week better.',
      activeTeachers: 'Teachers across the network are already',
      activeTeachersHighlight: 'booking now.',
      activeTeacherTitle: 'Active teacher',
      previousMonthLabel: 'Previous month',
      nextMonthLabel: 'Next month',
    },
    footer: {
      supportEmailLabel: 'Support email:',
      copyright: 'Copyright 2026 - AJS',
    },
  },
};

export default function HomePageContent() {
  const [locale, setLocale] = useState<HomeLocale>('pt-BR');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(STORAGE_KEY);

    if (savedLocale === 'en' || savedLocale === 'pt-BR') {
      // Hydration-safe locale initialization from client-only storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const content = translations[locale];

  return (
    <>
      <Header
        locale={locale}
        content={content.header}
        isLanguageMenuOpen={isLanguageMenuOpen}
        onLanguageMenuToggle={() => setIsLanguageMenuOpen((open) => !open)}
        onLanguageChange={(nextLocale) => {
          setLocale(nextLocale);
          setIsLanguageMenuOpen(false);
        }}
        languageMenuRef={languageMenuRef}
      />
      <main>
        <HeroSection content={content.hero} />
        <CalendarSection content={content.calendar} />
      </main>
      <Footer content={content.footer} />
    </>
  );
}
