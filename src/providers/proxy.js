async function generate({ prompt, model, maxTokens = 100 }) {
  const url = process.env.COMMITSENSE_PROXY_URL;
  if (!url) throw new Error('COMMITSENSE_PROXY_URL is not set');

  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Invalid prompt');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.COMMITSENSE_PROXY_AUTH ? { Authorization: `Bearer ${process.env.COMMITSENSE_PROXY_AUTH}` } : {})
      },
      body: JSON.stringify({ prompt, model, maxTokens }),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Proxy error: ${res.status} ${text}`);
    }
    const data = await res.json();
    // Expecting { text: "commit message" }
    if (typeof data?.text === 'string') return data.text;
    // Fallback for simple string response
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generate };
