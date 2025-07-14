import Medusa from "@medusajs/js-sdk"

// Fallback sicuro
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

console.log("🔑 Medusa key:", process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)

export const sdk = new Medusa({
  baseUrl: "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
})
