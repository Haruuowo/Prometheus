import os
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer
import urllib.parse

# Load .env or .env.local if present
def load_env():
    for fname in ['.env.local', '.env']:
        fpath = os.path.join(os.path.dirname(__file__), fname)
        if os.path.exists(fpath):
            with open(fpath, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

# Import the Vercel serverless handler
from api.chat import handler as ApiHandler

class LocalDevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        public_dir = os.path.join(os.path.dirname(__file__), 'public')
        super().__init__(*args, directory=public_dir, **kwargs)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/chat':
            ApiHandler.do_POST(self)
        else:
            self.send_error(404, "Endpoint not found")

    def do_OPTIONS(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/chat':
            ApiHandler.do_OPTIONS(self)
        else:
            super().do_OPTIONS()

def run(port=3000):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, LocalDevHandler)
    print(f"Luna AI Local Server running at http://localhost:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    run(port)

