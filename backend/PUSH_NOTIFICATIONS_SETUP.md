# Push notifikace – nastavení a kontrola

## Shrnutí kontroly

### Co funguje (kód je připraven)
- **Backend API**: Endpointy `/api/push/vapid-key`, `/api/push/subscribe`, `/api/push/subscribe` (DELETE)
- **Frontend**: Hook `usePushNotifications`, banner v Layout.js, service worker `sw-push.js`
- **Odesílání**: `send_push_notification` při nové zprávě (DM), `send_broadcast_push_notification` při nové nabídce/službě a při novinkách od admina
- **Preference**: Respektují se `notification_prefs` (messages, services, news) v profilu uživatele

### Co je potřeba nastavit

#### 1. VAPID klíče (povinné)
Bez VAPID klíčů push notifikace **nebudou fungovat**. Backend vrací prázdný `public_key` a `send_push_notification` se okamžitě ukončí.

Přidejte do `backend/.env`:

```
VAPID_PUBLIC_KEY=<base64url veřejný klíč>
VAPID_PRIVATE_KEY_FILE=<cesta k souboru s privátním klíčem PEM>
VAPID_CLAIMS_EMAIL=mailto:noreply@bloom.cz
```

**Generování klíčů** – použijte jeden z těchto způsobů:

1. **Web**: https://vapidkeys.com – vygeneruje pár klíčů. Privátní klíč uložte do souboru `vapid_private.pem` (formát PEM).

2. **OpenSSL**:
```bash
openssl ecparam -name prime256v1 -genkey -noout -out vapid_private.pem
```
   Pak získejte veřejný klíč v base64url (pywebpush to očekává). Pro rychlý test můžete použít web vapidkeys.com.

3. **Skript** `backend/scripts/generate_vapid.py` (pokud existuje) nebo:
```bash
pip install py-vapid
python -m vapid --gen
```

#### 2. HTTPS v produkci
Push notifikace vyžadují **HTTPS** (nebo localhost pro vývoj). Service Worker a Push API nefungují přes HTTP kromě localhostu.

#### 3. Service worker
Soubor `frontend/public/sw-push.js` je správně nastaven a při buildu frontendu se nasadí na `/sw-push.js`. Slouží ho **frontend** (React dev server nebo statický hosting), ne backend.

## Tok fungování

1. Uživatel se přihlásí na web → zobrazí se banner „Chcete dostávat upozornění?“
2. Klik na „Povolit“ → `subscribe()` v usePushNotifications:
   - Požádá o oprávnění k notifikacím
   - Zaregistruje service worker `/sw-push.js`
   - Získá VAPID klíč z backendu
   - Vytvoří push subscription
   - Odešle subscription na backend (POST /api/push/subscribe)
3. Při nové zprávě / nabídce / novince → backend volá `send_push_notification` nebo `send_broadcast_push_notification`
4. Backend odešle push přes pywebpush na endpointy uložené v `push_subscriptions`
5. Service worker přijme push event a zobrazí notifikaci

## Rychlý test

1. Nastavte VAPID klíče v `.env`
2. Spusťte backend a frontend
3. Přihlaste se na web
4. Klikněte „Povolit“ v push banneru
5. Otevřete jinou záložku nebo minimalizujte prohlížeč
6. Pošlete si zprávu z jiného účtu (nebo vytvořte nabídku) → měla by přijít push notifikace
