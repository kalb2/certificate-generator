# Connecteam Certificate App

This build supports both Vercel Blob authentication methods:

- Modern Vercel OIDC: `BLOB_STORE_ID` plus the runtime-managed `VERCEL_OIDC_TOKEN`
- Legacy/fallback static credential: `BLOB_READ_WRITE_TOKEN`

For Vercel OIDC, connect the Blob store to the exact Vercel project and deployment environments from the store's **Projects** tab. You do not need to create or copy a read/write token manually.

After redeploying, open `/setup`. The storage status should show **Vercel OIDC** when `BLOB_STORE_ID` is present.
