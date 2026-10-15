# Connecteam Certificate Generator

A single-client Connecteam certificate automation. When the selected Connecteam form is submitted, the app generates a PDF certificate, stores it privately in Vercel Blob, records it in certificate history, and can post the completed certificate into a Connecteam chat.

Each client should deploy their **own copy** into **their own Vercel account**. Their Connecteam API key, admin login, Blob storage, deployment, and generated certificates remain under their control.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator&project-name=connecteam-certificate-generator&repository-name=connecteam-certificate-generator&env=CONNECTEAM_API_KEY,CONNECTEAM_SENDER_ID,ADMIN_EMAIL,ADMIN_PASSWORD&envDescription=Enter+the+Connecteam+API+key,+Connecteam+sender+ID,+and+the+admin+login+that+will+protect+this+certificate+portal.)

The button creates a new Vercel project and lets the client create their own copy of the Git repository. During deployment, Vercel prompts for the four required values below and saves them directly as environment variables on the new project. The client does **not** need to add these manually later in Vercel Settings.

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

The webhook only processes submissions for the configured form.

Admin sessions are stored in a signed, HttpOnly, SameSite cookie and expire after 12 hours. No user database, signup flow, or third-party authentication service is required.

## Environment variables

Required:

| Variable | Purpose |
| --- | --- |
| `CONNECTEAM_API_KEY` | Client's Connecteam API key. Used by the webhook for Connecteam file/chat delivery. |
| `CONNECTEAM_SENDER_ID` | Connecteam sender/custom publisher ID used for chat messages. |
| `ADMIN_EMAIL` | Email used to sign into the certificate portal. |
| `ADMIN_PASSWORD` | Password used to sign into the certificate portal. Use a unique password of at least 16 characters. |

These four values are requested by the **Deploy with Vercel** flow and automatically saved to the new Vercel project.

Optional:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Extra secret used to sign login sessions. If omitted, the app derives a signing secret from the admin credentials. |
| `BLOB_READ_WRITE_TOKEN` | Legacy/static Vercel Blob credential. New Vercel projects can use Vercel's automatic OIDC Blob authentication instead. |

Never commit any of these values to GitHub.

## Before you deploy

You need:

1. A Connecteam API key for the client's account.
2. A Connecteam sender/custom publisher ID for certificate chat messages.
3. A Connecteam conversation whose title contains **Certificates Automation**.
4. A Connecteam form containing the certificate fields.
5. A Vercel account.

The current setup screen requires mappings for first name, last name, and signature. Course name and completion date are optional.

> Australian Connecteam accounts currently require changing the API host from `https://api.connecteam.com` to `https://api-au.connecteam.com` before deployment.

## Step 1 — Deploy to Vercel

1. Click **Deploy with Vercel** above.
2. Sign in to Vercel.
3. Choose the Vercel account/team that should own the app.
4. Create a new Git repository when Vercel asks where to copy the source.
5. Vercel will prompt you for:
   - `CONNECTEAM_API_KEY`
   - `CONNECTEAM_SENDER_ID`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
6. Enter the values and continue. Vercel saves them automatically as environment variables on the project.
7. Deploy the project.

You do not need to open **Settings → Environment Variables** to add these four values manually.

The first deployment may complete before Blob storage is connected.

## Step 2 — Create a PRIVATE Vercel Blob store

This version is designed for a **private** Vercel Blob store.

1. Open the new Vercel project.
2. Go to **Storage**.
3. Create a **Blob** store.
4. Choose **Private** access.
5. Connect it to this project.
6. Use Vercel's default OIDC authentication if offered. The app also supports the older `BLOB_READ_WRITE_TOKEN` connection method.
7. Redeploy the project after connecting storage.

Do **not** use a public Blob store for certificates.

If this project previously used a public Blob store, create a new private store and connect the project to it. Old public certificate URLs should be treated as public and removed from the old store if they contain sensitive information.

## Step 3 — Sign in

Open the deployed site.

You will be sent to `/login`.

Use:
- Email: the value of `ADMIN_EMAIL`
- Password: the value of `ADMIN_PASSWORD`

