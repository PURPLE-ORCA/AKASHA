/// <reference types="vitest/config" />

import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { boneyardPlugin } from "boneyard-js/vite"
import { nitro } from "nitro/vite"

const heroUiProCssPath = `${fileURLToPath(
  new URL("./node_modules/@heroui-pro/react/dist/css/index.css", import.meta.url),
)}?url`

const config = defineConfig(({ mode }) => ({
  resolve: {
    alias: { "@heroui-pro-css": heroUiProCssPath },
    dedupe: ["react", "react-dom"],
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    boneyardPlugin({ routes: ["/?__bones=library"] }),
    tailwindcss(),
    tanstackStart(),
    mode === "test" ? undefined : nitro(),
    viteReact(),
  ],
  test: {
    server: {
      deps: {
        inline: [
          /@heroui/,
          /react-aria-components/,
          /@react-aria/,
          /@react-stately/,
        ],
      },
    },
    setupFiles: ["./src/test/setup.ts"],
  },
}))

export default config
