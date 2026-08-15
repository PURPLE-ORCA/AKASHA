import { createCaptureDraft } from '@/utils/capture';
import { captureDraftStorage } from '@/utils/storage';

const CAPTURE_MENU_ID = 'stillroom-capture-media';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      contexts: ['image', 'video'],
      id: CAPTURE_MENU_ID,
      title: 'Save to Stillroom',
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CAPTURE_MENU_ID) {
      return;
    }

    const draft = createCaptureDraft(info, tab?.title);

    if (!draft) {
      await showCaptureNotification(
        'Could not capture this item',
        'Open the original image or video and try again.',
      );
      return;
    }

    await captureDraftStorage.setValue(draft);

    try {
      await browser.action.openPopup();
    } catch {
      await showCaptureNotification(
        'Ready to save',
        'Open Stillroom Capture to choose a folder.',
      );
    }
  });
});

async function showCaptureNotification(title: string, message: string) {
  await browser.notifications.create({
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    message,
    title,
    type: 'basic',
  });
}