There is no public signup page.

## Step 4 — Configure the certificate automation

1. After signing in, open **Setup**.
2. Confirm the storage check succeeds.
3. Paste the client's Connecteam API key into **Connecteam API key**.
4. Click **Find my forms**.
5. Select the form that should create certificates.
6. Confirm the detected mappings:
   - First name — required
   - Last name — required
   - Course name — optional
   - Completion date — optional
   - Signature — required
7. Upload a company logo if desired.
8. Click **Save automation**.
9. Copy the webhook URL shown by the app.

The API key pasted into the setup screen is only used to discover forms/questions. It is not stored in the saved automation configuration.

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

Do not remove the `?token=...` portion of the webhook URL. Connecteam needs to call the full URL exactly as the app displays it.

## Step 6 — Configure certificate chat delivery

The app searches the first Connecteam conversation whose title contains:

```text
Certificates Automation
```

Examples:
- `Certificates Automation`
- `HR - Certificates Automation`

Set `CONNECTEAM_SENDER_ID` to the sender/custom publisher ID that is valid for the client's Connecteam account.

If chat credentials are missing or no matching conversation is found, certificate generation can still complete; the chat message simply will not be sent.

## Step 7 — Test

1. Submit the configured Connecteam form.
2. Confirm the webhook succeeds.
3. Sign into the certificate portal.
4. Open **Certificates**.
5. Confirm the new record appears.
6. Click **Download**.
7. Confirm the PDF downloads only while logged in.
8. Confirm the certificate also arrives in the expected Connecteam chat if chat delivery is enabled.

## How private certificate downloads work

Generated PDFs are uploaded with:

```js
access: 'private'
```

Certificate history stores the private Blob pathname, not a public download URL.

When an admin clicks **Download**, the app:

1. verifies the admin session;
2. loads the certificate record from private Blob storage;
3. reads the private PDF server-side; and
4. streams the PDF back to the authenticated browser.

The raw Blob object is never intentionally exposed as a public URL.

## Updating a client's installation

Because each client owns their own copied repository, their deployment does not automatically receive future changes from this repository.

For a small number of clients, update their copy manually when needed. If this becomes a widely distributed product, consider turning the repository into a maintained template/release process.

## Changing the admin password

1. Open the Vercel project.
2. Go to **Settings → Environment Variables**.
3. Change `ADMIN_PASSWORD`.
4. Redeploy.

Existing login cookies become invalid because their signature depends on the deployment's authentication secret/credentials.

For even stronger separation, add a random `AUTH_SECRET` environment variable and keep it unchanged when changing the password.

## Troubleshooting

### Login says admin login is not configured

Add both `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel and redeploy.

### Storage check fails

Confirm a Vercel Blob store is connected to the project and redeploy. For this version the store must be **Private**.

### Blob says access does not match

The project is probably connected to a public Blob store. Create/connect a private Blob store.

### Forms do not load

Confirm the Connecteam API key is correct and has access to Forms.

### Certificate does not appear

Check the Vercel function logs for `/api/connecteam/webhook`, confirm the webhook event is a form submission, and confirm the webhook is configured for the same form selected in Setup.

### PDF downloads return 410

That record was created by an older version that stored a public certificate URL instead of a private Blob pathname. Generate a new certificate after private storage is enabled.

### Chat message is not sent

Confirm:
- `CONNECTEAM_API_KEY`
- `CONNECTEAM_SENDER_ID`
- Connecteam Chat API access
- a conversation title containing `Certificates Automation`

## Security notes

This is intentionally a simple single-admin application, not a multi-user SaaS authentication system.

For the intended one-client/one-deployment model it provides:
- a login gate;
- signed HttpOnly session cookies;
- private certificate storage;
- authenticated downloads;
- private configuration storage;
- no public certificate URLs; and
- a secret token on the Connecteam webhook URL.

If a future version needs multiple users, password resets, invitations, roles, SSO, or audit logs, migrate authentication to a dedicated identity provider rather than expanding this lightweight login system.
