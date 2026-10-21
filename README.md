# Connecteam Certificate Generator

A single-client Connecteam certificate automation. When the selected Connecteam form is submitted, the app generates a PDF certificate, stores it in Vercel Blob, records it in certificate history, and can post the completed certificate into a Connecteam chat.

Each client should deploy their **own copy** into **their own Vercel account**. Their Connecteam credentials, admin login, Blob storage, deployment, and generated certificates remain under their control.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator&project-name=connecteam-certificate-generator&repository-name=connecteam-certificate-generator&env=CONNECTEAM_API_KEY,CONNECTEAM_SENDER_ID,CERTIFICATE_ADMIN_EMAIL,CERTIFICATE_ADMIN_PASSWORD&envDescription=Enter+all+four+required+values%3A+Connecteam+API+key%2C+Connecteam+sender+ID%2C+certificate+admin+email%2C+and+certificate+admin+password.&envLink=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator%23required-deployment-values)

The Deploy with Vercel flow should ask for all four required values on the same deployment screen and save them directly to the new Vercel project.

## Required deployment values

| Variable | Purpose |
| --- | --- |
| `CONNECTEAM_API_KEY` | Client's Connecteam API key. Used for form discovery, certificate delivery, and automatic webhook registration/processing. |
| `CONNECTEAM_SENDER_ID` | Connecteam sender/custom publisher ID used for chat messages. |
| `CERTIFICATE_ADMIN_EMAIL` | Email used to sign into the certificate portal. |
| `CERTIFICATE_ADMIN_PASSWORD` | Password used to sign into the certificate portal. Use a unique password of at least 16 characters. |

The app still accepts the older `ADMIN_EMAIL` and `ADMIN_PASSWORD` names for existing deployments, but new deployments should use the certificate-specific names above.

## Step-by-step setup

### Step 1 — Deploy to Vercel

1. Click **Deploy with Vercel** above.
2. Sign in to Vercel.
3. Choose the Vercel account/team that should own the app.
4. Create a new Git repository when Vercel asks where to copy the source.
5. Enter all four requested values: `CONNECTEAM_API_KEY`, `CONNECTEAM_SENDER_ID`, `CERTIFICATE_ADMIN_EMAIL`, and `CERTIFICATE_ADMIN_PASSWORD`.
6. Deploy the project.

Vercel saves those values directly on the project. You should not need to add them again manually in **Settings → Environment Variables**.

### Step 2 — Connect Vercel Blob storage

1. Open the new Vercel project.
2. Go to **Storage** and create a **Blob** store, or connect an existing Blob store.
3. Connect the store to this project.
4. Use Vercel's default OIDC authentication if offered.
5. Redeploy after connecting storage if Vercel requires it.

The app supports public or private Blob stores. **Private access is recommended for certificates** because certificate files contain personal information. The app's authenticated certificate-download route protects downloads when using private storage.

### Step 3 — Sign in

Open the deployed site. You will be sent to `/login`.

Use the email and password entered during deployment. There is no public signup page.

### Step 4 — Configure the certificate automation

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
6. Upload a company logo and adjust the PDF layout if desired.
7. Click **Save automation**.

You do **not** paste the Connecteam API key again in Setup. Form discovery uses the `CONNECTEAM_API_KEY` already stored in the Vercel deployment.

**The app registers the Connecteam webhook automatically when you save the automation.** It checks for a matching webhook first: if one already exists, it updates and verifies it; if not, it creates and verifies a new one. You do not need to create a webhook manually in Connecteam.

### Step 5 — Confirm webhook registration

After saving the automation, check the webhook status shown in Setup.

- **Registered and verified in Connecteam** means the webhook registration was checked successfully.
- **Live delivery not confirmed yet** means the app has not yet confirmed processing a real form submission. Submit the selected form once to test end-to-end delivery.

If registration fails, check that the Connecteam API key has the required access to read and manage webhooks/settings, and review the error shown in Setup. Do not create a second webhook manually as a workaround unless your Connecteam administrator specifically directs you to.

### Step 6 — Configure certificate chat delivery

The app searches for the first Connecteam conversation whose title contains:

```text
Certificates Automation
```

Examples:
- `Certificates Automation`
- `HR - Certificates Automation`

If no matching conversation is found or chat delivery is unavailable, certificate generation can still complete; the chat message simply will not be sent.

### Step 7 — Test the full workflow

1. Submit the configured Connecteam form.
2. Confirm Setup shows that live webhook delivery has been confirmed, if that status is available.
3. Sign into the certificate portal.
4. Open **Certificates** and confirm the new record appears.
5. Click **Download** and confirm the PDF downloads while logged in.
6. Confirm the certificate arrives in the expected Connecteam chat if chat delivery is enabled.

The setup screen requires mappings for first name, last name, and signature. Course name and completion date are optional.

> Australian Connecteam accounts may need the API host changed from `https://api.connecteam.com` to `https://api-au.connecteam.com` before deployment.

## Optional deployment values

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
- `/api/connecteam/webhook` is internet-reachable because Connecteam must call it, but the generated webhook URL contains a secret token. Requests without the correct token are rejected.

Admin sessions use a signed, HttpOnly, SameSite cookie and expire after 12 hours. No user database or third-party authentication service is required.

## Private certificate downloads

Certificate history stores the Blob pathname rather than a public download URL. When an admin clicks **Download**, the app verifies the session and streams the PDF back to the authenticated browser.

## Changing the admin password

For a new deployment, change `CERTIFICATE_ADMIN_PASSWORD` in Vercel and redeploy. Existing deployments using `ADMIN_PASSWORD` remain supported.

Existing login cookies become invalid when the credentials used to derive the signing secret change. If you use a separate `AUTH_SECRET`, keep that value unchanged when changing the password.

## Troubleshooting

### Login says admin login is not configured

For new deployments, confirm both `CERTIFICATE_ADMIN_EMAIL` and `CERTIFICATE_ADMIN_PASSWORD` exist in Vercel and redeploy. Existing `ADMIN_EMAIL` and `ADMIN_PASSWORD` values are also supported.

### Storage check fails

Confirm a Vercel Blob store is connected to the project and that the app can access it. Private access is recommended for certificate files.

### Forms do not load

Confirm `CONNECTEAM_API_KEY` exists in the Vercel deployment and has access to Forms. The setup page does not accept a second API key.

### Webhook registration fails

Confirm the API key has the required Connecteam settings/webhook permissions. Click **Save automation** again after resolving permissions; the app will check for an existing matching webhook and update it or create one as needed.

### Certificate does not appear

Check the Vercel function logs for `/api/connecteam/webhook`, confirm the selected form is the one being submitted, and check the webhook status in Setup.

### Chat message is not sent

Confirm:
- `CONNECTEAM_API_KEY`
- `CONNECTEAM_SENDER_ID`
- Connecteam Chat API access
- a conversation title containing `Certificates Automation`

## Security notes

This is intentionally a simple single-admin application, not a multi-user SaaS authentication system. For the intended one-client/one-deployment model it provides a login gate, signed HttpOnly session cookies, authenticated downloads, private configuration storage, and a secret token on the Connecteam webhook URL.
