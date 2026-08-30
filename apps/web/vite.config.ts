/// <reference types="vitest/config" />

import { defineConfig } from "vite"
import { realpathSync } from "node:fs"
import { resolve } from "node:path"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { boneyardPlugin } from "boneyard-js/vite"
import { nitro } from "nitro/vite"

const heroUiProCssPath = `${realpathSync(
  resolve("node_modules/@heroui-pro/react/dist/css/index.css"),
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
