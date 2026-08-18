import { createRoot } from "react-dom/client"
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root"
import type { OpenCapturePanelMessage } from "@/utils/messages"
import App from "./App"
import "./style.css"

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "akasha-capture",
      position: "modal",
      zIndex: 2_147_483_647,
      isolateEvents: true,
      onMount(container) {
        const root = createRoot(container)
        root.render(<App onClose={() => ui.remove()} />)
        return root
      },
      onRemove(root) {
        root?.unmount()
      },
    })

    const openPanel = (message: OpenCapturePanelMessage) => {
      if (message?.type !== "akasha:open-capture") return
      if (!ui.mounted) ui.mount()
      return Promise.resolve({ ok: true })
    }

    browser.runtime.onMessage.addListener(openPanel)
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(openPanel))
  },
})
