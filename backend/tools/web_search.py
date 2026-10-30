import urllib.request
import urllib.parse
import json
import re
from typing import Dict, Any, List

def search_web(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    """
    Fast, reliable web search using DuckDuckGo Instant Answers API + HTML scrape fallback.
    Returns list of dicts with title, snippet, and url.
    """
    clean_q = query.strip()
    if not clean_q:
        return []

    results = []
    
    # 1. Try DuckDuckGo Instant Answer API
    try:
        url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(clean_q)}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Prometheus/2.0 (Odysseus AI; Personal Assistant)"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
            if data.get("AbstractText"):
                results.append({
                    "title": data.get("Heading") or clean_q,
                    "snippet": data.get("AbstractText"),
                    "url": data.get("AbstractURL") or "https://duckduckgo.com/?q=" + urllib.parse.quote(clean_q),
                    "source": data.get("AbstractSource") or "Instant Answer"
                })

            for topic in data.get("RelatedTopics", [])[:max_results]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("Text").split(" - ")[0] if " - " in topic.get("Text") else topic.get("Text")[:50],
                        "snippet": topic.get("Text"),
                        "url": topic.get("FirstURL") or ("https://duckduckgo.com/?q=" + urllib.parse.quote(clean_q)),
                        "source": "Web"
                    })
    except Exception as e:
        print(f"[WebSearch] DDG API note: {e}")

    # 2. Try DuckDuckGo Lite HTML Search if API returned fewer than 2 results
    if len(results) < 2:
        try:
            lite_url = f"https://lite.duckduckgo.com/lite/?q={urllib.parse.quote(clean_q)}"
            req = urllib.request.Request(
                lite_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
                
                # Match result links and snippets from DDG Lite
                matches = re.findall(
                    r'<a class="result-link" href="([^"]+)">(.*?)</a>.*?<td class="result-snippet">(.*?)</td>',
                    html,
                    re.DOTALL
                )
                for href, t_raw, s_raw in matches[:max_results]:
                    title = re.sub(r'<[^>]+>', '', t_raw).strip()
                    snippet = re.sub(r'<[^>]+>', '', s_raw).strip()
                    if title and snippet:
                        results.append({
                            "title": title,
                            "snippet": snippet,
                            "url": href,
                            "source": "Web"
                        })
        except Exception as e:
            print(f"[WebSearch] Lite scrape note: {e}")

    # Fallback placeholder if offline/blocked
    if not results:
        results.append({
            "title": f"Web Search: {clean_q}",
            "snippet": f"Web search executed for '{clean_q}'. Check real-time browser for live details.",
            "url": f"https://duckduckgo.com/?q={urllib.parse.quote(clean_q)}",
            "source": "DuckDuckGo"
        })

    return results[:max_results]
