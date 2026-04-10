export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://kojex.net',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }

    const { name, email, message } = body;

    if (!name || !email || !message) {
      return Response.json({ ok: false, error: 'All fields are required.' }, { status: 400 });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return Response.json({ ok: false, error: 'Invalid field types.' }, { status: 400 });
    }

    if (!email.includes('@') || email.length > 254) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (message.length > 5000) {
      return Response.json({ ok: false, error: 'Message must be under 5000 characters.' }, { status: 400 });
    }

    if (name.length > 200) {
      return Response.json({ ok: false, error: 'Name must be under 200 characters.' }, { status: 400 });
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
          to: [env.SUPPORT_EMAIL],
          reply_to: email,
          subject: `DeckSync Support: ${name}`,
          text: `From: ${name}\nEmail: ${email}\n\n${message}`,
        }),
      });

      if (!res.ok) {
        console.error('Resend error:', res.status, await res.text());
        return Response.json(
          { ok: false, error: 'Failed to send message. Please try again later.' },
          { status: 502 }
        );
      }

      return Response.json({ ok: true });
    } catch (err) {
      console.error('Worker error:', err);
      return Response.json(
        { ok: false, error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }
  },
};
