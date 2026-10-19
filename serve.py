# Local preview server: python serve.py [port], then http://localhost:8000
# Same as `python -m http.server`, plus Cache-Control: no-store so an edited CSS or JS file shows on a plain reload.
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class DualStackServer(ThreadingHTTPServer):
    # Listen on IPv6 and IPv4 at once: browsers try localhost as ::1 first, and an IPv4-only server
    # makes every connection wait for that attempt to fail (about 300 ms each on Windows).
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = partial(NoCacheHandler, directory=str(Path(__file__).parent))
print(f"Serving on http://localhost:{port}")
DualStackServer(("::", port), handler).serve_forever()
