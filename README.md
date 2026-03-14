# Bloom

## Přihlášení přes Facebook

Pro zapnutí přihlášení přes Facebook:

1. Vytvořte aplikaci na [Facebook for Developers](https://developers.facebook.com/apps/)
2. Přidejte produkt **Facebook Login** a nakonfigurujte:
   - **Valid OAuth Redirect URIs**: `http://localhost:3001/auth/facebook-callback` (pro vývoj) a produkční URL
3. Do **backend/.env** přidejte:
   ```
   FACEBOOK_APP_ID=vaše_app_id
   FACEBOOK_APP_SECRET=vaše_app_secret
   ```
4. Do **frontend/.env** přidejte:
   ```
   REACT_APP_FACEBOOK_APP_ID=vaše_app_id
   ```

Bez těchto proměnných se tlačítko Facebook přihlášení nezobrazí.

## Bezpečnost

- **JWT_SECRET**: V produkci nastavte v `backend/.env` silné náhodné heslo (např. `openssl rand -hex 32`).
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy.
- **HTML sanitizace**: Uživatelský obsah (zprávy, bio, nabídky, komentáře, otázky, recenze) je čištěn přes `bleach`.
