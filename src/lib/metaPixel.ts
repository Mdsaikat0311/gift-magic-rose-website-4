import {
  fetchJsonSafely,
  getWordPressRestOrigins,
  isPreviewOrLocalHost,
} from './woocommerceClient';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

let initializedPixelId = '';
let initPromise: Promise<string> | null = null;

function injectMetaPixelScript(pixelId: string) {
  if (!pixelId || typeof window === 'undefined' || initializedPixelId === pixelId) {
    return;
  }

  if (!window.fbq) {
    const fbqShim = function (...args: unknown[]) {
      const fn = fbqShim as unknown as {
        callMethod?: (...a: unknown[]) => void;
        queue: unknown[][];
      };
      if (fn.callMethod) {
        fn.callMethod(...args);
      } else {
        fn.queue.push(args);
      }
    } as unknown as {
      (...args: unknown[]): void;
      push: (...args: unknown[]) => void;
      loaded: boolean;
      version: string;
      queue: unknown[][];
    };

    fbqShim.push = (...args: unknown[]) => fbqShim(...args);
    fbqShim.loaded = true;
    fbqShim.version = '2.0';
    fbqShim.queue = [];
    window.fbq = fbqShim;
    if (!window._fbq) window._fbq = fbqShim;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  window.fbq('init', pixelId);
  initializedPixelId = pixelId;
}

export function initMetaPixel(): Promise<string> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let pixelId = import.meta.env.VITE_META_PIXEL_ID?.trim() || '';

    // 1. On static WordPress dist upload, read auto-detected Pixel ID from bundled ./woo-bridge.php
    if (!pixelId && !isPreviewOrLocalHost()) {
      const bridgeConfig = await fetchJsonSafely<{ pixelId?: string }>(
        './woo-bridge.php?action=tracking_config'
      );
      if (bridgeConfig?.pixelId) {
        pixelId = bridgeConfig.pixelId.trim();
      }
    }

    // 2. Express proxy (Node / AI Studio)
    if (!pixelId && isPreviewOrLocalHost()) {
      const apiConfig = await fetchJsonSafely<{ pixelId?: string }>('/api/tracking/config');
      if (apiConfig?.pixelId) {
        pixelId = apiConfig.pixelId.trim();
      }
    }

    // 3. WordPress REST plugin fallback
    if (!pixelId) {
      for (const wpOrigin of getWordPressRestOrigins()) {
        const wpConfig =
          (await fetchJsonSafely<{ pixelId?: string }>(
            `${wpOrigin}/wp-json/gift-magic/v1/tracking-config`
          )) ??
          (await fetchJsonSafely<{ pixelId?: string }>(
            `${wpOrigin}/?rest_route=/gift-magic/v1/tracking-config`
          ));
        if (wpConfig?.pixelId) {
          pixelId = wpConfig.pixelId.trim();
          break;
        }
      }
    }

    if (pixelId) {
      injectMetaPixelScript(pixelId);
    }

    return pixelId;
  })();

  return initPromise;
}

export interface TrackingEventParams {
  eventName: 'PageView' | 'ViewContent' | 'InitiateCheckout' | 'Purchase';
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
  numItems?: number;
  orderId?: string;
  customerName?: string;
  phone?: string;
  city?: string;
}

function createEventId(eventName: string, orderId?: string): string {
  if (orderId) return `${eventName.toLowerCase()}-${orderId}`;
  return `${eventName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function trackMetaEvent(params: TrackingEventParams) {
  const pixelId = await initMetaPixel();
  const eventId = createEventId(params.eventName, params.orderId);

  // 1. Push standard GTM dataLayer event if GTM is present
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: params.eventName,
      event_id: eventId,
      value: params.value,
      currency: params.currency ?? 'BDT',
      order_id: params.orderId,
      content_name: params.contentName,
      content_ids: params.contentIds,
      num_items: params.numItems,
    });
  }

  // 2. Browser Pixel (fbq) with matching eventID for CAPI deduplication
  if (pixelId && typeof window !== 'undefined' && window.fbq) {
    if (params.eventName === 'PageView') {
      window.fbq('track', 'PageView', {}, { eventID: eventId });
    } else {
      window.fbq(
        'track',
        params.eventName,
        {
          value: params.value,
          currency: params.currency ?? 'BDT',
          content_name: params.contentName,
          content_ids: params.contentIds,
          content_type: 'product',
          num_items: params.numItems,
          order_id: params.orderId,
        },
        { eventID: eventId }
      );
    }
  }

  // 2. Server-side Conversions API (CAPI)
  const capiBody = JSON.stringify({
    eventName: params.eventName,
    eventId,
    sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    value: params.value,
    currency: params.currency ?? 'BDT',
    contentName: params.contentName,
    contentIds: params.contentIds,
    numItems: params.numItems,
    orderId: params.orderId,
    customerName: params.customerName,
    phone: params.phone,
    city: params.city,
  });

  const capiHeaders = { 'Content-Type': 'application/json' };

  if (!isPreviewOrLocalHost()) {
    const bridgeSent = await fetchJsonSafely<{ sent?: boolean }>(
      './woo-bridge.php?action=tracking_event',
      {
        method: 'POST',
        headers: capiHeaders,
        body: capiBody,
      }
    );
    if (bridgeSent) return;
  }

  if (isPreviewOrLocalHost()) {
    const expressSent = await fetchJsonSafely<{ sent?: boolean }>('/api/tracking/event', {
      method: 'POST',
      headers: capiHeaders,
      body: capiBody,
    });
    if (expressSent) return;
  }

  for (const wpOrigin of getWordPressRestOrigins()) {
    const wpSent =
      (await fetchJsonSafely<{ sent?: boolean }>(
        `${wpOrigin}/wp-json/gift-magic/v1/tracking-event`,
        {
          method: 'POST',
          headers: capiHeaders,
          body: capiBody,
        }
      )) ??
      (await fetchJsonSafely<{ sent?: boolean }>(
        `${wpOrigin}/?rest_route=/gift-magic/v1/tracking-event`,
        {
          method: 'POST',
          headers: capiHeaders,
          body: capiBody,
        }
      ));
    if (wpSent) break;
  }
}
