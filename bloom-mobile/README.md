# Bloom Mobile

Mobilní aplikace pro trans komunitu v ČR – React Native + Expo.

## Požadavky

- Node.js 18+
- npm nebo yarn
- **Expo Go** (pro rychlé testování) nebo **Development Build** (pro plnou funkčnost – mikrofon, galerie)
- Backend Bloom běžící na `http://localhost:8000`

## Instalace

```bash
cd bloom-mobile
npm install
```

## Spuštění

```bash
npm start
```

Poté:
- **Android emulator**: stiskněte `a` nebo `npm run android`
- **iOS simulator** (jen na Mac): stiskněte `i` nebo `npm run ios`
- **Fyzické zařízení**: naskenujte QR kód v aplikaci Expo Go, nebo zadejte URL v Expo Go (`exp://VAŠE_IP:8081`)

## Development Build (doporučeno)

Expo Go nepodporuje všechny nativní oprávnění (mikrofon, galerie). Pro plnou funkčnost vytvořte development build:

```bash
npx eas login          # přihlášení do Expo účtu
npm run build:dev:android
```

Po dokončení buildu stáhněte APK a nainstalujte na telefon. Poté spusťte `npm start` a v nainstalované Bloom aplikaci zadejte URL Metro bundleru.

Více viz [DEVELOPMENT_BUILD.md](./DEVELOPMENT_BUILD.md).

## Konfigurace API

Pro vývoj aplikace automaticky detekuje IP počítače (emulátor i fyzické zařízení).

**Důležité:** Backend musí na mobil přijímat připojení – spusťte ho s `--host 0.0.0.0`:

```bash
cd backend && python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Pro produkci vytvořte `.env`:

```
EXPO_PUBLIC_API_URL=https://api.bloom.cz
```

## Struktura

```
bloom-mobile/
├── src/
│   ├── config/api.ts         # API URL konfigurace
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── BiometricLockContext.tsx
│   ├── navigation/AppNavigator.tsx
│   └── screens/
│       ├── AuthScreen.tsx
│       ├── HomeScreen.tsx
│       ├── MessagesScreen.tsx
│       ├── ProfileScreen.tsx
│       └── ...
├── App.tsx
├── app.json
├── eas.json                  # EAS Build konfigurace
└── package.json
```

## Přihlášení

Uživatelé se přihlašují stejným účtem jako na webu bloom.cz – e-mail a heslo.
