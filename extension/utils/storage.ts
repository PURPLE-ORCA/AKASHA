import { storage } from '#imports';
import type { CaptureDraft } from '@stillroom/contracts';

export const captureDraftStorage = storage.defineItem<CaptureDraft | null>(
  'local:capture-draft',
  { fallback: null },
);

export const selectedFolderStorage = storage.defineItem<string | null>(
  'local:selected-folder',
  { fallback: null },
);
