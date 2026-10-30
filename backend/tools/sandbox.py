import sys
import subprocess
import time
from typing import Dict, Any

def execute_code_snippet(code: str, language: str = "python", timeout_sec: int = 5) -> Dict[str, Any]:
    """
    Executes a quick script in an isolated local subprocess sandbox.
    Currently supports Python scripts.
    """
    clean_code = code.strip()
    if not clean_code:
        return {"ok": False, "output": "No code provided", "duration_ms": 0}

    t0 = time.perf_counter()

    if language.lower() in ("python", "py"):
        try:
            # Run code safely in a separate python process with timeout
            proc = subprocess.run(
                [sys.executable, "-c", clean_code],
                capture_output=True,
                text=True,
                timeout=timeout_sec
            )
            duration_ms = max(1, int((time.perf_counter() - t0) * 1000))
            output = proc.stdout
            if proc.stderr:
                output += ("\n[STDERR]\n" + proc.stderr if output else proc.stderr)
            if not output.strip():
                output = "(Process executed with code 0 - no standard output)"

            return {
                "ok": proc.returncode == 0,
                "output": output.strip(),
                "duration_ms": duration_ms,
                "exit_code": proc.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "ok": False,
                "output": f"Execution timed out after {timeout_sec}s",
                "duration_ms": timeout_sec * 1000,
                "exit_code": -1
            }
        except Exception as e:
            return {
                "ok": False,
                "output": f"Execution error: {str(e)}",
                "duration_ms": max(1, int((time.perf_counter() - t0) * 1000)),
                "exit_code": 1
            }

    return {"ok": False, "output": f"Language '{language}' not supported in sandbox yet.", "duration_ms": 0}

