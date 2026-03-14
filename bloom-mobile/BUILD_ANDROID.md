# Android build – Bloom Mobile

## JAVA_HOME

Máte nainstalovaný Eclipse Adoptium JDK v:
```
C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot
```

Pro trvalé nastavení přidejte do **Systémové proměnné** (Windows):
1. Stiskněte Win + R, napište `sysdm.cpl`, Enter
2. Záložka **Upřesnit** → **Proměnné prostředí**
3. V části **Systémové proměnné** → **Nový**:
   - Název: `JAVA_HOME`
   - Hodnota: `C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot`
4. Upravte proměnnou **Path** → přidejte: `%JAVA_HOME%\bin`

## Rychlý build

Spusťte soubor `run-android.bat` – nastaví JAVA_HOME a spustí build.

## Chyba „Unable to delete directory“

Projekt je v **OneDrive**, který může zamykat soubory. Zkuste:

1. **Dočasně pozastavit OneDrive** – ikona OneDrive v hlavním panelu → Nastavení → Pozastavit synchronizaci (2 hodiny)
2. **Zavřít Cursor/VS Code** – editor může držet soubory otevřené
3. **Spustit build z nového terminálu** – mimo Cursor (Win + R → `cmd` → přejděte do složky bloom-mobile)
4. **Přesunout projekt mimo OneDrive** – např. do `C:\dev\bloomfinal` (nejspolehlivější řešení)

## Příkazy

```bash
cd bloom-mobile
npx expo prebuild --clean
npx expo run:android --port 8083
```
