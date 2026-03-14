"""
Central rate limit configuration for Bloom API.
Uses slowapi with client IP as key. Limits are easy to adjust here.
"""
import os
from fastapi import Request
from slowapi import Limiter


def _get_trusted_proxy_ips() -> set:
    """IPs from which we trust X-Forwarded-For / X-Real-IP. Comma-separated in TRUSTED_PROXY_IPS env."""
    val = (os.environ.get("TRUSTED_PROXY_IPS") or "").strip()
    if not val:
        return set()
    return {ip.strip() for ip in val.split(",") if ip.strip()}


def get_client_ip_for_limiter(request: Request) -> str:
    """Extract client IP for rate limiting. Only trusts X-Forwarded-For/X-Real-IP when request comes from a trusted proxy."""
    peer_ip = request.client.host if request.client else None
    trusted = _get_trusted_proxy_ips()
    if trusted and peer_ip and peer_ip in trusted:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    if peer_ip:
        return peer_ip
    host = (request.headers.get("Host") or "").split(":")[0].lower()
    if host in ("localhost", "127.0.0.1"):
        return "127.0.0.1"
    return "unknown"


limiter = Limiter(key_func=get_client_ip_for_limiter)

# ─── Limit strings (adjust here) ───────────────────────────────────────────
LIMIT_LOGIN = "5/minute"
LIMIT_REGISTER = "3/minute"
LIMIT_FORGOT_PASSWORD = "3/minute"
LIMIT_RESEND_VERIFICATION = "3/minute"
LIMIT_PUBLIC_POSTING = "10/minute"
LIMIT_UPLOADS = "10/minute"
