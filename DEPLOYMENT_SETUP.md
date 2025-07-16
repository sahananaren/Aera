# Audio Recording Deployment Setup Guide

## Critical Environment Variables for Production

### 1. Supabase Edge Functions Environment Variables

**Required for transcription to work in production:**

1. Go to your Supabase Dashboard
2. Navigate to `Project Settings` → `Edge Functions`
3. Add the following environment variable:

```
GOOGLE_SERVICE_ACCOUNT_KEY
```

**Value:** Your complete Google Cloud service account JSON key (the entire JSON object as a string)

### 2. Google Cloud Setup

1. **Create a Google Cloud Project** (if you haven't already)
2. **Enable the Speech-to-Text API**
3. **Create a Service Account:**
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Give it a name (e.g., "aera-speech-to-text")
   - Grant the role: "Cloud Speech Client"
   - Download the JSON key file
4. **Copy the entire JSON content** and paste it as the value for `GOOGLE_SERVICE_ACCOUNT_KEY`

### 3. Verify Environment Variables

After setting up the environment variables, test them by deploying your edge functions:

```bash
# Deploy the transcription function
supabase functions deploy transcribe-audio
```

## Common Issues and Solutions

### Issue 1: "Speech-to-Text API key not configured"
**Solution:** The `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable is not set in your Supabase project.

### Issue 2: "Authentication failed - check API key configuration"
**Solution:** The service account JSON is malformed or the service account doesn't have the correct permissions.

### Issue 3: "No speech was detected"
**Solution:** This is normal behavior - the user can choose to continue or try again.

### Issue 4: Android permissions not working
**Solution:** Ensure your production build includes the microphone permissions from `app.json`.

## Testing Your Setup

1. **Deploy your app** to a test device
2. **Check the logs** in Supabase Dashboard → Edge Functions → Functions → transcribe-audio → Logs
3. **Test recording** and verify transcription works
4. **Check console logs** for any error messages

## Build Configuration

Your current `eas.json` should work fine for production builds. The key permissions are already configured in `app.json`:

```json
{
  "android": {
    "permissions": [
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS"
    ]
  },
  "plugins": [
    ["expo-av", {
      "microphonePermission": "Allow Āera to access your microphone to record journal entries."
    }]
  ]
}
```

## Production Checklist

- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` set in Supabase Edge Functions
- [ ] Google Cloud Speech-to-Text API enabled
- [ ] Service account has "Cloud Speech Client" role
- [ ] Edge functions deployed with latest changes
- [ ] App built and deployed to Play Store
- [ ] Test recording and transcription on actual device
- [ ] Check Supabase logs for any errors

## If Issues Persist

1. **Check Supabase Edge Function logs** for detailed error messages
2. **Test the transcription function directly** in Supabase dashboard
3. **Verify Google Cloud billing** is enabled (required for Speech-to-Text API)
4. **Ensure the service account key is valid** and properly formatted

The improved error handling and logging should now provide much clearer information about what's failing in production.