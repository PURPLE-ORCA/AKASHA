import type { CaptureOutcome } from "@akasha/contracts"

export function createCaptureResultNotification(outcome: CaptureOutcome, title: string) {
  return outcome === "already_saved"
    ? {
        message: `${title} was saved before, so no copy was added.`,
        title: "Already in Akasha",
      }
    : {
        message: `${title} is now in your library.`,
        title: "Saved to Akasha",
      }
}
