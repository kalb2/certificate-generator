# Connecteam Certificate Generator

A single-client Connecteam certificate automation. When the selected Connecteam form is submitted, the app generates a PDF certificate, stores it privately in Vercel Blob, records it in certificate history, and can post the completed certificate into a Connecteam chat.

Each client should deploy their **own copy** into **their own Vercel account**. Their Connecteam credentials, admin login, Blob storage, deployment, and generated certificates remain under their control.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator&project-name=connecteam-certificate-generator&repository-name=connecteam-certificate-generator&env=CONNECTEAM_API_KEY,CONNECTEAM_SENDER_ID,CERTIFICATE_ADMIN_EMAIL,CERTIFICATE_ADMIN_PASSWORD&envDescription=Enter+all+four+required+values%3A+Connecteam+API+key%2C+Connecteam+sender+ID%2C+certificate+admin+email%2C+and+certificate+admin+password.&envLink=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator%23required-deployment-values)

The Deploy with Vercel flow should ask for all four required values on the same deployment screen and save them directly to the new Vercel project.

## Required deployment values

| Variable | Purpose |
| --- | --- |
| `CONNECTEAM_API_KEY` | Client's Connecteam API key. Used for form discovery, certificate delivery, and webhook processing. |
| `CONNECTEAM_SENDER_ID` | Connecteam sender/custom publisher ID used for chat messages. |
| `CERTIFICATE_ADMIN_EMAIL` | Email used to sign into the certificate portal. |
| `CERTIFICATE_ADMIN_PASSWORD` | Password used to sign into the certificate portal. Use a unique password of at least 16 characters. |

The app still accepts the older `ADMIN_EMAIL` and `ADMIN_PASSWORD` names for existing deployments, but new deployments should use the certificate-specific names above.

Optional:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Extra secret used to sign login sessions. If omitted, the app derives a signing secret from the admin credentials. |
| `BLOB_READ_WRITE_TOKEN` | Legacy/static Vercel Blob credential. New Vercel projects can use Vercel's automatic OIDC Blob authentication instead. |

Never commit any secret values to GitHub.

## What is protected

The app uses one admin login per deployment.

Protected:
- `/`
- `/setup`
- `/certificates`
- certificate downloads
- setup/configuration APIs
- Connecteam form discovery APIs
- logo upload and preview

Public by design:
- `/login`
- `/api/auth/login`
- `/api/connecteam/webhook` is internet-reachable because Connecteam must call it, but the generated webhook URL contains a secret token derived from the client's Connecteam API key. Requests without the correct token are rejected.

Admin sessions use a signed, HttpOnly, SameSite cookie and expire after 12 hours. No user database or third-party authentication service is required.

## Before you deploy

You need:

1. A Connecteam API key for the client's account.
2. A Connecteam sender/custom publisher ID for certificate chat messages.
3. A Connecteam conversation whose title contains **Certificates Automation** if chat delivery is desired.
4. A Connecteam form containing the certificate fields.
5. A Vercel account.

The setup screen requires mappings for first name, last name, and signature. Course name and completion date are optional.

> Australian Connecteam accounts currently require changing the API host from `https://api.connecteam.com` to `https://api-au.connecteam.com` before deployment.

## Step 1 — Deploy to Vercel

1. Click **Deploy with Vercel** above.
2. Sign in to Vercel.
3. Choose the Vercel account/team that should own the app.
4. Create a new Git repository when Vercel asks where to copy the source.
5. Enter all four requested values:
   - `CONNECTEAM_API_KEY`
   - `CONNECTEAM_SENDER_ID`
   - `CERTIFICATE_ADMIN_EMAIL`
   - `CERTIFICATE_ADMIN_PASSWORD`
6. Deploy the project.

Vercel saves those values directly on the project. You should not need to add them again manually in **Settings → Environment Variables**.

## Step 2 — Create a PRIVATE Vercel Blob store

1. Open the new Vercel project.
2. Go to **Storage**.
3. Create a **Blob** store.
4. Choose **Private** access.
5. Connect it to this project.
6. Use Vercel's default OIDC authentication if offered.
7. Redeploy after connecting storage.

