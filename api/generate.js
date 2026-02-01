export default async function handler(req, res) {
  // 1. Get tokens from Environment Variables
  const rawTokens = process.env.HF_TOKENS || "";
  const tokens = rawTokens.split(',').map(t => t.trim()).filter(t => t);

  if (tokens.length === 0) {
    return res.status(500).json({ error: "No API tokens configured on server." });
  }

  // 2. Parse the prompt from the frontend
  const { inputs } = JSON.parse(req.body);

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
        const err = await response.text();
        throw new Error(err);
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
  return tryGenerate(0);
}
