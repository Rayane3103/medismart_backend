# Prompt For Doctor-Side Frontend Agent

You are reviewing the doctor-side frontend integration for MediSmart.

Your job is **not** to change the backend. Your job is to verify that the doctor-side app correctly uses the existing backend API and handles all frontend states cleanly.

Backend URL:

```txt
https://medismart-backend-626z.onrender.com
```

Please inspect the doctor-side app and verify the following.

## Expected Frontend Flow

The doctor-side app in AI config screen should allow a doctor to log in using:

```txt
doctor_id
secret
```

After login, the app should store only the returned doctor session token.

The frontend must send that token on authenticated requests using:

```txt
X-Doctor-Token
```

The frontend must never ask for, store, display, or expose Groq/Gemini API keys.

## Required API Calls

### 1. Doctor Login

The frontend should call:

```txt
POST /api/auth/doctor
```

With JSON body:

```json
{
  "doctor_id": "doctor id from admin panel",
  "secret": "secret from admin panel"
}
```

On success, it receives a `token`. The frontend should store that token securely enough for the app context and use it for later requests.

### 2. Usage / Subscription State

The frontend should call:

```txt
GET /api/me/subscription
```

With header:

```txt
X-Doctor-Token: token
```

The UI should use the response to show:

```txt
daily_limit
daily_used
daily_remaining
monthly_limit
monthly_used
monthly_remaining
assigned_api_key_name
ai_provider
ai_model
active
ai_enabled
```

If the doctor is inactive, AI is disabled, or no API key is assigned, the UI should show a clear friendly message.

### 3. AI Request

The frontend should call:

```txt
POST /api/me/ai/chat
```

With header:

```txt
X-Doctor-Token: token
```

With JSON body like:

```json
{
  "message": "user prompt or generated medical analysis prompt",
  "action_type": "chat",
  "max_tokens": 512
}
```

The frontend should support these `action_type` values when relevant:

```txt
chat
lab_analysis
pdf_analysis
ecg_analysis
image_analysis
multimodal_analysis
irm_analysis
```

After a successful AI response, the frontend should update the displayed daily/monthly remaining usage.

### 4. Logs

If the doctor-side app has an activity/history screen, it should call:

```txt
GET /api/me/logs
```

With header:

```txt
X-Doctor-Token: token
```

## Frontend Error Handling To Verify

Please verify the UI handles these cases gracefully:

```txt
401: login failed or session expired
402: monthly usage limit reached
429: daily usage limit reached
403: doctor inactive or AI disabled
409: assigned AI key missing, inactive, or not configured
502: AI provider error
network error: backend unreachable or request timed out
```

For each case, the doctor should see a helpful message, not a raw technical error.

## Verification Checklist

Please verify and report whether each item is handled correctly:

1. Doctor can log in with `doctor_id` and `secret`.
2. Frontend stores and reuses the returned session token.
3. Frontend sends `X-Doctor-Token` on protected requests.
4. Frontend never uses Groq/Gemini API keys directly.
5. Frontend displays daily and monthly usage limits.
6. Frontend updates remaining usage after AI calls.
7. Frontend blocks or warns clearly when daily/monthly usage is exhausted.
8. Frontend handles inactive doctor / AI disabled states.
9. Frontend handles missing assigned API key state.
10. Frontend handles expired/invalid session by asking the doctor to log in again.
11. Frontend uses correct `action_type` values for each AI feature.
12. Frontend does not send patient data anywhere except to the configured backend AI endpoint intentionally used for AI analysis.

At the end, please provide a short report:

```txt
Status: OK / Needs changes

What works:
- ...

Issues found:
- ...

Recommended fixes:
- ...
```
