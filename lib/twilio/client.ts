import twilio from 'twilio'

// Returns a Twilio REST client if credentials are configured, otherwise null.
// Callers must handle the null case — missing credentials should never crash the app.
export function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!sid || !token) return null
  return twilio(sid, token)
}
