# Fixing OAuth Redirect URI Mismatch Error

## Error Message
```
Error 400: redirect_uri_mismatch
Access blocked: This app's request is invalid
```

## What This Means

The redirect URI in your OAuth request doesn't exactly match what's registered in Google Cloud Console. Google is very strict about this - even a trailing slash or protocol mismatch will cause this error.

## Quick Fix Steps

### 1. Check Your Current Redirect URI

The code uses these redirect URIs:
- **Google Drive**: `http://localhost:3000/api/google-drive/callback`
- **Google Meet/Calendar**: `http://localhost:3000/api/google-meet/callback`

### 2. Verify in Google Cloud Console

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Check the **Authorized redirect URIs** section
4. Make sure you have **exactly** these URIs (no trailing slashes, correct protocol):

```
http://localhost:3000/api/google-drive/callback
http://localhost:3000/api/google-meet/callback
```

### 3. Common Issues and Fixes

#### Issue: Missing Redirect URI
**Fix**: Add the exact redirect URI to your OAuth client

#### Issue: Trailing Slash
- ❌ Wrong: `http://localhost:3000/api/google-drive/callback/`
- ✅ Correct: `http://localhost:3000/api/google-drive/callback`

#### Issue: Wrong Protocol
- ❌ Wrong: `https://localhost:3000/api/google-drive/callback` (localhost doesn't use HTTPS)
- ✅ Correct: `http://localhost:3000/api/google-drive/callback`

#### Issue: Using 127.0.0.1 instead of localhost
- ❌ Wrong: `http://127.0.0.1:3000/api/google-drive/callback`
- ✅ Correct: `http://localhost:3000/api/google-drive/callback`

#### Issue: Wrong Port
- Make sure the port (3000) matches your actual server port
- Check your `.env.local` or `package.json` for the port

### 4. Update Google Cloud Console

1. Go to your OAuth 2.0 Client ID settings
2. In "Authorized redirect URIs", click "ADD URI"
3. Add these **exact** URIs (one at a time):
   ```
   http://localhost:3000/api/google-drive/callback
   http://localhost:3000/api/google-meet/callback
   ```
4. Click "SAVE"
5. Wait a few minutes for changes to propagate

### 5. Verify Environment Variables

Check your `.env.local` file:

```env
# Should match what's in Google Cloud Console
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
```

Or if you want different URIs for different services:

```env
# For Drive
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# For Calendar/Meet (if different)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-meet/callback
```

### 6. Test Again

After updating:
1. Clear your browser cache/cookies for Google
2. Try the OAuth flow again
3. The redirect should work now

## For Production

When deploying to production, you'll need to:

1. Add your production redirect URI to Google Cloud Console:
   ```
   https://your-domain.com/api/google-drive/callback
   https://your-domain.com/api/google-meet/callback
   ```

2. Update your environment variables:
   ```env
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/google-drive/callback
   ```

3. Make sure your production server is accessible at that URL

## Still Having Issues?

1. **Check the exact error**: Google sometimes shows the exact redirect URI it received
2. **Check browser console**: Look for any redirect URI in the error
3. **Verify OAuth client**: Make sure you're using the correct Client ID
4. **Wait a few minutes**: Google changes can take 5-10 minutes to propagate

## Quick Checklist

- [ ] Redirect URI in code matches Google Cloud Console exactly
- [ ] No trailing slashes
- [ ] Correct protocol (http for localhost, https for production)
- [ ] Using `localhost` not `127.0.0.1`
- [ ] Port number matches (3000)
- [ ] Saved changes in Google Cloud Console
- [ ] Waited a few minutes after saving
- [ ] Cleared browser cache


