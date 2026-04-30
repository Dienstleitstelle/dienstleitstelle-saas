import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const KARTEN = [
  {
    href: '/einstellungen/berufsgruppen',
    titel: 'Berufsgruppen & Regeln',
    beschreibung: 'Berufsgruppen anlegen und pro Gruppe Regeln definieren (Maximalstunden, Ruhezeit, Pause).',
    icon: '👔',
  },
  {
    href: '/einstellungen/berichts-vorlagen',
    titel: 'Berichts-Vorlagen',
    beschreibung: 'Eigene Formulare für Übergaben, Vorfälle, Wartung etc. — Felder frei wählbar.',
    icon: '📋',
  },
  {
    href: '/einladungen',
    titel: 'Team einladen',
    beschreibung: 'Neue Mitglieder per Magic-Link in dein Unternehmen einladen.',
    icon: '✉️',
  },
];

export default async function EinstellungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('rolle').eq('id', user.id).maybeSingle();
  if (!profile || profile.rolle !== 'admin') redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text1">Einstellungen</h1>
        <p className="text-text3 text-sm mt-1">Verwalte hier alles, was die ganze Firma betrifft.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {KARTEN.map((k) => (
          <Link key={k.href} href={k.href}
            className="group block rounded-xl border border-border1 bg-bg1 p-5 hover:border-accent transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl