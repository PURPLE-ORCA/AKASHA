import { describe, expect, it } from "vitest"

import { createCaptureOutboxJob, prepareDeliveryAttempt, scheduleDeliveryRetry } from "./outbox"

const draft = {
  kind: "image" as const,
  pageUrl: "https://example.com/inspiration",
  sourceUrl: "https://example.com/image.jpg",
  title: "Reference",
}

describe("capture outbox", () => {
  it("creates a stable capture identity before delivery", () => {
    const job = createCaptureOutboxJob(draft, "folder", {
      captureId: "8e967b1b-8420-47a1-b116-20f37725a443",
      now: 1_000,
    })

    expect(job).toMatchObject({
      attempt: 0,
      captureId: "8e967b1b-8420-47a1-b116-20f37725a443",
      createdAt: 1_000,
      nextAttemptAt: 1_000,
      status: "pending",
    })
  })

  it("records an attempt before network delivery", () => {
    const job = createCaptureOutboxJob(draft, "folder", { now: 1_000 })
    const prepared = prepareDeliveryAttempt(job, 2_000)

    expect(prepared.attempt).toBe(1)
    expect(prepared.nextAttemptAt).toBe(62_000)
  })

  it("stops automatic retries after the fourth attempt", () => {
    const job = {
      ...createCaptureOutboxJob(draft, "folder", { now: 1_000 }),
      attempt: 4,
    }

    expect(scheduleDeliveryRetry(job, "Unavailable", 2_000)).toMatchObject({
      errorMessage: "Unavailable",
      status: "failed",
    })
  })
})
