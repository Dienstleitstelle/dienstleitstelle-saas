'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Rolle = 'admin' | 'leitung' | 'mitarbeiter';

interface NavItem {
  section: string;
  label: string;
  href: string;
  icon: string;
  rollen: Rolle[];
}

const NAV: NavItem[] = [
  { section: 'Uebersicht', label: 'Dashboard',       href: '/dashboard',     icon: 'DA', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Dienstplan',      href: '/dienstplan',    icon: 'DP', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Schwarzes Brett', href: '/pinnwand',      icon: 'SB', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Abwesenheit',     href: '/abwesenheit',   icon: 'AB', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Aufgaben',        href: '/aufgaben',      icon: 'AU', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Berichte',        href: '/berichte',      icon: 'BR', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Uebersicht', label: 'Zeiterfassung',   href: '/zeiterfassung', icon: 'ZE', rollen: ['admin','leitung','mitarbeiter'] },
  { section: 'Verwaltung', label: 'Mitarbeiter',     href: '/mitarbeiter',   icon: 'MA', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Objekte',         href: '/objekte',       icon: 'OB', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Vertretung',      href: '/vertretung',    icon: 'VT', rollen: ['admin','leitung'] },
  { section: 'Verwaltung', label: 'Statistiken',     href: '/statistiken',   icon: 'ST', rollen: ['admin','leitung'] },
  { section: 'Einstellungen', label: 'Uebersicht',          href: '/einstellungen',                       icon: 'EI', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Berufsgruppen',       href: '/einstellungen/berufsgruppen',         icon: 'BG', rollen: ['admin'] },
  { section: 'Einstellungen', label: 'Berichts-Vorlagen',   href: '/einstellungen/berichts-vorlagen',     icon: 'BV', rollen: ['admin'] },
  { section: 'Konto',        label: 'Mein Profil',          href: '/profil',                              icon: 'PR', rollen: ['admin','leitung','mitarbeiter'] },
];

export function Sidebar({ rolle }: { rolle: Rolle }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const items = NAV.filter(n => n.rollen.includes(rolle));
  const sections = Array.from(new Set(items.map(i => i.section)));

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-bg1 border border-border1 text-text1 text-xs">
        Menue
      </button>

      {open && <div className="md:hidden fixed inset-0 z-20 bg-black/50" onClick={() => setOpen(false)} />}

      <aside className={`fixed md:sticky top-0 left-0 h-screen w-60 bg-bg1 border-r border-border1 overflow-y-auto z-30 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-4 border-b border-border1">
          <Link href="/dashboard" className="text-base font-bold text-text1">
            Dienst<span className="text-accent">Leitstelle</span>
          </Link>
        </div>

        <nav className="p-2 space-y-3">
          {sections.map(section => (
            <div key={section}>
              <div className="text-[10px] uppercase tracking-wide text-text3 px-2 mb-1">{section}</div>
              <div className="space-y-0.5">
                {items.filter(i => i.section === section).map(item => {
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${active ? 'bg-[var(--accent-dim2)] text-accent' : 'text-text2 hover:bg-bg2 hover:text-text1'}`}>
                      <span className="text-[10px] font-mono w-6 text-center text-text3">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
