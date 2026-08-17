/// <reference types="vitest/config" />

import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { dedupe: ["react", "react-dom"], tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
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
})

export default config
