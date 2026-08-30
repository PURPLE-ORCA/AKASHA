/// <reference types="vitest/config" />

import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { boneyardPlugin } from "boneyard-js/vite"
import { nitro } from "nitro/vite"

const config = defineConfig(({ mode }) => ({
  resolve: { dedupe: ["react", "react-dom"], tsconfigPaths: true },
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
