# Local preview server: python serve.py [port], then http://localhost:8000
# Same as `python -m http.server`, plus Cache-Control: no-store so an edited CSS or JS file shows on a plain reload,
# and POST /__handoff/update, which installs the latest kit release (the update button of the pages).
import importlib.util
import json
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# No __pycache__ inside handoff/: the folder is replaced as a whole on update.
sys.dont_write_bytecode = True
LOOPBACK = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path != "/__handoff/update":
            return self.send_error(404)
        # Only this machine, and only the page itself: the custom header makes a request from another site fail its CORS preflight.
        if self.client_address[0] not in LOOPBACK or self.headers.get("X-Handoff") != "update":
            return self.send_error(403)
        try:
            # Loaded from disk at each call: the updater is part of the kit and changes with it.
            spec = importlib.util.spec_from_file_location("handoff_update", ROOT / "handoff" / "update.py")
            updater = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(updater)
            body, status = {"version": updater.install()}, 200
        except Exception as e:
            body, status = {"error": str(e)}, 500
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


class DualStackServer(ThreadingHTTPServer):
    # Listen on IPv6 and IPv4 at once: browsers try localhost as ::1 first, and an IPv4-only server
    # makes every connection wait for that attempt to fail (about 300 ms each on Windows).
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = partial(NoCacheHandler, directory=str(ROOT))
print(f"Serving on http://localhost:{port}")
DualStackServer(("::", port), handler).serve_forever()
