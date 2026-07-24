export async function findCertificateChat(apiKey) {
  const res = await fetch('https://api.connecteam.com/chat/v1/conversations?limit=100', {
    headers: { 'X-API-KEY': apiKey }
  });
  if (!res.ok) throw new Error(`Chat lookup failed: ${res.status}`);
  const json = await res.json();
  const conversations = json.data?.conversations || json.conversations || [];
  return conversations.find(c =>
    String(c.title || '').toLowerCase().includes('certificates automation')
  );
}

export async function sendCertificateChatMessage({apiKey, conversationId, senderId, employeeName, courseName, fileId}) {
  const res = await fetch(
    `https://api.connecteam.com/chat/v1/conversations/${conversationId}/message`,
    {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        senderId: Number(senderId),
        text: `${employeeName} completed ${courseName}. Certificate attached.`,
        attachments: [{
          type: 'file',
          fileId
        }]
      })
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat message failed: ${res.status} ${text}`);
  }
  return res.json();
}
