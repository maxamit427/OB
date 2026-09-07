# Google OAuth configuration

`client-id.json` is the portable, Git-friendly location for the Google OAuth
Web Client ID used by this project.

1. Create a **Web application** OAuth client in Google Cloud Console.
2. Add the Replit, Vercel, and custom-domain origins to **Authorized JavaScript
   origins**.
3. Put the public client ID in `client-id.json`.

The Google OAuth Client ID is public by design. Never put a client secret,
private key, refresh token, or Gmail password in this folder or in Git.

Environment variable precedence:

1. `GOOGLE_CLIENT_ID`
2. `VITE_GOOGLE_CLIENT_ID`
3. `config/google/client-id.json`