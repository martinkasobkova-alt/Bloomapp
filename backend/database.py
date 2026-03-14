from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os
import logging
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT – MUSÍ být nastaven JWT_SECRET v .env (app fails if missing)
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or not JWT_SECRET.strip():
    raise RuntimeError("JWT_SECRET must be set in .env – app cannot start without it")
JWT_SECRET = JWT_SECRET.strip()
JWT_ALGORITHM = "HS256"

# Resend email (strip removes trailing spaces/newlines from .env)
resend.api_key = (os.environ.get('RESEND_API_KEY') or '').strip()
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@budsva.eu')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

# Facebook OAuth (optional – leave empty to disable Facebook login)
FACEBOOK_APP_ID = os.environ.get('FACEBOOK_APP_ID', '')
FACEBOOK_APP_SECRET = os.environ.get('FACEBOOK_APP_SECRET', '')

# VAPID push keys
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
_vapid_key = os.environ.get('VAPID_PRIVATE_KEY_FILE', '')
VAPID_PRIVATE_KEY_FILE = str(ROOT_DIR / _vapid_key) if _vapid_key and not Path(_vapid_key).is_absolute() else _vapid_key
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'mailto:noreply@budsva.eu')

# Upload / media directories
UPLOAD_DIR = ROOT_DIR / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR = ROOT_DIR / "media" / "messages"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
NEWS_MEDIA_DIR = ROOT_DIR / "media" / "news"
NEWS_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.info(f"Resend configured: key={'set' if resend.api_key else 'MISSING'}, sender={SENDER_EMAIL}, frontend={FRONTEND_URL}")
logger.info(f"[Resend] sender email configured: {SENDER_EMAIL}")
