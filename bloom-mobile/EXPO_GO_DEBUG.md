# Expo Go – co dělat když nic nefunguje

## 1. Spusť backend

V terminálu v `backend/`:
```bash
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` je důležité – backend musí naslouchat na všech rozhraních, ne jen localhost.

## 2. Zjisti IP adresu počítače

**Windows (PowerShell):**
```powershell
ipconfig | findstr "IPv4"
```

Hledej řádek typu `192.168.x.x` (ne 127.0.0.1).

## 3. Nastav API URL v mobilce

Vytvoř nebo uprav soubor `bloom-mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://TVOJE_IP:8000
```

Příklad: `EXPO_PUBLIC_API_URL=http://192.168.1.100:8000`

## 4. Spusť Expo

V terminálu v `bloom-mobile/`:
```bash
cd bloom-mobile
npx expo start --port 8083
```

Nebo použij `start-expo.bat`.

## 5. Otevři aplikaci v Expo Go

- Telefon a počítač musí být na **stejné Wi‑Fi**
- Naskenuj QR kód v Expo Go
- Nebo stiskni `a` pro Android emulátor

## 6. Kde vidět logy

### Metro terminál (nejjednodušší)
Všechny `console.log` se zobrazují přímo v terminálu, kde běží `npx expo start`.

### Na telefonu
- **Android:** zatřes telefonem → „Debug Remote JS“
- **iOS:** zatřes telefonem → „Debug Remote JS“

Pak se otevře Chrome DevTools s konzolí.

## 7. Co zkontrolovat v logách

Po otevření chatu s obrázky/audio hledej:

| Log | Co znamená |
|-----|------------|
| `[Bloom] API URL: http://192.168.x.x:8000` | Správná API adresa |
| `[Bloom] API URL: http://localhost:8000` | Špatně – na telefonu localhost = telefon sám |
| `getMediaUrl: NO TOKEN` | Chybí token – obrázky/audio nebudou fungovat |
| `[MessagesScreen] IMAGE onError` | Obrázek se nenačetl |
| `[AudioMessage] ERROR` | Audio selhalo |

## 8. Rychlá oprava – localhost

Pokud vidíš `API URL: http://localhost:8000` na telefonu:

1. Zjisti IP: `ipconfig | findstr "IPv4"`
2. Do `bloom-mobile/.env` přidej: `EXPO_PUBLIC_API_URL=http://TVOJE_IP:8000`
3. Restartuj Expo (Ctrl+C, pak znovu `npx expo start`)

## 9. Firewall

Windows Firewall může blokovat port 8000. Pokud nic nepomůže:
- Otevři „Windows Defender Firewall“ → „Povolit aplikaci“
- Povol Python/uvicorn pro privátní síť
