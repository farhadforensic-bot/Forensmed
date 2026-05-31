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

    // Build simple prompt text
    let prompt = '';
    if (system) {
      prompt += system + '\n\n';
    }
    for (const msg of messages) {
      if (msg.role === 'user') {
        prompt += 'User: ' + msg.content + '\n';
      } else {
        prompt += 'Assistant: ' + msg.content + '\n';
      }
    }
    prompt += 'Assistant:';

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          content: [{ type: 'text', text: 'Error: GEMINI_API_KEY tidak ditemukan di environment variables.' }]
        }),
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    const geminiData = await geminiRes.json();
    
    // Log for debugging
    console.log('Gemini status:', geminiRes.status);
    console.log('Gemini response:', JSON.stringify(geminiData).slice(0, 500));

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      const errMsg = geminiData?.error?.message || JSON.stringify(geminiData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          content: [{ type: 'text', text: `Gemini error: ${errMsg}` }]
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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: `Function error: ${error.message}` }]
      }),
    };
  }
};
