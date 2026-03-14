# Development Build – Bloom Mobile

## Co je nastaveno

### 1. EAS Build (`eas.json`)
- **development** – dev build s expo-dev-client, APK pro přímou instalaci
- **preview** – interní preview build
- **production** – produkční build (AAB pro Play Store)

### 2. Oprávnění (`app.json`)

**Android:**
- `RECORD_AUDIO` – mikrofon pro hlasové zprávy
- `READ_MEDIA_IMAGES` – galerie (Android 13+)
- `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` – galerie (starší Android)
- `CAMERA` – kamera
- `USE_BIOMETRIC`, `USE_FINGERPRINT` – biometrie

**iOS:**
- `NSMicrophoneUsageDescription` – mikrofon
- `NSPhotoLibraryUsageDescription` – galerie
- `NSCameraUsageDescription` – kamera
- `NSFaceIDUsageDescription` – Face ID

### 3. Pluginy
- `expo-image-picker` – správná konfigurace oprávnění pro galerii a kameru

---

## Jak vytvořit development build

### Krok 1: Přihlášení do Expo
```bash
cd bloom-mobile
npx eas login
```
(Zadejte e‑mail a heslo Expo účtu. Účet lze vytvořit na https://expo.dev/signup)

### Krok 2: Spuštění buildu
```bash
# Android (APK – instalace přímo na telefon)
npm run build:dev:android

# nebo přímo:
npx eas build --profile development --platform android
```

### Krok 3: Stažení a instalace
1. Po dokončení buildu (cca 10–20 min) získáte odkaz na stažení APK
2. Otevřete odkaz na telefonu nebo stáhněte APK na PC a přeneste na telefon
3. Nainstalujte APK (na Androidu povolte instalaci z neznámých zdrojů)

### Krok 4: Spuštění s Metro bundlerem
```bash
# Spusťte Metro
npx expo start

# Na telefonu otevřete nainstalovanou Bloom aplikaci
# Zadejte URL: exp://VAŠE_IP:8081
# (např. exp://192.168.0.191:8081)
```

---

## Poznámky

- **Backend:** Před testováním spusťte backend na `http://localhost:8000`
- **API URL:** V `.env` je `EXPO_PUBLIC_API_URL` – pro fyzický telefon použijte IP počítače (např. `http://192.168.0.191:8000`)
- **Bundle ID:** `com.bloom.mobile` (změněno z `com.anonymous.bloommobile`)
