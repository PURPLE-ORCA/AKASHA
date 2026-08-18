import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { z } from "zod"

import { getSessionSecret } from "../env.server"
import type { GoogleTokenCredentials } from "./google-oauth.server"

const CREDENTIAL_PREFIX = "akasha_device_v1"
const CREDENTIAL_PURPOSE = "akasha-extension-credential-v1"
const CREDENTIAL_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000

const credentialPayloadSchema = z.object({
  accessToken: z.string().min(1).optional(),
  accessTokenExpiresAt: z.number().int().positive().optional(),
  expiresAt: z.number().int().positive(),
  issuedAt: z.number().int().positive(),
  refreshToken: z.string().min(1),
  version: z.literal(1),
})

type CredentialOptions = {
  now?: number
  secret?: string
}

export function issueExtensionCredential(
  credentials: GoogleTokenCredentials | string,
  options: CredentialOptions = {}
) {
  const now = options.now ?? Date.now()
  const secret = options.secret ?? getSessionSecret()
  const initializationVector = randomBytes(12)
  const cipher = createCipheriv(
    "aes-256-gcm",
    deriveCredentialKey(secret),
    initializationVector
  )
  cipher.setAAD(Buffer.from(CREDENTIAL_PURPOSE))

  const encryptedPayload = Buffer.concat([
    cipher.update(
      JSON.stringify({
        ...(typeof credentials === "string" ? {} : credentials),
        expiresAt: now + CREDENTIAL_LIFETIME_MS,
        issuedAt: now,
        refreshToken:
          typeof credentials === "string"
            ? credentials
            : credentials.refreshToken,
        version: 1,
      })
    ),
    cipher.final(),
  ])

  return [
    CREDENTIAL_PREFIX,
    initializationVector.toString("base64url"),
    encryptedPayload.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".")
}

export function readExtensionCredential(
  credential: string,
  options: CredentialOptions = {}
) {
  try {
    const [
      prefix,
      encodedInitializationVector,
      encodedPayload,
      encodedAuthTag,
    ] = credential.split(".")

    if (
      prefix !== CREDENTIAL_PREFIX ||
      !encodedInitializationVector ||
      !encodedPayload ||
      !encodedAuthTag
    ) {
      throw new Error("Malformed credential")
    }

    const secret = options.secret ?? getSessionSecret()
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveCredentialKey(secret),
      Buffer.from(encodedInitializationVector, "base64url")
    )
    decipher.setAAD(Buffer.from(CREDENTIAL_PURPOSE))
    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"))

    const decryptedPayload = Buffer.concat([
      decipher.update(Buffer.from(encodedPayload, "base64url")),
      decipher.final(),
    ])
    const payload = credentialPayloadSchema.parse(
      JSON.parse(decryptedPayload.toString("utf8"))
    )

    if (payload.expiresAt <= (options.now ?? Date.now())) {
      throw new Error("Expired credential")
    }

    return payload
  } catch {
    throw new Error("Akasha authorization is invalid or expired.")
  }
}

function deriveCredentialKey(secret: string) {
  return createHash("sha256")
    .update(`${CREDENTIAL_PURPOSE}\0${secret}`)
    .digest()
}
