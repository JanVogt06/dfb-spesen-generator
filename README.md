# DFB Spesen Generator

Erstellt Schiedsrichter-Spesenabrechnungen automatisch aus den eigenen
DFB.net-Ansetzungen. Einmal die DFB.net-Zugangsdaten hinterlegen, danach holt
die Anwendung jede Nacht die aktuellen Ansetzungen und legt für jedes Spiel eine
fertige Abrechnung als DOCX und PDF ab — inklusive Fahrtkosten, wenn die
Kilometer im Rechner eingetragen sind.

Self-hosted: ein Container, eine `docker-compose.yml`, ein `data`-Ordner.

## Schnellstart

### Auf einem Server, ohne Checkout

Der Quellcode wird nicht gebraucht — eine Datei und ein Ordner genügen.
`docker-compose.yml` in einem leeren Verzeichnis anlegen:

```yaml
services:
  spesen-generator:
    image: ghcr.io/janvogt06/dfb-spesen-generator:latest
    container_name: dfb-spesen-generator
    restart: unless-stopped
    ports:
      - "${SPESEN_PORT:-8001}:8001"
    environment:
      - TZ=Europe/Berlin
    volumes:
      # Secrets (.env), Datenbank (app.db) und generierte Dokumente (output/)
      - ./data:/data
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/api/health').read()"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Dann:

```bash
mkdir -p data
docker compose pull && docker compose up -d
```

Danach ist die Oberfläche unter http://localhost:8001 erreichbar, von anderen
Geräten im Netzwerk über die Adresse des Hosts, zum Beispiel
`http://192.168.1.20:8001`.

Statt `latest` lässt sich eine Version festnageln (`:1.2.0`), wenn Sie selbst
entscheiden möchten, wann aktualisiert wird. Die `docker-compose.yml` in diesem
Repository trägt zusätzlich `build: .` für die lokale Entwicklung; auf einer
Maschine ohne Quellcode ist dieser Schlüssel nutzlos und `--build` würde
fehlschlagen, dort also weglassen.

### Aus einem Checkout

```bash
docker compose up -d --build
```

### Port ändern

Ohne die Compose-Datei anzufassen:

```bash
SPESEN_PORT=9000 docker compose up -d
```

Soll die Oberfläche nur vom Host selbst erreichbar sein (etwa weil ein
Reverse-Proxy davor liegt), das Port-Mapping auf
`"127.0.0.1:${SPESEN_PORT:-8001}:8001"` ändern.

## Daten und Secrets

Alles Veränderliche liegt im Container unter `/data` und damit im Ordner `data`
neben der Compose-Datei — es übersteht Neustarts und Updates:

| Pfad | Inhalt |
| --- | --- |
| `data/.env` | `JWT_SECRET_KEY` und `ENCRYPTION_KEY` |
| `data/app.db` | Nutzer, Sessions, gespeicherte Fahrtkosten, Login- und Download-Log |
| `data/output/` | Ein Ordner pro Session mit DOCX, PDF und `metadata.json` |

Fehlt `data/.env` beim Start, erzeugt die Anwendung beide Schlüssel selbst und
schreibt sie dorthin. Eine vorhandene Datei wird nie verändert.

> **Diese beiden Schlüssel sichern.** Der `ENCRYPTION_KEY` entschlüsselt die in
> `app.db` gespeicherten DFB-Zugangsdaten, der `JWT_SECRET_KEY` hält bestehende
> Logins gültig. Gehen sie verloren, muss jeder Nutzer seine DFB-Zugangsdaten
> neu eintragen — die restlichen Daten bleiben erhalten.

Ein Backup ist damit ein Kopieren des Ordners:

```bash
docker compose stop
tar -czf spesen-backup-$(date +%F).tar.gz data
docker compose start
```

Einzelne Pfade lassen sich per Umgebungsvariable verlegen (`DATA_DIR`,
`ENV_FILE`, `DATABASE_PATH`, `OUTPUT_DIR`); nötig ist das im Normalfall nicht.

