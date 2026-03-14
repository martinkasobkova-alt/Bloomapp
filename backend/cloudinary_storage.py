"""
Cloudinary media storage. Uploads go to Cloudinary; legacy local paths still served by routes.
PUBLIC media: upload_media() - public URLs, for news/avatars.
RESTRICTED media: upload_media_restricted() - type=authenticated, no public URLs, use generate_signed_url().
"""
import io
import os
import logging
import uuid
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)

# Config from env
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "").strip()
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "").strip()

# Folder for restricted message media (Cloudinary type=authenticated)
FOLDER_RESTRICTED_MESSAGES = "bloom/private/messages"
# Folder for restricted gallery media (Cloudinary type=authenticated)
FOLDER_RESTRICTED_GALLERIES = "bloom/private/galleries"
# Default expiry for signed URLs (seconds)
SIGNED_URL_EXPIRY_SECONDS = 3600


def _is_configured() -> bool:
    return bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)


def _cloudinary_config():
    """Apply Cloudinary config. Call before any cloudinary API use."""
    import cloudinary
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_media_restricted(
    content: bytes,
    folder: str,
    resource_type: str,
    public_id_prefix: str = "",
) -> dict | None:
    """
    Upload bytes to Cloudinary as RESTRICTED (type=authenticated).
    No public URL is exposed; use generate_signed_url() for access.
    Returns dict with public_id, resource_type; or None if not configured.
    """
    if not _is_configured():
        logger.warning("Cloudinary not configured; restricted upload skipped")
        return None

    try:
        import cloudinary
        import cloudinary.uploader

        _cloudinary_config()

        file_obj = io.BytesIO(content)
        unique_id = str(uuid.uuid4())[:12]
        public_id = f"{public_id_prefix}{unique_id}" if public_id_prefix else unique_id

        result = cloudinary.uploader.upload(
            file_obj,
            resource_type=resource_type,
            folder=folder,
            public_id=public_id,
            type="authenticated",
        )

        return {
            "public_id": result.get("public_id", ""),
            "resource_type": result.get("resource_type", resource_type),
        }
    except Exception as e:
        logger.exception("Cloudinary restricted upload failed: %s", e)
        raise


def generate_signed_url(
    public_id: str,
    resource_type: str = "image",
    expires_seconds: int = SIGNED_URL_EXPIRY_SECONDS,
) -> str | None:
    """
    Generate a signed URL for restricted (authenticated) Cloudinary assets.
    URL is generated per-request; backend must authorize before calling.
    Returns the signed URL string, or None if not configured.
    """
    if not _is_configured():
        return None

    try:
        from cloudinary import utils as cloudinary_utils

        _cloudinary_config()

        url, _ = cloudinary_utils.cloudinary_url(
            public_id,
            type="authenticated",
            resource_type=resource_type,
            sign_url=True,
        )
        return url
    except Exception as e:
        logger.exception("Cloudinary signed URL generation failed: %s", e)
        raise


def upload_media(
    content: bytes,
    folder: str,
    resource_type: str,
    content_type: str = "",
    public_id_prefix: str = "",
) -> dict | None:
    """
    Upload bytes to Cloudinary. Returns dict with secure_url, public_id, or None if not configured.
    resource_type: "image", "video", or "raw"
    """
    if not _is_configured():
        logger.warning("Cloudinary not configured; upload skipped")
        return None

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )

        file_obj = io.BytesIO(content)
        unique_id = str(uuid.uuid4())[:12]
        public_id = f"{public_id_prefix}{unique_id}" if public_id_prefix else unique_id

        result = cloudinary.uploader.upload(
            file_obj,
            resource_type=resource_type,
            folder=folder,
            public_id=public_id,
        )

        return {
            "secure_url": result.get("secure_url", ""),
            "public_id": result.get("public_id", ""),
            "resource_type": result.get("resource_type", resource_type),
        }
    except Exception as e:
        logger.exception("Cloudinary upload failed: %s", e)
        raise


def delete_asset(public_id: str, resource_type: str = "image") -> bool:
    """Delete a Cloudinary asset by public_id. Returns True if deleted, False on error or not configured."""
    if not _is_configured():
        return False
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return True
    except Exception as e:
        logger.warning("Cloudinary delete failed for %s: %s", public_id, e)
        return False


def _is_cloudinary_url(url: str) -> bool:
    """Check if URL is from our Cloudinary cloud."""
    if not url or not url.startswith("http"):
        return False
    return CLOUDINARY_CLOUD_NAME and f"res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/" in url
