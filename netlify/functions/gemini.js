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

    // Build Gemini contents
    const contents = [];

    // Add system prompt as first exchange
    if (system) {
      contents.push({ role: 'user', parts: [{ text: system }] });
      contents.push({ role: 'model', parts: [{ text: 'Siap. Saya akan mengikuti instruksi tersebut sebagai asisten forensik medikolegal Indonesia.' }] });
    }

    // Add conversation messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9,
        },
      }),
    });

    const geminiData = await geminiRes.json();

    // Extract text from response
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Gemini response:', JSON.stringify(geminiData));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          content: [{ type: 'text', text: 'Maaf, terjadi kesalahan pada AI. Silakan coba lagi.' }]
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text }]
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: `Error: ${error.message}` }]
      }),
    };
  }
};
