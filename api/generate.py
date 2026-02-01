from http.server import BaseHTTPRequestHandler
import os
import json
import urllib.request
import urllib.error

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        try:
            # 1. Parse Environment Variables
            raw_tokens = os.environ.get('HF_TOKENS', '')
            tokens = [t.strip() for t in raw_tokens.split(',') if t.strip()]

            if not tokens:
                self.send_error_response(500, "Server Error: No API tokens configured.")
                return

            # 2. Parse Request Body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_response(400, "Missing request body.")
                return

            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode('utf-8'))
                prompt = body.get('inputs', '')
            except json.JSONDecodeError:
                self.send_error_response(400, "Invalid JSON.")
                return

            if not prompt:
                self.send_error_response(400, "Missing 'inputs' field.")
                return

            # 3. Request Loop (Try tokens sequentially)
            url = "https://api-inference.huggingface.co/models/gpt2"
            
            for i, token in enumerate(tokens):
                print(f"Attempting token #{i+1}")
                
                try:
                    # Prepare Request
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    }
                    payload = json.dumps({
                        "inputs": prompt,
                        "parameters": {"max_new_tokens": 60, "return_full_text": False}
                    }).encode('utf-8')

                    req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
                    
                    # Make Request (8 second timeout to prevent Vercel crash)
                    with urllib.request.urlopen(req, timeout=8) as response:
                        if response.status == 200:
                            response_body = response.read()
                            
                            # Success! Send back to frontend
                            self.send_response(200)
                            self.send_header('Content-type', 'application/json')
                            self.send_header('Access-Control-Allow-Origin', '*')
                            self.end_headers()
                            self.wfile.write(response_body)
                            return

                except urllib.error.HTTPError as e:
                    # If Rate Limited (429) or Busy (503), continue to next token
                    if e.code in [429, 503]:
                        print(f"Token #{i+1} busy ({e.code}). Switching...")
                        continue
                    print(f"Token #{i+1} failed: {e}")
                    continue
                
                except Exception as e:
                    print(f"Network error on token #{i+1}: {e}")
                    continue

            # If loop finishes, all tokens failed
            self.send_error_response(503, "All tokens exhausted or busy.")

        except Exception as e:
            print(f"CRITICAL ERROR: {e}")
            self.send_error_response(500, f"Internal Server Error: {str(e)}")

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode('utf-8'))
