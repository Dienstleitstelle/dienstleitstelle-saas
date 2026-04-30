'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Rolle } from '@/lib/supabase/types';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  rollen: Rolle[];
  section: string;
}

const NAV: NavItem[] = [
  // Übersicht
  { section: 'Übersicht', label: 'Dashboard',       href: '/dashboard',     icon: '📊', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Übersicht', label: 'Dienstplan',      href: '/dienstplan',    icon: '📅', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Übersicht', label: 'Schwarzes Brett', href: '/pinnwand',      icon: '📌', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Übersicht', label: 'Abwesenheit',     href: '/abwesenheit',   icon: '🏖️', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Übersicht', label: 'Aufgaben',        href: '/aufgaben',      icon: '✅', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Übersicht', label: 'Berichte',        href: '/berichte',      icon: '📝', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Übersicht', label: 'Zeiterfassung',   href: '/zeiterfassung', icon: '⏱️', rollen: ['admin','leitung','mitarbeiter'] },

  // Verwaltung (Admin + Leitung)
  { section: 'Verwaltung', label: 'Mitarbeiter',     href: '/mitarbeiter',     icon: '👥', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Objekte',         href: '/objekte',         icon: '🏢', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Vertretung',      href: '/vertretung',      icon: '🪑', rollen: ['admin','leitung'] },

  // Einstellungen (Admin)
  { section: 'Einstellungen', label: 'Übersicht',          href: '/einstellungen',                       icon: '⚙️', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Berufsgruppen',      href: '/einstellungen/berufsgruppen',         icon: '👔', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Berichts-Vorlagen',  href: '/einstellungen/berichts-vorlagen',     icon: '📋', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Team einladen',      href: '/einladungen',                         icon: '✉️', rollen: ['admin'] },
];

interface SidebarProps {
  rolle: Rolle;
  vorname: string | null;
  nachname: string | null;
  firma: string;
}

export function Sidebar({ rolle, vorname, nachname, firma }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const items = NAV.filter((it) => it.rollen.includes(rolle));
  const sections = Array.from(new Set(items.map((i) => i.section)));

  const initials = ((vorname?.[0] ?? '') + (nachname?.[0] ?? '')).toUpperCase() || '?';

  return (
    <>
      {/* Mobile-Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 h-12 border-b border-border1 bg-bg1 sticky top-0 z-40">
        <button onClick={() => setOpen(!open)} className="text-text1 text-xl" aria-label="Menü">☰</button>
        <div className="text-sm font-bold text-text1">Dienst<span className="text-accent">Leitstelle</span></div>
        <div className="w-7 h-7 rounded-full bg-[var(--accent-dim2)] text-accent flex items-center justify-center text-[10px] font-bold">
          {initials}
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky md:top-0 inset-y-0 left-0 z-50 w-60 bg-bg1 border-r border-border1
          flex flex-col h-screen transform transition-transform
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        <div className="p-4 border-b border-border1">
          <div className="text-base font-bold text-text1">Dienst<span className="text-accent">Leitstelle</span></div>
          <div className="text-[11px] text-text3 mt-1 truncate" title={firma}>{firma}</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((sec) => (
            <div key={sec} className="mb-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-text3 px-2 pt-3 pb-1">{sec}</div>
              {items
                .filter((i) => i.section === sec)
                .map((it) => {
                  const active = pathname === it.href || (it.href !== '/dashboard' && pathname?.startsWith(it.href));
                  return (
                    <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] mb-0.5 ${
                        active ? 'bg-[var(--accent-dim2)] text-accent font-semibold' : 'text-text2 hover:bg-bg3 hover:text-text1'
                      }`}>
                      <span className="w-4 text-center">{it.icon}</span>
                      <span>{it.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border1 p-2 space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-bg2 border border-border1">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-dim2)] text-accent flex items-center justify-center text-[10px] font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-text1 truncate">{vorname} {nachname}</div>
              <div className="text-[10px] text-text3 capitali