# DienstLeitstelle SaaS

Mandantenfähige Cloud-Version der DienstLeitstelle. Ein Unternehmen meldet sich an, lädt Mitarbeiter ein, plant Schichten — alles in einer gemeinsamen Datenbank, jeder Tenant ist sauber von anderen getrennt.

## Tech-Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Supabase** (Postgres + Auth + Realtime) — EU-Hosting (Frankfurt)
- **Vercel** (Hosting Frontend + Edge Functions)
- **PWA** — am Handy installierbar wie eine App

## Erst-Einrichtung (einmalig, ca. 30 Minuten)

### 1. Supabase-Projekt anlegen

1. Auf https://supabase.com mit GitHub einloggen
2. „New Project" klicken
3. Name: `dienstleitstelle`, Region: **Frankfurt (eu-central-1)**, starkes Datenbankpasswort vergeben (gut wegspeichern!)
4. Warten bis das Projekt bereit ist (~2 Minuten)

### 2. Datenbankschema einspielen

1. Im Supabase-Dashboard links in den **SQL Editor**
2. Den Inhalt von `supabase/migrations/001_schema.sql` reinkopieren → **Run**
3. Den Inhalt von `supabase/migrations/002_rls.sql` reinkopieren → **Run**
4. (Optional) `supabase/migrations/003_demo_seed.sql` für Demo-Daten

### 3. API-Keys aus Supabase holen

Dashboard → Settings → API. Du brauchst:
- `Project URL` (sieht aus wie `https://xxxxx.supabase.co`)
- `anon` `public` Key (langer JWT-String)
- `service_role` Key (NUR für Admin-Operationen — geheim halten!)

### 4. E-Mail-Versand einrichten (für Einladungen)

Im Supabase-Dashboard → Authentication → Settings:
- **Site URL**: später deine Vercel-URL (erstmal `http://localhost:3000`)
- **Email Templates**: Magic Link & Invite anpassen (deutsch)
- Standard-Mailer reicht für den Start; später Resend/SendGrid einbinden

### 5. Vercel-Projekt anlegen & deployen

**Variante A — Direkt aus diesem Ordner:**
1. Auf https://vercel.com mit GitHub einloggen
2. Den Projektordner in ein GitHub-Repo schieben
3. In Vercel „New Project" → Repo auswählen → Framework: Next.js (wird auto-erkannt)
4. **Environment Variables** hinzufügen:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Project URL aus Schritt 3)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon Key aus Schritt 3)
   - `SUPABASE_SERVICE_ROLE_KEY` = (service_role Key aus Schritt 3)
5. Deploy → fertig in ~2 Minuten
6. Du bekommst eine URL wie `https://dienstleitstelle.vercel.app`

**Variante B — Lokal entwickeln:**
```bash
npm install
cp .env.example .env.local
# .env.local mit deinen Werten füllen
npm run dev
# → http://localhost:3000
```

### 6. Erste Anmeldung

1. Auf deine Vercel-URL gehen
2. „Konto erstellen" → E-Mail des ersten Admins
3. Magic Link aus der E-Mail anklicken
4. Firmenname eingeben → fertig
5. Dieser erste User wird automatisch **Admin** des neuen Tenants

## Rollen

| Rolle | Was sie kann |
|---|---|
| **Admin** | Stammdaten verwalten (Mitarbeiter, Objekte), andere Nutzer einladen, Abrechnung |
| **Leitung** | Schichten planen, Urlaubsanträge bearbeiten, Berichte einsehen |
| **Mitarbeiter** | Eigene Schichten ansehen, Urlaub beantragen, Schicht bestätigen, Übergaben lesen/schreiben |

## Mandantentrennung

Jede Tabelle hat eine `tenant_id`. Postgres Row-Level-Security (RLS) sorgt dafür, dass JEDER Query automatisch auf den Tenant des eingeloggten Users gefiltert wird. Auch wenn ein Bug im Frontend einen Tenant-Filter vergisst — die Datenbank lässt nichts durch. Das ist die saubere Multi-Tenant-Variante.

## PWA

Beim ersten Aufruf am Handy bietet der Browser an, die App zum Homescreen hinzuzufügen. Sieht und funktioniert dann wie eine echte App, ohne App Store, ohne Update-Pflicht.

## Was als Nächstes kommt

Diese erste Version enthält:
- ✅ Multi-Tenant Auth & Einladungen
- ✅ Mitarbeiter, Objekte, Dienstplan
- ✅ Regel-Engine (konfigurierbar)
- ✅ Mobile-fähige PWA

Später dazu (nach Bedarf priorisierbar):
- Urlaubsanträge & Abwesenheits-Verwaltung
- Zeiterfassung
- Berichte / Übergaben mit Lesebestätigung
- Schwarzes Brett
- Excel/PDF-Export
- Stripe-Abrechnung
- WhatsApp-Bridge

## Kosten

Bei den ersten ~20 Kunden:
- Supabase Free Tier: **0 €** (bis 500 MB DB, 50.000 monatliche Active Users)
- Vercel Hobby Tier: **0 €**
- Domain (optional): ~10 €/Jahr
- Total: praktisch **kostenlos** zum Starten

Bei wachsender Nutzung:
- Supabase Pro: 25 USD/Monat
- Vercel Pro: 20 USD/Monat (erst nötig bei kommerziellem Einsatz)
