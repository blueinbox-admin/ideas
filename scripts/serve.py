#!/usr/bin/env python3
"""Local dev server for the Active Memory prototypes.

These are file-based HTML/CSS/JS prototypes you iterate on constantly, so the
server sends no-cache headers — every reload pulls fresh files, no stale JS/CSS.
Serves the repo root, so all prototypes and shared/ resolve.

Usage:
    python3 scripts/serve.py [port]      # default port 8731
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8731
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, *args):  # keep the console quiet
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    base = f"http://localhost:{PORT}"
    print(f"Active Memory prototypes  →  {base}/  (no-cache, Ctrl-C to stop)")
    print(f"  Launcher    {base}/")
    print(f"  WordPress   {base}/activememory-wordpress/")
    print(f"  QuickBooks  {base}/activememory-quickbooks/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
