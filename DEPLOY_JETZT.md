# 🚀 Letzte Schritte zum Live-Gehen

Du brauchst hier ca. 15 Minuten. Was ich schon erledigt habe ist alles links unter „✅ Erledigt", was du noch machen musst rechts unter „📋 Du jetzt".

## ✅ Bisher erledigt

- **Supabase-Projekt „Dienstleitstelle"** — komplett konfiguriert
  - URL: `https://aqytwulldpqoyorwpidb.supabase.co`
  - Region: West EU (Irland)
  - 19 Tabellen mit Mandantentrennung
  - Row-Level-Security auf allen Tabellen
  - Signup-Trigger + Tenant-RPC
- **GitHub-Repo erstellt**: `https://github.com/Dienstleitstelle/dienstleitstelle-saas`
- **Code lokal komplett**: 40 Dateien in `C:\Users\Neuer Benutzer\Desktop\Dienststelle\dienstleitstelle-saas\`
- **Personal Access Token** existiert, aber wir nutzen ihn nicht — Git ist einfacher

---

## 📋 Schritt 1 — Git for Windows installieren (3 Min)

Falls noch nicht installiert:

1. Geh auf **https://git-scm.com/download/win**
2. Lade den Installer → Standard-Setup, einfach „Next" durchklicken
3. PowerShell schließen und neu öffnen, damit `git` verfügbar ist

Test, dass Git da ist:
```powershell
git --version
```

---

## 📋 Schritt 2 — Code zu GitHub hochladen (2 Min)

PowerShell öffnen, dann **diese Befehle nacheinander** (Copy & Paste, jeweils Enter):

```powershell
cd "C:\Users\Neuer Benutzer\Desktop\Dienststelle\dienstleitstelle-saas"
git init
git config user.email "ferhat.demirak@gmx.de"
git config user.name "Ferhat Demirak"
git add .
git commit -m "Initial commit: DienstLeitstelle SaaS"
git branch -M main
git remote add origin https://github.com/Dienstleitstelle/dienstleitstelle-saas.git
git push -u origin main
```

Beim `git push` kommt ein Login-Fenster vom Browser („Sign in with your browser") → einmal bestätigen → fertig.

Kontrolle: Geh auf https://github.com/Dienstleitstelle/dienstleitstelle-saas — du siehst alle Dateien.

---

## 📋 Schritt 3 — Vercel mit dem Repo verbinden (5 Min)

1. Geh auf **https://vercel.com/new**
2. **„Import"** beim Repo `Dienstleitstelle/dienstleitstelle-saas` klicken
3. Framework wird automatisch als **Next.js** erkannt — alles auf Default lassen
4. **„Environment Variables"** ausklappen und drei Einträge anlegen:

| Name | Wert (siehe Schritt 4) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aqytwulldpqoyorwpidb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon Key — siehe unten) |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role Key — siehe unten) |

5. **„Deploy"** klicken — dauert ~2 Min

Du bekommst eine URL wie `https://dienstleitstelle-saas-xxx.vercel.app`.

---

## 📋 Schritt 4 — Supabase API-Keys holen

1. Geh auf **https://supabase.com/dashboard/project/aqytwulldpqoyorwpidb/settings/api-keys/legacy**
2. Du siehst zwei Keys:
   - **`anon` `public`** — kopier den Wert → das ist `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` `secret`** — auf „Reveal" klicken → kopier den Wert → das ist `SUPABASE_SERVICE_ROLE_KEY`

In Vercel beim Anlegen der Environment Variables einfügen.

---

## 📋 Schritt 5 — Supabase auf Live-URL umstellen (1 Min)

Nachdem Vercel dir die URL gegeben hat (z. B. `https://dienstleitstelle-saas-xxx.vercel.app`):

1. Auf **https://supabase.com/dashboard/project/aqytwulldpqoyorwpidb/auth/url-configuration**
2. **Site URL**: deine Vercel-URL eintragen
3. **Redirect URLs**: ergänze `https://dienstleitstelle-saas-xxx.vercel.app/**`
4. Speichern

---

## 📋 Schritt 6 — Erstanmeldung und Test

1. Geh auf deine Vercel-URL
2. **„Konto erstellen"** klicken
3. Vor- und Nachname + deine E-Mail (z. B. `ferhat.demirak@gmx.de`) → **„Konto erstellen"**
4. Magic-Link kommt per E-Mail (Supabase sendet von `noreply@mail.app.supabase.io`)
5. Link klicken → Firmenname eingeben (z. B. „Demirak Dienstleistungen") → Bundesland + Branche wählen → **„Loslegen"**
6. Du landest im Dashboard — du bist Admin deines neuen Tenants

Test:
- Lege einen Mitarbeiter an
- Lege ein Objekt an
- Plane eine Schicht im Dienstplan — die Regelpruefung sollte funktionieren
- Lade jemanden ein über „Team einladen"

---

## ⚠️ Wenn etwas hakt

**„git push" fragt nach Username/Passwort:** Statt deines Passworts gib den Personal Access Token ein, den ich vorher schon erstellt hatte. Falls verloren: neuen erstellen unter https://github.com/settings/personal-access-tokens

**Vercel-Deployment schlägt fehl:** Schau im Build-Log nach. 90 % der Fehler sind: Environment-Variable fehlt oder hat einen Tippfehler.

**Magic-Link kommt nicht:** Spam-Ordner checken. Sendung kann 1–2 Min brauchen.

**Du bekommst „User hat bereits einen Tenant":** Du hast dich schon eingeloggt vorher und hast schon einen Tenant. Logge dich ein und nutze den.

---

## Was als nächstes kommt (nach Live-Gehen)

In den nächsten Sessions baue ich, sobald alles läuft:
- Urlaubsanträge mit Genehmigungs-Workflow
- Zeiterfassung
- Berichte / Übergaben mit Lesebestätigung
- Schwarzes Brett
- Excel/PDF-Export
- Stripe-Abrechnung

Sag „weiter" sobald die Vercel-URL live ist und du dich angemeldet hast.
