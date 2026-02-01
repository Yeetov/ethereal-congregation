export default async function handler(req, res) {
  try {
    // 1. Get tokens from Environment Variables
    const rawTokens = process.env.HF_TOKENS || "";
    const tokens = rawTokens.split(',').map(t => t.trim()).filter(t => t);

    // If no tokens are set, strictly return 500 but don't crash the function
    if (tokens.length === 0) {
      console.error("HF_TOKENS not set in Vercel Environment Variables");
      return res.status(500).json({ error: "Server Configuration Error: No API tokens found." });
    }

    // 2. Robust Body Parsing (The Fix)
    // Vercel parses JSON automatically. We check if it's already an object.
    let inputs;
    try {
      if (typeof req.body === 'object') {
        inputs = req.body.inputs;
      } else if (typeof req.body === 'string') {
        const parsed = JSON.parse(req.body);
        inputs = parsed.inputs;
      } else {
        // Fallback if body is missing
        return res.status(400).json({ error: "Missing request body" });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    // 3. Recursive function to try tokens until one works
    async function tryGenerate(index) {
      if (index >= tokens.length) {
        return res.status(503).json({ error: "All tokens exhausted or busy." });
      }

      const currentToken = tokens[index];
      
      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/gpt2", 
          {
            headers: { 
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ 
              inputs: inputs, 
              parameters: { max_new_tokens: 60, return_full_text: false } 
            }),
          }
        );

        // If rate limited (429) or model loading (503), try next token
        if (response.status === 429 || response.status === 503) {
          console.warn(`Token ${index} failed (${response.status}). Switching...`);
          return tryGenerate(index + 1);
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`HuggingFace Error (${response.status}):`, errText);
          throw new Error(`HF Error: ${response.status}`);
        }

        const result = await response.json();
        return res.status(200).json(result);

      } catch (error) {
        console.error(`Error with token ${index}:`, error);
        // On network error, also try next token
        return tryGenerate(index + 1);
      }
    }

    // Start with the first token
    return await tryGenerate(0);

  } catch (globalError) {
    // Catch-all to prevent FUNCTION_INVOCATION_FAILED
    console.error("Global API Crash:", globalError);
    return res.status(500).json({ error: "Internal Server Error", details: globalError.message });
  }
}
