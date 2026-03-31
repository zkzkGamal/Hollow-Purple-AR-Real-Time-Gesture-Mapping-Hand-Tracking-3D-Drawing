"""
Serves the hollow-purple app over HTTPS with a self-signed certificate.
Run once to generate cert.pem + key.pem, then use https://localhost:8443
The browser will show a security warning — click "Advanced → Proceed" once.
"""
import http.server, ssl, os, subprocess, sys

PORT = 8443
CERT = "cert.pem"
KEY  = "key.pem"

# ── Generate self-signed cert if missing ──────────────────────────────────────
if not (os.path.exists(CERT) and os.path.exists(KEY)):
    print("🔐 Generating self-signed TLS certificate...")
    result = subprocess.run([
        "openssl", "req", "-x509",
        "-newkey", "rsa:2048",
        "-keyout", KEY,
        "-out", CERT,
        "-days", "365",
        "-nodes",
        "-subj", "/CN=localhost",
    ], capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ openssl failed:", result.stderr)
        sys.exit(1)
    print("✅ Certificate generated.")

# ── HTTPS server ──────────────────────────────────────────────────────────────
os.chdir(os.path.dirname(os.path.abspath(__file__)))

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(CERT, KEY)

httpd = http.server.HTTPServer(("localhost", PORT), http.server.SimpleHTTPRequestHandler)
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

print(f"🌐 Serving at https://localhost:{PORT}")
print("⚠️  First visit: browser will warn 'Not secure' — click Advanced → Proceed to localhost")
httpd.serve_forever()
