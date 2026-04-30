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
  { section: 'Uebersicht', label: 'Dashboard',       href: '/dashboard',     icon: 'DA', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Dienstplan',      href: '/dienstplan',    icon: 'DP', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Schwarzes Brett', href: '/pinnwand',      icon: 'SB', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Abwesenheit',     href: '/abwesenheit',   icon: 'AB', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Aufgaben',        href: '/aufgaben',      icon: 'AU', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Berichte',        href: '/berichte',      icon: 'BR', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Zeiterfassung',   href: '/zeiterfassung', icon: 'ZE', rollen: ['admin','leitung','mitarbeiter'] },

  { section: 'Verwaltung', label: 'Mitarbeiter',     href: '/mitarbeiter',     icon: 'MA', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Objekte',         href: '/objekte',         icon: 'OB', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Vertretung',      href: '/vertretung',      icon: 'VT', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Statistiken',     href: '/statistiken',     icon: 'ST', rollen: ['admin','leitung'] },

  { section: 'Einstellungen', label: 'Uebersicht',          href: '/einstellungen',                       icon: 'EI', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Berufsgruppen',       href: '/einstellungen/berufsgruppen',         icon: 'BG', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Berichts-Vorlagen',   href: '/einstellungen/berichts-vorlagen',     icon: 'BV', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Team einladen',       href: '/einladungen',                         icon: 'TE', rollen: ['admin'] },
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
      <div className="md:hidden flex items-center justify-between px-4 h-12 border-b border-border1 bg-bg1 sticky top-0 z-40">
        <button onClick={() => setOpen(!open)} className="text-text1 text-xl" aria-label="Menue">=</button>
        <div className="text-sm font-bold text-text1">Dienst<span className="text-accent">Leitstelle</span></div>
        <div className="w-7 h-7 rounded-full bg-[var(--accent-dim2)] text-accent flex items-center justify-center text-[10px] font-bold">
          {initials}
        </div>
      </div>

      <aside
        className={`fixed md:sticky md:top-0 inset-y-0 left-0 z-50 w-60 bg-bg1 border-r border-border1 flex flex-col h-screen transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
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
                      <span className="w-6 text-center text-[10px] font-bold tracking-wide">{it.icon}</span>
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
              <div className="text-[10px] text-text3 capitalize">{rolle}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full text-[11px] py-1.5 rounded-md border border-border2 text-text3 hover:text-text1 hover:bg-bg3">
            Abmelden
          </button>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="md:hidden fixed inset-0 bg-black/50 z-40" />}
    </>
  );
}
