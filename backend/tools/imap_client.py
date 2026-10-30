import os
import imaplib
import email
from email.header import decode_header
from typing import Dict, Any, List

def clean_header(val: str) -> str:
    if not val:
        return ""
    decoded_parts = decode_header(val)
    out = []
    for part, enc in decoded_parts:
        if isinstance(part, bytes):
            try:
                out.append(part.decode(enc or "utf-8", errors="ignore"))
            except Exception:
                out.append(part.decode("latin-1", errors="ignore"))
        else:
            out.append(str(part))
    return "".join(out)

def get_imap_credentials():
    email_user = os.getenv("GMAIL_ADDRESS", "").strip()
    app_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
    return email_user, app_password

def is_imap_configured() -> bool:
    user, pwd = get_imap_credentials()
    return bool(user and pwd)

def fetch_messages_imap(max_results: int = 10) -> List[Dict[str, Any]]:
    user, pwd = get_imap_credentials()
    if not user or not pwd:
        return []

    messages = []
    try:
        # Standard SSL IMAP connection to Gmail
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        mail.login(user, pwd)
        mail.select("INBOX", readonly=True)

        status, search_data = mail.search(None, "ALL")
        if status != "OK" or not search_data[0]:
            mail.logout()
            return []

        msg_ids = search_data[0].split()
        latest_ids = msg_ids[-max_results:]
        latest_ids.reverse()

        for mid in latest_ids:
            res, data = mail.fetch(mid, "(RFC822.HEADER BODY.PEEK[TEXT])")
            if res != "OK":
                continue

            raw_email = None
            body_snippet = ""
            for response_part in data:
                if isinstance(response_part, tuple):
                    msg_obj = email.message_from_bytes(response_part[1])
                    subject = clean_header(msg_obj.get("Subject", "(No Subject)"))
                    from_hdr = clean_header(msg_obj.get("From", "Unknown"))
                    date_hdr = clean_header(msg_obj.get("Date", "Recent"))
                    
                    # Extract body text snippet
                    if msg_obj.is_multipart():
                        for part in msg_obj.walk():
                            ctype = part.get_content_type()
                            if ctype == "text/plain":
                                try:
                                    payload = part.get_payload(decode=True)
                                    if payload:
                                        body_snippet = payload.decode(errors="ignore")[:140].strip()
                                        break
                                except Exception:
                                    pass
                    else:
                        try:
                            payload = msg_obj.get_payload(decode=True)
                            if payload:
                                body_snippet = payload.decode(errors="ignore")[:140].strip()
                        except Exception:
                            pass

                    messages.append({
                        "id": f"imap_{mid.decode()}",
                        "from": from_hdr,
                        "subject": subject,
                        "snippet": body_snippet or subject,
                        "date": date_hdr,
                        "unread": True
                    })

        mail.logout()
    except Exception as e:
        print(f"[IMAP] Error reading Gmail: {e}")

    return messages