Do **not** use a public Blob store for certificates.

## Step 3 — Sign in

Open the deployed site. You will be sent to `/login`.

Use the email and password entered during deployment.

There is no public signup page.

## Step 4 — Configure the certificate automation

1. After signing in, open **Setup**.
2. Confirm the storage check succeeds.
3. Click **Find my forms**.
4. Select the form that should create certificates.
5. Confirm the detected mappings:
   - First name — required
   - Last name — required
   - Course name — optional
   - Completion date — optional
   - Signature — required
6. Upload a company logo if desired.
7. Click **Save automation**.
8. Copy the webhook URL shown by the app.

You do **not** paste the Connecteam API key again in Setup. Form discovery uses the `CONNECTEAM_API_KEY` already stored in the Vercel deployment.

The saved automation configuration and uploaded logo are stored privately in Vercel Blob.

## Step 5 — Create the Connecteam webhook

The app currently expects one manual Connecteam webhook.

1. In Connecteam, go to **Settings → API & Integrations**.
2. Add a webhook.
3. Choose the Forms feature.
4. Choose the certificate form.
5. Choose the form-submission event.
6. Paste the webhook URL displayed by the app.
7. Save it.

The URL will look similar to:

```text
https://your-project.vercel.app/api/connecteam/webhook?token=...
```

Do not remove the `?token=...` portion.

## Step 6 — Configure certificate chat delivery

The app searches for the first Connecteam conversation whose title contains:

```text
Certificates Automation
```

Examples:
- `Certificates Automation`
- `HR - Certificates Automation`

If chat credentials are missing or no matching conversation is found, certificate generation can still complete; the chat message simply will not be sent.

## Step 7 — Test

1. Submit the configured Connecteam form.
2. Confirm the webhook succeeds.
3. Sign into the certificate portal.
4. Open **Certificates**.
5. Confirm the new record appears.
6. Click **Download**.
7. Confirm the PDF downloads only while logged in.
8. Confirm the certificate arrives in the expected Connecteam chat if chat delivery is enabled.

## Private certificate downloads

Generated PDFs are uploaded with private Blob access. Certificate history stores the private Blob pathname, not a public download URL. When an admin clicks **Download**, the app verifies the session, loads the private PDF server-side, and streams it back to the authenticated browser.

## Changing the admin password

For a new deployment, change `CERTIFICATE_ADMIN_PASSWORD` in Vercel and redeploy. Existing deployments using `ADMIN_PASSWORD` remain supported.

Existing login cookies become invalid when the credentials used to derive the signing secret change. If you use a separate `AUTH_SECRET`, keep that value unchanged when changing the password.

## Troubleshooting

### Login says admin login is not configured

For new deployments, confirm both `CERTIFICATE_ADMIN_EMAIL` and `CERTIFICATE_ADMIN_PASSWORD` exist in Vercel and redeploy. Existing `ADMIN_EMAIL` and `ADMIN_PASSWORD` values are also supported.

### Storage check fails

Confirm a Vercel Blob store is connected to the project and that it is **Private**.

### Forms do not load

Confirm `CONNECTEAM_API_KEY` exists in the Vercel deployment and has access to Forms. The setup page does not accept a second API key anymore.

### Certificate does not appear

Check the Vercel function logs for `/api/connecteam/webhook`, confirm the webhook event is a form submission, and confirm the webhook is configured for the same form selected in Setup.

### Chat message is not sent

Confirm:
- `CONNECTEAM_API_KEY`
- `CONNECTEAM_SENDER_ID`
- Connecteam Chat API access
- a conversation title containing `Certificates Automation`

## Security notes

This is intentionally a simple single-admin application, not a multi-user SaaS authentication system. For the intended one-client/one-deployment model it provides a login gate, signed HttpOnly session cookies, private certificate storage, authenticated downloads, private configuration storage, no public certificate URLs, and a secret token on the Connecteam webhook URL.
