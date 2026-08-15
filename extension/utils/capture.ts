import { captureDraftSchema } from '@stillroom/contracts';
import type { CaptureDraft } from '@stillroom/contracts';

type CaptureContext = {
  mediaType?: string;
  pageUrl?: string;
  srcUrl?: string;
};

export function createCaptureDraft(
  context: CaptureContext,
  tabTitle?: string,
): CaptureDraft | null {
  if (!context.pageUrl || !context.srcUrl) {
    return null;
  }

  const kind = context.mediaType === 'video' ? 'video' : 'image';
  const sourceHost = new URL(context.pageUrl).hostname.replace(/^www\./, '');

  return captureDraftSchema.parse({
    kind,
    pageUrl: context.pageUrl,
    sourceUrl: context.srcUrl,
    thumbnailUrl: kind === 'image' ? context.srcUrl : undefined,
    title: tabTitle?.trim() || `Saved from ${sourceHost}`,
  });
}
