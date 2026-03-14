"""
Test vzájemného posílání zpráv mezi dvěma uživateli.
Spustit: python -m pytest tests/test_messages_mutual.py -v -s
Nebo: REACT_APP_BACKEND_URL=http://localhost:8000 python tests/test_messages_mutual.py
"""
import os
import sys
import uuid
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")


def login(email: str, password: str):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        raise RuntimeError(f"Login failed: {r.status_code} {r.text}")
    return r.json()["token"]


def register_user():
    email = f"TEST_msg_{uuid.uuid4().hex[:8]}@bloom.cz"
    username = f"TEST_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "Testpass123!",
        "username": username,
        "secret_code": "Transfortrans",
    })
    if r.status_code != 200:
        raise RuntimeError(f"Register failed: {r.status_code} {r.text}")
    data = r.json()
    return data["token"], data["user"]["id"], username


def send_message(token: str, to_user_id: str, content: str):
    r = requests.post(
        f"{BASE_URL}/api/messages",
        json={"to_user_id": to_user_id, "content": content},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    return r


def get_messages(token: str, other_user_id: str):
    r = requests.get(
        f"{BASE_URL}/api/messages/{other_user_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    return r


def get_conversations(token: str):
    r = requests.get(
        f"{BASE_URL}/api/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    return r


def run_test():
    print(f"Backend: {BASE_URL}")
    print("=" * 50)

    # 1. Zaregistruj dva uživatele
    print("1. Registrace uživatele A...")
    token_a, user_a_id, username_a = register_user()
    print(f"   A: {username_a} (id={user_a_id})")

    print("2. Registrace uživatele B...")
    token_b, user_b_id, username_b = register_user()
    print(f"   B: {username_b} (id={user_b_id})")

    # 2. A pošle zprávu B
    print("\n3. A posílá zprávu B: 'Ahoj od A'")
    r_send = send_message(token_a, user_b_id, "Ahoj od A")
    if r_send.status_code != 200:
        print(f"   CHYBA: {r_send.status_code}")
        try:
            j = r_send.json()
            print(f"   Detail: {j.get('detail', r_send.text)[:500]}")
        except Exception:
            print(f"   Body: {r_send.text[:800]}")
        return False
    print(f"   OK: zpráva odeslána, id={r_send.json().get('id')}")

    # 3. B načte zprávy – měl by vidět zprávu od A
    print("\n4. B načítá zprávy od A...")
    r_msgs_b = get_messages(token_b, user_a_id)
    if r_msgs_b.status_code != 200:
        print(f"   CHYBA: {r_msgs_b.status_code} {r_msgs_b.text}")
        return False
    msgs_b = r_msgs_b.json()
    found = any(m.get("content") == "Ahoj od A" and m.get("from_user_id") == user_a_id for m in msgs_b)
    if not found:
        print(f"   CHYBA: B nevidí zprávu od A. Zprávy: {msgs_b}")
        return False
    print(f"   OK: B vidí {len(msgs_b)} zpráv, obsahuje 'Ahoj od A'")

    # 4. B pošle odpověď A
    print("\n5. B posílá odpověď A: 'Ahoj od B'")
    r_reply = send_message(token_b, user_a_id, "Ahoj od B")
    if r_reply.status_code != 200:
        print(f"   CHYBA: {r_reply.status_code} {r_reply.text}")
        return False
    print(f"   OK: odpověď odeslána")

    # 5. A načte zprávy – měl by vidět obě zprávy
    print("\n6. A načítá zprávy od B...")
    r_msgs_a = get_messages(token_a, user_b_id)
    if r_msgs_a.status_code != 200:
        print(f"   CHYBA: {r_msgs_a.status_code} {r_msgs_a.text}")
        return False
    msgs_a = r_msgs_a.json()
    has_a_msg = any(m.get("content") == "Ahoj od A" for m in msgs_a)
    has_b_msg = any(m.get("content") == "Ahoj od B" and m.get("from_user_id") == user_b_id for m in msgs_a)
    if not (has_a_msg and has_b_msg):
        print(f"   CHYBA: A nevidí obě zprávy. Zprávy: {msgs_a}")
        return False
    print(f"   OK: A vidí {len(msgs_a)} zpráv (včetně obou výměn)")

    # 6. Oba vidí konverzaci v seznamu
    print("\n7. Kontrola konverzací...")
    r_conv_a = get_conversations(token_a)
    r_conv_b = get_conversations(token_b)
    if r_conv_a.status_code != 200 or r_conv_b.status_code != 200:
        print(f"   CHYBA: conversations A={r_conv_a.status_code} B={r_conv_b.status_code}")
        return False
    conv_a = r_conv_a.json()
    conv_b = r_conv_b.json()
    print(f"   A má {len(conv_a)} konverzací, B má {len(conv_b)} konverzací")
    if len(conv_a) < 1 or len(conv_b) < 1:
        print(f"   CHYBA: chybí konverzace")
        return False

    print("\n" + "=" * 50)
    print("VŠECHNY TESTY PROŠLY – vzájemné posílání zpráv funguje.")
    return True


if __name__ == "__main__":
    try:
        ok = run_test()
        sys.exit(0 if ok else 1)
    except Exception as e:
        print(f"\nVÝJIMKA: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
