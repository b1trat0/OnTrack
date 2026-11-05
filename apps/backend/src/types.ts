export type Env = {
  DATABASE_URL: string
  HYPERDRIVE?: { connectionString: string }
  JWT_SECRET: string
  RESEND_API_KEY: string
  WEB_URL: string
  CORS_ORIGINS?: string
  OPENROUTER_API_KEY: string
  MODEL_KEY_ENCRYPTION_KEY: string
  INTEGRATION_ENCRYPTION_KEY: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_PRO_MONTHLY?: string
  STRIPE_PRICE_PRO_YEARLY?: string
  PRO_PRICE_MONTHLY?: string
  PRO_PRICE_YEARLY?: string
  BILLING_CURRENCY?: string
}

export type AppVariables = {
  userId: string
  requestId: string
}