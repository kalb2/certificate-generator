# Connecteam Certificate Generator

A single-client Connecteam certificate automation. When the selected Connecteam form is submitted, this app generates a PDF certificate, stores it in Vercel Blob, records it in certificate history, and can post the completed certificate into a Connecteam chat.

Each client should deploy their **own copy** of this repository into **their own Vercel account**. That keeps their Connecteam API key, Vercel storage, deployment, and generated certificates under their control.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator&project-name=connecteam-certificate-generator&repository-name=connecteam-certificate-generator&env=CONNECTEAM_API_KEY,CONNECTEAM_SENDER_ID&envDescription=Enter+the+Connecteam+API+key+and+the+custom+publisher+ID+used+to+send+certificate+messages+in+Connecteam+Chat.&envLink=https%3A%2F%2Fgithub.com%2Fkalb2%2Fcertificate-generator%23environment-variables)

The button creates a new Vercel project and lets you create your own copy of the Git repository. You do not need to clone this repository or edit code to get started.

## Before you deploy

You need the following from your Connecteam account:

1. **Connecteam API access.** In Connecteam, go to **Settings → API Keys → Add API key** and create an API key for this integration. Keep the key private.
2. **A custom publisher for certificate messages.** Go to **Settings → Feed settings**, create or choose a custom publisher, and copy its publisher ID. This becomes `CONNECTEAM_SENDER_ID`.
3. **A team chat or channel for certificate notifications.** The conversation title must contain the words **Certificates Automation**. For example, `Certificates Automation` or `HR - Certificates Automation` both work. The app uses the first matching non-private conversation it finds.
4. **A Connecteam form** that contains the fields you want to place on the certificate. First name, last name, and signature are required by the current setup screen. Course name and completion date are optional and can fall back to the form name/current submission date.

Connecteam API access depends on the client's Connecteam plan and enabled hubs. Chat delivery also requires access to the Connecteam Chat API.

> **Australian Connecteam accounts:** this version currently calls `https://api.connecteam.com`. Australian accounts use `https://api-au.connecteam.com`, so the app needs a small code change before deploying for an Australian client.

## Step 1 — Deploy to Vercel

1. Click **Deploy with Vercel** above.
2. Sign in to Vercel or create an account.
3. Choose the Vercel team/account that should own this deployment.
4. Create a new Git repository when Vercel asks where to copy the source code. This gives the client their own copy rather than deploying directly from this repository.
5. Enter these environment variables when prompted:
   - `CONNECTEAM_API_KEY` — the client's Connecteam API key.
   - `CONNECTEAM_SENDER_ID` — the custom publisher ID from **Settings → Feed settings**.
6. Deploy the project.
7. Open the new Vercel project after the first deployment finishes.

The first deployment can complete before Blob storage is connected. The app's setup page will show storage as not connected until Step 2 is complete.

## Step 2 — Create and connect Vercel Blob storage

This app currently uses a Vercel Blob store and explicitly reads `BLOB_READ_WRITE_TOKEN`.

1. In the new Vercel project, open **Storage**.
2. Create a new **Blob** store and connect it to this project.
3. Use a **Public** Blob store for the current version of this app. The generated certificate history currently links directly to Blob URLs.
4. After the Blob store is connected, confirm that Vercel added an environment variable named `BLOB_READ_WRITE_TOKEN` to the project.
5. Go to **Deployments**, open the latest production deployment, and choose **Redeploy** so the new Blob credential is available to the running app.

You should not copy another client's Blob token into this project. Each client should use their own Blob store.

## Step 3 — Configure the certificate automation

1. Open the deployed site, then go to `/setup` or click **Set up automation** on the home page.
2. Confirm that **Storage check** says Vercel Blob storage is connected.
3. Paste the same Connecteam API key into the **Connecteam API key** field and click **Find my forms**.
   - The setup screen uses the key to read the client's forms and form questions.
   - The key entered on this screen is not saved in the active automation configuration; chat delivery later uses the server-side `CONNECTEAM_API_KEY` environment variable.
4. Choose the Connecteam form that should generate certificates.
5. Review the detected field mappings:
   - First name — required
   - Last name — required
   - Course name — optional
   - Completion date — optional
   - Signature — required
6. Upload a company logo if desired.
7. Click **Save automation**.
8. The app will display the permanent webhook URL for this deployment. Copy that URL.

The app stores one active certificate configuration per deployment. Saving setup again replaces the previous active configuration.

## Step 4 — Create the Connecteam webhook

