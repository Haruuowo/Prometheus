"""
One-Time Authorization Script for Prometheus Gmail Integration.
Run this script: python auth_gmail.py
It will open your default browser so you can log into Google and grant access.
"""
from backend.tools.gmail import get_gmail_service

if __name__ == "__main__":
    print("[Prometheus] Initiating Google Gmail Authorization...")
    service = get_gmail_service()
    if service:
        profile = service.users().getProfile(userId="me").execute()
        print(f"\n[Prometheus] SUCCESS! Connected to Gmail account: {profile.get('emailAddress')}")
        print("[Prometheus] token.json has been created and saved. Luna can now read your real emails!")
    else:
        print("\n[Prometheus] Authorization was not completed or credentials.json was missing.")

