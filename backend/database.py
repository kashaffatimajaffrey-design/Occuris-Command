from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the same folder as this script
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print(
        "WARNING: Supabase credentials missing. Endpoints that need the "
        "datastore will return 503 until SUPABASE_URL and SUPABASE_KEY "
        "are set in backend/.env."
    )
    supabase = None
else:
    supabase: Client = create_client(url, key)
    print("Supabase connected")

def get_db():
    return supabase