The current app does not automatically create the webhook, so this is a one-time Connecteam setup step.

1. In Connecteam, go to **Settings → API & Integrations**.
2. Click **Add webhook**.
3. Give it a clear name such as `Certificate Generator`.
4. Set the webhook URL to the URL shown by the app after saving setup. It will look like:

   `https://YOUR-VERCEL-DOMAIN.vercel.app/api/connecteam/webhook`

5. Select **Forms** as the feature.
6. Select the same form you chose in the certificate setup screen.
7. Select **Form submission** / `form_submission` as the event.
8. Create/enable the webhook.

Only one webhook is needed for the selected certificate form.

## Step 5 — Test the complete flow

1. Submit the selected form in Connecteam using test data.
2. Include a signature in the submission.
3. Open the Vercel deployment and go to `/certificates`.
4. Confirm the new certificate appears in the certificate history and the PDF opens correctly.
5. Open the Connecteam conversation whose title contains **Certificates Automation**.
6. Confirm a message was posted by the custom publisher with the certificate attached.

If the PDF is generated but no Connecteam chat message appears, check the environment variables and the chat troubleshooting section below.

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `CONNECTEAM_API_KEY` | Required for chat delivery | Server-side Connecteam API credential used to upload the PDF and send the chat message. |
| `CONNECTEAM_SENDER_ID` | Required for chat delivery | Connecteam custom publisher ID used as the sender of certificate messages. |
| `BLOB_READ_WRITE_TOKEN` | Required | Vercel Blob credential used for setup configuration, logos, generated PDFs, and certificate records. Vercel adds this automatically when the client's Blob store is connected to the project. |

Do not commit any of these values to GitHub.

## How chat delivery works

After a certificate is generated, the app:

1. Uploads the generated PDF to Connecteam's attachment API.
2. Lists the account's non-private conversations.
3. Finds the first conversation whose title contains `Certificates Automation`.
4. Posts a message using the custom publisher identified by `CONNECTEAM_SENDER_ID`.

The sender ID is **not** a normal employee/user ID. It must be a Connecteam **custom publisher ID**.

## Troubleshooting

### Storage check says storage is not connected

- Confirm the Vercel Blob store is connected to the same Vercel project.
- Confirm `BLOB_READ_WRITE_TOKEN` exists under **Project Settings → Environment Variables**.
- Redeploy after the variable is added.

### Forms do not load

- Recheck the API key.
- Confirm the client's Connecteam plan includes API access.
- Confirm the API key has access to Forms.
- Australian accounts are not supported by the current hard-coded API host.

### Certificate generates but no chat message appears

- Confirm `CONNECTEAM_API_KEY` exists in Vercel Production environment variables.
- Confirm `CONNECTEAM_SENDER_ID` is the ID of a custom publisher, not an employee ID.
- Confirm a non-private Connecteam team chat or channel exists whose title contains `Certificates Automation`.
- Confirm the API key/account has access to the Chat API.
- Redeploy after changing environment variables.

### No certificate is generated after a form submission

- Confirm the Connecteam webhook is enabled.
- Confirm the webhook points to `/api/connecteam/webhook` on the production Vercel domain.
- Confirm the webhook is scoped to the same form selected in `/setup`.
- Confirm the event is `form_submission`.
- Check the Vercel Function logs for the webhook request and any error message.

## Updating a client's deployment later

The deploy button creates a client-owned copy of the repository. That is intentional: the client controls their deployment and credentials.

Because it is a separate repository, later improvements made here will not automatically appear in the client's copy. To update a client deployment, merge/copy the desired changes into that client's repository and push them. Vercel will redeploy automatically from the connected Git repository.

## Current security considerations

Before using this version for highly sensitive employee data, be aware of the following current behavior:

- `/setup` does not currently require authentication.
- `/certificates` does not currently require authentication.
- The current Blob implementation uses public Blob URLs for generated certificates and configuration records.
- Certificates can contain employee names and signatures.

For a production deployment containing sensitive employee information, the recommended next hardening step is to add administrator authentication and move certificate storage to private Blob access with authenticated download routes.

## Local development

If you want to run the project locally instead of using the Vercel deployment flow:

```bash
npm install
npm run dev
```

Create a `.env.local` file containing:

```bash
CONNECTEAM_API_KEY=your_connecteam_api_key
CONNECTEAM_SENDER_ID=your_custom_publisher_id
BLOB_READ_WRITE_TOKEN=your_vercel_blob_read_write_token
```

Then open `http://localhost:3000`.
