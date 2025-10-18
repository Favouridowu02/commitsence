async function generate({ prompt, model = 'gpt2', maxTokens = 100 }) {
  if (!process.env.HF_API_KEY) {
    throw new Error('HF_API_KEY is not set');
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Invalid prompt');
  }

  if (typeof maxTokens !== 'number' || !Number.isFinite(maxTokens)) {
    maxTokens = 100;
  }
  maxTokens = Math.max(16, Math.min(400, Math.floor(maxTokens)));

  const url = `https://api-inference.huggingface.co/models/${model}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: maxTokens } }),
      signal: controller.signal
    })
    .finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hugging Face API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Many HF models return an array with generated_text; adapt to common shapes
  if (Array.isArray(data) && data[0] && data[0].generated_text) return data[0].generated_text;
  if (data.generated_text) return data.generated_text;
  if (typeof data === 'string') return data;
  return JSON.stringify(data);
}

module.exports = { generate };
