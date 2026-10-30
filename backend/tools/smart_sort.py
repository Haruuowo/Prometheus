import os
import shutil
from pathlib import Path
from typing import Dict, Any, List

FILE_CATEGORIES = {
    "Images": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"],
    "Documents": [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx", ".csv"],
    "Code": [".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".yaml", ".yml"],
    "Audio": [".mp3", ".wav", ".ogg", ".flac", ".m4a"],
    "Archives": [".zip", ".tar", ".gz", ".rar", ".7z"],
}

def smart_sort_directory(directory_path: str, dry_run: bool = True) -> Dict[str, Any]:
    """
    Scans a directory and organizes loose files into categorized folders
    (Images, Documents, Code, Audio, Archives, Other).
    """
    target = Path(directory_path).expanduser().resolve()
    if not target.exists() or not target.is_dir():
        return {
            "ok": False,
            "error": f"Directory does not exist: {directory_path}",
            "moved_count": 0,
            "actions": []
        }

    actions = []
    for item in target.iterdir():
        if item.is_file() and not item.name.startswith("."):
            ext = item.suffix.lower()
            category = "Other"
            for cat, extensions in FILE_CATEGORIES.items():
                if ext in extensions:
                    category = cat
                    break

            dest_folder = target / category
            dest_file = dest_folder / item.name

            actions.append({
                "file": item.name,
                "category": category,
                "destination": str(dest_file),
                "size_bytes": item.stat().st_size
            })

            if not dry_run:
                dest_folder.mkdir(parents=True, exist_ok=True)
                shutil.move(str(item), str(dest_file))

    return {
        "ok": True,
        "directory": str(target),
        "dry_run": dry_run,
        "files_found": len(actions),
        "actions": actions
    }

