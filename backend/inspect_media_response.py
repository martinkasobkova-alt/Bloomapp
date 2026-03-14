#!/usr/bin/env python3
"""
Inspect exact HTTP response from /api/media/messages/:filename for one .m4a file.
Run with: python inspect_media_response.py
Backend must be running on http://localhost:8000
"""
import os
import requests
import sys

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")
MEDIA_DIR = os.path.join(os.path.dirname(__file__), "media", "messages")

# Pick largest .m4a from media dir (avoid tiny/corrupt files)
m4a_files = [(f, os.path.getsize(os.path.join(MEDIA_DIR, f))) for f in os.listdir(MEDIA_DIR) if f.endswith(".m4a")]
if not m4a_files:
    print("No .m4a files in media/messages")
    sys.exit(1)
m4a_files.sort(key=lambda x: x[1], reverse=True)
filename = m4a_files[0][0]
filepath = os.path.join(MEDIA_DIR, filename)

print("=" * 60)
print("1. FILE ON DISK")
print("=" * 60)
print(f"File: {filename}")
print(f"Path: {filepath}")
print(f"Exists: {os.path.exists(filepath)}")
if os.path.exists(filepath):
    size = os.path.getsize(filepath)
    print(f"Size: {size} bytes")
    print(f"Size > 0: {size > 0}")
    # Check file magic / header
    with open(filepath, "rb") as f:
        header = f.read(12)
    print(f"First 12 bytes (hex): {header.hex()}")
    # m4a/mp4 starts with ftyp or similar
    if header[:4] == b"ftyp" or (len(header) >= 8 and header[4:8] == b"ftyp"):
        print("File header: looks like valid MP4/M4A (ftyp box)")
    elif header[:3] == b"ID3":
        print("File header: ID3 (MP3)")
    else:
        print("File header: unknown / may not be valid m4a")

print()
print("=" * 60)
print("2. GET TOKEN")
print("=" * 60)
import uuid
email = f"inspect_{uuid.uuid4().hex[:8]}@bloom.cz"
username = f"inspect_{uuid.uuid4().hex[:6]}"
reg = requests.post(f"{BASE_URL}/api/auth/register", json={
    "email": email,
    "password": "Testpass123!",
    "username": username,
    "secret_code": "Transfortrans",
})
if reg.status_code != 200:
    login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "test1@bloom.cz", "password": "test123"})
    if login.status_code != 200:
        print(f"Register failed: {reg.status_code} {reg.text}")
        print(f"Login fallback failed: {login.status_code} {login.text}")
        sys.exit(1)
    token = login.json().get("token")
    print("Using test1@bloom.cz token")
else:
    token = reg.json().get("token")
    print(f"Registered {email}, using token")
print(f"Token: {token[:20]}...")

print()
print("=" * 60)
print("3. GET (full response)")
print("=" * 60)
url = f"{BASE_URL}/api/media/messages/{filename}"
get_resp = requests.get(url, params={"token": token}, stream=True)
print(f"Status: {get_resp.status_code}")
print("Headers:")
for k, v in sorted(get_resp.headers.items()):
    print(f"  {k}: {v}")
body_len = len(get_resp.content)
print(f"Body length: {body_len} bytes")
if body_len > 0:
    print(f"Body first 16 bytes (hex): {get_resp.content[:16].hex()}")

print()
print("=" * 60)
print("4. HEAD")
print("=" * 60)
head_resp = requests.head(url, params={"token": token})
print(f"Status: {head_resp.status_code}")
print("Headers:")
for k, v in sorted(head_resp.headers.items()):
    print(f"  {k}: {v}")

print()
print("=" * 60)
print("5. RANGE REQUEST (bytes=0-99)")
print("=" * 60)
range_resp = requests.get(url, params={"token": token}, headers={"Range": "bytes=0-99"})
print(f"Status: {range_resp.status_code}")
print("Headers:")
for k, v in sorted(range_resp.headers.items()):
    print(f"  {k}: {v}")
print(f"Body length: {len(range_resp.content)} bytes")

print()
print("=" * 60)
print("6. COMPARISON: GET vs HEAD headers")
print("=" * 60)
get_h = set(get_resp.headers.keys())
head_h = set(head_resp.headers.keys())
only_get = get_h - head_h
only_head = head_h - get_h
common = get_h & head_h
diff = []
for k in common:
    if get_resp.headers[k] != head_resp.headers[k]:
        diff.append((k, get_resp.headers[k], head_resp.headers[k]))
if only_get:
    print(f"Only in GET: {only_get}")
if only_head:
    print(f"Only in HEAD: {only_head}")
if diff:
    print("Different values:")
    for k, g, h in diff:
        print(f"  {k}: GET={g!r} HEAD={h!r}")
if not only_get and not only_head and not diff:
    print("GET and HEAD headers are consistent")
