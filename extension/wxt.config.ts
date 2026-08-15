import { defineConfig } from "wxt"

const driveScope = "https://www.googleapis.com/auth/drive.file"
const googleClientId = process.env.WXT_GOOGLE_CLIENT_ID
const extensionKey =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjO1vMpQeepjTCuJpNXNqRAtT3r1JIAA7cF/vC7JncEY8taIaNAm8N3A6BUGrj/TVOGKQFM1+3LPT0RjLeLcOuxLLeRDgbKcT0D5zei89MbAvBwb+wNTwDKrgVBLkBE60LIpbu1vVmYx3cdIiPYWJ9BTuDk9PwLcIjHUsm+ActagDSkGVb1ar+jEm/c/szJX7pxaG5CV8gmPvlNfjpOQGxYIlHtenRaMzCEiyyGwoD4NaA4hmSu4QkrMRWlePewkscGws2lpHeQKsIh45XoxgZcaEPALKLKhnvOog91OcpqVHmKjmcGmVPfbfoDl6xvdn015n8JwqAdSt+SI49E8ynQIDAQAB"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Stillroom Capture",
    description: "Capture visual inspiration into your Stillroom library.",
    key: extensionKey,
    permissions: ["contextMenus", "identity", "notifications", "storage"],
    host_permissions: ["<all_urls>"],
    ...(googleClientId
      ? {
          oauth2: {
            client_id: googleClientId,
            scopes: [driveScope],
          },
        }
      : {}),
  },
})
