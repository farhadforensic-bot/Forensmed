exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { messages, system } = body;

    let prompt = '';
    if (system) prompt += system + '\n\n';
    for (const msg of messages) {
      prompt += (msg.role === 'user' ? 'User: ' : 'Assistant: ') + msg.content + '\n';
    }
    prompt += 'Assistant:';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 200, headers, body: JSON.stringify({ content: [{ type: 'text', text: 'Error: API key tidak ditemukan.' }] }) };
    }

    // ✅ Gunakan gemini-2.0-flash — model terbaru yang tersedia
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: text || `Error: ${data?.error?.message || 'Tidak ada respons'}` }]
      }),
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: [{ type: 'text', text: `Error: ${error.message}` }] }),
    };
  }
};
