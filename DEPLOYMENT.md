# Bloom – Průvodce deploymentem

Projekt má tři části: **backend** (FastAPI), **frontend** (React), **mobilní aplikace** (Expo). Níže jsou možnosti nasazení.

---

## Přehled komponent

| Komponenta | Technologie | Potřeby |
|------------|-------------|---------|
| Backend | FastAPI, Python | MongoDB, Resend, persistentní úložiště (avatary, media) |
| Frontend | React (craco) | Build → statické soubory |
| Mobil | Expo | EAS Build → APK/IPA |

---

## 1. Backend (API)

### Důležité proměnné prostředí

```
MONGO_URL=mongodb+srv://...
DB_NAME=bloom_prod
FRONTEND_URL=https://bloom.cz
CORS_ORIGINS=https://bloom.cz,https://www.bloom.cz

JWT_SECRET=<silné náhodné heslo, např. openssl rand -hex 32>
RESEND_API_KEY=re_...
SENDER_EMAIL=noreply@bloomapp.cz

TURNSTILE_SECRET_KEY=0x4AAAAAACqPw...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY_FILE=vapid_private.pem
VAPID_CLAIMS_EMAIL=mailto:noreply@bloom.cz
```

### Možnosti nasazení backendu

#### A) Railway (doporučeno – jednoduché)

1. Vytvoř účet na [railway.app](https://railway.app)
2. New Project → Deploy from GitHub (vyber repozitář)
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Přidej proměnné prostředí v Settings → Variables
7. **Persistentní úložiště**: Railway má Volumes – přidej volume pro `/app/uploads` a `/app/media`, nebo použij S3 (viz níže)

#### B) Render

1. [render.com](https://render.com) → New → Web Service
2. Repo, Root Directory: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. **Disk**: Render umožňuje přidat Persistent Disk – připoj na cestu `backend/uploads` a `backend/media` (nebo uprav cestu v kódu)

#### C) DigitalOcean App Platform

1. App Platform → Create App → GitHub
2. Backend jako Web Service, Root: `backend`
3. Run Command: `uvicorn server:app --host 0.0.0.0 --port 8080`
4. Pro media: použij Spaces (S3-kompatibilní) – vyžaduje úpravu kódu pro upload do S3

### Poznámka k úložišti souborů

Backend ukládá soubory lokálně do `uploads/avatars`, `media/messages`, `media/news`. Na platformách s ephemeral filesystem (Railway, Render bez disku) se soubory po restartu ztratí.

**Možnosti:**
- **Railway/Render s Volume** – připoj persistentní disk
- **S3 / Cloudflare R2** – úprava kódu pro upload do objektového úložiště (bude potřeba přidat boto3 a přepsat upload logiku)

---

## 2. Frontend (web)
### Build

```bash
cd frontend
# Vytvoř .env.production nebo nastav proměnné při buildu:
REACT_APP_BACKEND_URL=https://api.bloom.cz npm run build
```

Výstup: `frontend/build/`

### Možnosti nasazení

#### A) Vercel

1. [vercel.com](https://vercel.com) → Import Project
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `build`
5. Environment Variables:
   - `REACT_APP_BACKEND_URL` = `https://api.bloom.cz`
   - `REACT_APP_TURNSTILE_SITE_KEY` = `0x4AAAAAACqPwIiVuroDkW7C`
   - `REACT_APP_FACEBOOK_APP_ID` (volitelně)

#### B) Netlify

1. Netlify → Add new site → Import from Git
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/build`
5. Environment variables stejně jako u Vercelu

#### C) Cloudflare Pages

1. Pages → Create project → Connect Git
2. Build: `cd frontend && npm run build`
3. Output: `frontend/build`
4. Env vars v Settings

---

## 3. Mobilní aplikace (Expo)

### EAS Build (Expo Application Services)

1. Nainstaluj EAS CLI: `npm i -g eas-cli`
2. Přihlas se: `eas login`
3. Konfigurace v `bloom-mobile/eas.json` – uprav `production` env:

```json
"production": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.bloom.cz",
    "EXPO_PUBLIC_WEB_URL": "https://bloom.cz",
    "EXPO_PUBLIC_TURNSTILE_SITE_KEY": "0x4AAAAAACqPwIiVuroDkW7C"
  },
  "android": { "buildType": "app-bundle" },
  "ios": { "simulator": false }
}
```

4. Build:
   ```bash
   cd bloom-mobile
   eas build --platform android --profile production
   eas build --platform ios --profile production
   ```

5. Submit do obchodů:
   ```bash
   eas submit --platform android --latest
   eas submit --platform ios --latest
   ```

---

## 4. Kontrolní seznam před nasazením

### Backend
- [ ] `JWT_SECRET` – silné náhodné heslo
- [ ] `FRONTEND_URL` – produkční URL frontendu
- [ ] `CORS_ORIGINS` – obsahuje produkční URL
- [ ] MongoDB Atlas – IP whitelist (0.0.0.0/0 pro Railway/Render, nebo konkrétní IP)
- [ ] Resend – ověřená doména pro odesílání e-mailů
- [ ] Persistentní úložiště pro uploads/media

### Frontend
- [ ] `REACT_APP_BACKEND_URL` – URL API (např. `https://api.bloom.cz`)
- [ ] `REACT_APP_TURNSTILE_SITE_KEY`
- [ ] Facebook OAuth – Valid OAuth Redirect URIs obsahuje produkční URL

### Mobil
- [ ] `EXPO_PUBLIC_API_URL` – produkční API URL
- [ ] `EXPO_PUBLIC_WEB_URL` – pro Turnstile (URL webové aplikace)
- [ ] `EXPO_PUBLIC_TURNSTILE_SITE_KEY`

---

## 5. Příklad: rychlý deployment (Railway + Vercel)

1. **Backend na Railway**
   - Deploy z GitHubu, root `backend`
   - Přidej env vars (bez MONGO_URL, RESEND – ty už máš)
   - Získej URL např. `https://bloom-api-production.up.railway.app`

2. **Frontend na Vercel**
   - Import projektu, root `frontend`
   - `REACT_APP_BACKEND_URL` = Railway URL
   - Získej URL např. `https://bloom.vercel.app`

3. **Doména** (volitelně)
   - V Railway: Custom Domain → `api.bloom.cz`
   - Ve Vercelu: Custom Domain → `bloom.cz`
   - V DNS: A/CNAME záznamy podle návodu platformy

4. **Aktualizuj CORS a FRONTEND_URL**
   - V Railway env: `FRONTEND_URL=https://bloom.cz`, `CORS_ORIGINS=https://bloom.cz`
   - Restart služby

---

## Potřebuješ konkrétní platformu?

Napiš, kam chceš nasadit (např. Railway, Vercel, vlastní VPS), a připravím přesné kroky pro Bloom.
