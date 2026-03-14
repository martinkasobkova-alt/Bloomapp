#!/usr/bin/env python3
"""Generate VAPID keys for push notifications."""
from pathlib import Path

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

import base64

ROOT = Path(__file__).parent
PEM_FILE = ROOT / "vapid_private.pem"

# Generate EC P-256 key pair
key = ec.generate_private_key(ec.SECP256R1(), default_backend())

# Save private key to PEM file
with open(PEM_FILE, "wb") as f:
    f.write(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

# Get public key in uncompressed format (04 + x + y) for VAPID
pub = key.public_key()
pub_numbers = pub.public_numbers()
x = pub_numbers.x.to_bytes(32, "big")
y = pub_numbers.y.to_bytes(32, "big")
uncompressed = b"\x04" + x + y

# Base64url encode (no padding)
b64 = base64.urlsafe_b64encode(uncompressed).decode("ascii").rstrip("=")

print("Add these lines to backend/.env:")
print()
print(f"VAPID_PUBLIC_KEY={b64}")
print(f"VAPID_PRIVATE_KEY_FILE={PEM_FILE}")
print(f"VAPID_CLAIMS_EMAIL=mailto:noreply@bloom.cz")
print()
print(f"Private key saved to: {PEM_FILE}")