## Aktualisieren

```bash
docker compose pull && docker compose up -d
```

Der `data`-Ordner wird dabei nicht angefasst.

## Umstieg vom alten Setup

Früher lief die Anwendung aus einem Checkout mit `docker compose up -d --build`
und drei einzelnen Bind-Mounts (`./app.db`, `./.env`, `./output`). Die
vorhandenen Daten wandern einmalig in den `data`-Ordner:

```bash
cd /pfad/zum/alten/verzeichnis

# 1. Sicherung, bevor irgendetwas bewegt wird
tar -czf ~/spesen-backup-$(date +%F).tar.gz app.db .env output

# 2. Alten Container stoppen (das Image bleibt vorerst liegen)
docker compose down

# 3. Daten in den neuen Ordner verschieben
mkdir -p data
mv app.db .env output data/

# 4. Neue docker-compose.yml einsetzen (siehe oben), dann
docker compose pull && docker compose up -d
```

Sollte `data/app.db` einmal fehlen, während `app.db` noch daneben liegt, benutzt
die Anwendung weiterhin die alte Datei und schreibt eine Warnung ins Log — ein
halb migriertes Verzeichnis startet also nicht mit leerer Datenbank.

## Releases

Ein Tag, der mit `v` beginnt, baut ein Multi-Architektur-Image (`linux/amd64`
und `linux/arm64`), veröffentlicht es unter
`ghcr.io/janvogt06/dfb-spesen-generator` als `<version>`, `<major>.<minor>` und
`latest` und legt daraus ein GitHub-Release an:

```bash
git tag v1.2.0 && git push origin v1.2.0
```

Der Workflow lässt sich unter *Actions* auch ohne Tag starten (`workflow_dispatch`),
etwa um nur den Image-Bau zu prüfen; das Ergebnis landet dann als `edge` und ohne
Release. Der arm64-Teil wird auf dem Runner emuliert und dauert deutlich länger
als amd64 — bei einem Testlauf lohnt es, in der Eingabe `linux/amd64` zu setzen.

## Entwicklung

Backend und Frontend getrennt, ohne Docker:

```bash
pip install -r requirements.txt
playwright install chromium
python src/main.py                    # API auf :8001

cd frontend && npm install && npm run dev   # Oberfläche auf :5173
```

Ohne gesetzte Umgebungsvariablen liegt `DATA_DIR` auf `./data` im Projekt — die
lokale Entwicklung benutzt also dieselbe Struktur wie der Server. `data/` ist in
`.gitignore`, für die Vorlage der Secrets siehe [.env.example](.env.example).

Daten vom Server nach `./data` holen: [`sync_from_server.sh`](sync_from_server.sh).

Die DOCX→PDF-Konvertierung braucht LibreOffice; im Container ist
`libreoffice-writer` enthalten, lokal muss es installiert sein — ohne
LibreOffice entstehen nur die DOCX-Dateien.

## Layout

| Pfad | Zweck |
| --- | --- |
| `src/main.py` | Einstiegspunkt, Scraping- und Generierungs-Ablauf |
| `src/api/` | FastAPI-Endpunkte und Authentifizierung |
| `src/core/config.py` | Pfade und Secrets (`DATA_DIR` und Ableitungen) |
| `src/scraper/` | DFB.net-Scraper (Playwright) |
| `src/generator/` | DOCX-Erzeugung und Spesenberechnung |
| `src/scheduler/` | Nächtlicher Lauf um 3:00 (Europe/Berlin) |
| `src/db/database.py` | SQLite-Zugriff |
| `frontend/` | React-Oberfläche (Vite), wird ins Image gebaut |
| `Dockerfile` | Image mit Frontend-Build, Playwright und LibreOffice |
| `docker-compose.yml` | Service, Port, Volume und Health Check |
| `.github/workflows/release.yml` | Image-Bau und Release beim Tag-Push |

## Lizenz

MIT — siehe [LICENSE](LICENSE).
