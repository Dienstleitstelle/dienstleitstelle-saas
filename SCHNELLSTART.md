# 🚀 Schnellstart — In 30 Minuten online

Folge diesen Schritten in der Reihenfolge. Wenn etwas hakt, melde dich, dann gehen wir es zusammen durch.

---

## Schritt 1 — Supabase einrichten (10 Min)

1. Geh auf https://supabase.com → **Start your project** → mit GitHub einloggen
2. Klick **New project**
   - Name: `dienstleitstelle`
   - Datenbank-Passwort: ein starkes, das du dir gut merkst
   - Region: **Frankfurt (eu-central-1)** ⚠️ wichtig wegen DSGVO
3. Warte ~2 Minuten, bis das Projekt bereit ist
4. Im linken Menü auf **SQL Editor** → **New Query**
5. Öffne `supabase/migrations/001_schema.sql`, kopier den ganzen Inhalt rein → unten rechts **Run**
6. Wieder New Query → `002_rls.sql` kopieren → **Run**
7. Wieder New Query → `003_signup_trigger.sql` kopieren → **Run**

✅ Datenbank steht.

8. Im linken Menü → **Project Settings** (Zahnrad) → **API**
9. Notiere:
   - **Project URL** (ganz oben)
   - **Project API keys → anon public**
   - **Project API keys → service_role** (auf "Reveal" klicken)

10. Im linken Menü → **Authentication** → **URL Configuration**
    - **Site URL**: erstmal `http://localhost:3000` (später deine Vercel-URL eintragen)
    - **Redirect URLs**: füge hinzu: `http://localhost:3000/**` und später deine Vercel-URL mit `/**`

11. (Optional, aber empfohlen) **Authentication** → **Email Templates** → die deutschen Texte anpassen

---

## Schritt 2 — Code lokal testen (10 Min)

1. **Node.js installieren**, falls noch nicht da: https://nodejs.org → LTS-Version
2. Terminal öffnen, in den Ordner wechseln:
   ```
   cd "C:\Users\Neuer Benutzer\Desktop\Dienststelle\dienstleitstelle-saas"
   ```
3. Pakete installieren:
   ```
   npm install
   ```
4. `.env.example` zu `.env.local` kopieren und mit deinen Werten aus Schritt 1.9 füllen
5. Dev-Server starten:
   ```
   npm run dev
   ```
6. Im Browser: http://localhost:3000
7. Klick **Unternehmen anlegen** → E-Mail rein → Postfach checken → Magic-Link klicken → Firmenname → fertig

✅ Lokal läuft alles.

---

## Schritt 3 — Auf Vercel veröffentlichen (10 Min)

### 3a — Code zu GitHub

1. Auf https://github.com → mit Account einloggen → **+ → New repository**
   - Name: `dienstleitstelle`
   - Sichtbarkeit: **Private**
   - Erstellen
2. Im Terminal:
   ```
   cd "C:\Users\Neuer Benutzer\Desktop\Dienststelle\dienstleitstelle-saas"
   git init
   git add .
   git commit -m "Erstes Setup"
   git branch -M main
   git remote add origin https://github.com/<DEIN-NAME>/dienstleitstelle.git
   git push -u origin main
   ```

### 3b — Vercel verbinden

1. Auf https://vercel.com → **Sign Up with GitHub**
2. **Add New → Project** → das `dienstleitstelle`-Repo auswählen → **Import**
3. Framework: Next.js (wird automatisch erkannt)
4. **Environment Variables** ausklappen — füge hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon Key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (service_role Key)
   - `NEXT_PUBLIC_APP_URL` = `https://dienstleitstelle.vercel.app` (oder wie deine Subdomain heißt)
5. **Deploy** → 1–2 Minuten warten

### 3c — Supabase auf Vercel-URL umstellen

1. Zurück bei Supabase → **Authentication** → **URL Configuration**
2. **Site URL** ändern auf deine Vercel-URL, z. B. `https://dienstleitstelle.vercel.app`
3. **Redirect URLs**: ergänze `https://dienstleitstelle.vercel.app/**`

✅ Du bist live.

---

## Was du jetzt hast

- **Login & Signup** mit Magic Link (kein Passwort nötig)
- **Mandantentrennung**: jedes Unternehmen sieht nur seine Daten
- **Drei Rollen**: Admin, Leitung, Mitarbeiter
- **Mitarbeiter anlegen, Objekte anlegen, Dienstplan mit Regel-Live-Pruefung**
- **Team-Einladungen** mit eindeutigen Tokens
- **Mobile-fähig** (am Handy als App installierbar)

## Was als Nächstes kommt

Diese Version deckt das Fundament ab. Sobald sie steht, baue ich (in weiteren Sessions) die restlichen Features aus dem Original drauf:
- Urlaubsanträge & Genehmigungs-Workflow
- Zeiterfassung
- Berichte / Übergaben mit Lesebestätigung
- Schwarzes Brett
- Excel-/PDF-Export
- Stripe-Abrechnung
- Dunkler/heller Modus-Toggle

## Hilfe?

Wenn beim Setup etwas hakt:
1. Screenshot vom Fehler
2. Ich gehe es mit dir Schritt für Schritt durch

Viel Erfolg!
