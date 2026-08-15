import { defineConfig } from "wxt"

const driveScope = "https://www.googleapis.com/auth/drive.file"
const googleClientId = process.env.WXT_GOOGLE_CLIENT_ID

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Stillroom Capture",
    description: "Capture visual inspiration into your Stillroom library.",
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
