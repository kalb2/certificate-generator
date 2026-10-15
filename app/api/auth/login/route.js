import { authConfigured, setSessionCookie, validCredentials } from '@/lib/auth';

export async function POST(request) {
  if (!authConfigured()) {
    return Response.json(
      { error: 'Admin login is not configured. Add ADMIN_EMAIL and ADMIN_PASSWORD in Vercel, then redeploy.' },
      { status: 503 }
    );
  }

  const { email, password } = await request.json();
  if (!validCredentials(email, password)) {
    return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  await setSessionCookie();
  return Response.json({ success: true });
}
