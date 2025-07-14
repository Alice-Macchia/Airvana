import { defineConfig } from '@medusajs/utils'
import * as dotenv from "dotenv"
dotenv.config()

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
    },
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7000",
    },
    defaultSalesChannel: process.env.SALES_CHANNEL,
  },
})
