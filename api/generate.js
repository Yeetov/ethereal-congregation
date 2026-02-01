export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log("Function started... Method:", req.method); // DEBUG LOG

  // 1. Check for Fetch API (Crucial for Node versions < 18)
  if (!globalThis.fetch) {
    console.error("Fetch API missing. Node version might be too old.");
    return res.status(500).json({ error: "Server Configuration Error: Node.js 18+ required." });
  }

  try {
    // 2. Parse Environment Variables
    const rawTokens = process.env.HF_TOKENS || "";
    // Split by comma, trim whitespace, and remove empty strings
    const tokens = rawTokens.split(',').map(t => t.trim()).filter(Boolean);

    console.log(`Found ${tokens.length} tokens.`); // DEBUG LOG

    if (tokens.length === 0) {
      console.error("No tokens found in HF_TOKENS environment variable.");
      return res.status(500).json({ error: "Server Error: API tokens missing." });
    }

    // 3. Robust Body Parsing
    let promptText = "";
    
    // Check if body exists
    if (!req.body) {
      console.error("Request body is empty.");
      return res.status(400).json({ error: "Missing request body." });
    }

    try {
      // If Vercel parsed it as an object
      if (typeof req.body === 'object') {
        promptText = req.body.inputs;
      } 
      // If it came as a string
      else if (typeof req.body === 'string') {
        const parsed = JSON.parse(req.body);
        promptText = parsed.inputs;
      }
    } catch (parseError) {
      console.error("JSON Parsing failed:", parseError);
      return res.status(400).json({ error: "Invalid JSON format." });
    }

    if (!promptText) {
      return res.status(400).json({ error: "Missing 'inputs' field in JSON." });
    }

    // 4. Linear Token Loop with Timeout
    let lastError = null;
    
    // Create an AbortController to kill the request if it takes > 8 seconds
    // Vercel Free Tier has a 10s limit; we stop at 8s to return a graceful error.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      console.log(`Attempting with Token #${i + 1}...`);

      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/gpt2", 
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ 
              inputs: promptText, 
              parameters: { max_new_tokens: 60, return_full_text: false } 
            }),
            signal: controller.signal
          }
        );
        
        // Clear timeout if request succeeds
        clearTimeout(timeoutId);

        // If success, return immediately
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }

        // If rate limit (429) or overloaded (503), continue loop
        if (response.status === 429 || response.status === 503) {
          console.warn(`Token #${i + 1} busy (${response.status}). Trying next...`);
          lastError = `Token #${i + 1} rate limited.`;
          continue; 
        }

        // If other error (401 unauthorized, etc), log and continue
        const errText = await response.text();
        console.error(`Token #${i + 1} failed: ${errText}`);
        lastError = `Token #${i + 1} error: ${response.status}`;
        
      } catch (networkError) {
        if (networkError.name === 'AbortError') {
             console.error("HF Request Timed Out (8s limit)");
             return res.status(504).json({ error: "AI Generation timed out." });
        }
        console.error(`Network error with Token #${i + 1}:`, networkError);
        lastError = networkError.message;
      }
    }
    
    // Ensure timeout is cleared if loop finishes
    clearTimeout(timeoutId);

    // If loop finishes without returning, all tokens failed
    console.error("All tokens exhausted.");
    return res.status(503).json({ error: "All API tokens failed.", details: lastError });

  } catch (crashError) {
    console.error("CRITICAL FUNCTION CRASH:", crashError);
    return res.status(500).json({ error: "Internal Server Crash", details: crashError.message });
  }
}
