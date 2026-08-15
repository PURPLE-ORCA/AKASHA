import { createServerOnlyFn } from "@tanstack/react-start"
import { z } from "zod"

const serverEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
  SESSION_SECRET: z.string().min(32),
})

const sessionEnvSchema = serverEnvSchema.pick({ SESSION_SECRET: true })

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(environment: NodeJS.ProcessEnv): ServerEnv {
  return serverEnvSchema.parse(environment)
}

export const getServerEnv = createServerOnlyFn(() =>
  parseServerEnv(process.env)
)

export const getSessionSecret = createServerOnlyFn(
  () => sessionEnvSchema.parse(process.env).SESSION_SECRET
)
