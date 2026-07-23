# Connecteam Certificate App

This build uses one explicit Vercel Blob credential:

`BLOB_READ_WRITE_TOKEN`

In Vercel, add the read/write token from your existing Blob store under **Project Settings > Environment Variables**. Apply it to Production (and Preview if needed), then redeploy.

The app does not use OIDC, `BLOB_STORE_ID`, or `BLOB_WEBHOOK_PUBLIC_KEY` for uploads.
