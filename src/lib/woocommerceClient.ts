export interface LiveOrderItem {
  id: string;
  customerName: string;
  location: string;
  packageName: string;
  image: string;
  createdAt: string;
}

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  address: string;
  deliveryZone: 'inside' | 'outside';
  quantity: number;
  packageName: string;
  unitPrice: number;
}

export interface CreateOrderResult {
  orderCode: string;
  syncedToWooCommerce: boolean;
}

const DEFAULT_PACKAGE_NAME = 'মায়াভরা গিফট প্যাকেজ (১৫ আইটেম)';
const DEFAULT_IMAGE = './assets/aistudio/IMG-20261009-WA0060_6d549559.jpg';
const DEFAULT_WP_ORIGIN = 'https://giftmagicbd.shop';
const LOCAL_ORDERS_KEY = 'gift_magic_submitted_orders_v1';

const STARTER_DEMO_ORDERS: LiveOrderItem[] = [
  {
    id: 'starter-1',
    customerName: 'তাসনিয়া আক্তার',
    location: 'গুলশান, ঢাকা',
    packageName: DEFAULT_PACKAGE_NAME,
    image: DEFAULT_IMAGE,
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: 'starter-2',
    customerName: 'রাফি আহমেদ',
    location: 'উত্তরা, ঢাকা',
    packageName: DEFAULT_PACKAGE_NAME,
    image: DEFAULT_IMAGE,
    createdAt: new Date(Date.now() - 7 * 60_000).toISOString(),
  },
  {
    id: 'starter-3',
    customerName: 'নুসরাত জাহান',
    location: 'আগ্রাবাদ, চট্টগ্রাম',
    packageName: DEFAULT_PACKAGE_NAME,
    image: DEFAULT_IMAGE,
    createdAt: new Date(Date.now() - 14 * 60_000).toISOString(),
  },
];

let detectedPhpBridge = false;

export function isPreviewOrLocalHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app')
  );
}

function getLocalOrders(): LiveOrderItem[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LiveOrderItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order: LiveOrderItem) {
  try {
    const existing = getLocalOrders().filter((item) => item.id !== order.id);
    const updated = [order, ...existing].slice(0, 10);
    window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors in private browsing mode
  }
}

export function getWordPressRestOrigins(): string[] {
  const origins = new Set<string>();
  const configuredOrigin = import.meta.env.VITE_WP_ORIGIN?.trim();

  if (configuredOrigin) {
    origins.add(configuredOrigin.replace(/\/+$/, ''));
  }

  if (typeof window !== 'undefined' && !isPreviewOrLocalHost()) {
    origins.add(window.location.origin.replace(/\/+$/, ''));
  }

  origins.add(DEFAULT_WP_ORIGIN);
  return Array.from(origins);
}

export async function fetchJsonSafely<T>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetches recent orders from:
 * 1) Bundled ./woo-bridge.php (when dist/ is uploaded inside wp-content/landing-page/)
 * 2) Express proxy /api/woocommerce/recent-orders (when running in Node/AI Studio)
 * 3) WordPress REST plugin /wp-json/gift-magic/v1/recent-orders
 */
export async function fetchLiveOrders(): Promise<LiveOrderItem[]> {
  let liveOrders: LiveOrderItem[] = [];

  if (!isPreviewOrLocalHost()) {
    const bridgeData = await fetchJsonSafely<{
      configured?: boolean;
      orders?: LiveOrderItem[];
    }>('./woo-bridge.php?action=recent_orders');

    if (bridgeData?.configured) {
      detectedPhpBridge = true;
      if (Array.isArray(bridgeData.orders)) {
        liveOrders = bridgeData.orders;
      }
    }
  }

  if (liveOrders.length === 0 && isPreviewOrLocalHost()) {
    const apiData = await fetchJsonSafely<{ orders?: LiveOrderItem[] }>(
      '/api/woocommerce/recent-orders'
    );
    if (Array.isArray(apiData?.orders)) {
      liveOrders = apiData.orders;
    }
  }

  if (liveOrders.length === 0) {
    for (const wpOrigin of getWordPressRestOrigins()) {
      const wpData =
        (await fetchJsonSafely<{ orders?: LiveOrderItem[] }>(
          `${wpOrigin}/wp-json/gift-magic/v1/recent-orders`
        )) ??
        (await fetchJsonSafely<{ orders?: LiveOrderItem[] }>(
          `${wpOrigin}/?rest_route=/gift-magic/v1/recent-orders`
        ));

      if (Array.isArray(wpData?.orders) && wpData.orders.length > 0) {
        liveOrders = wpData.orders;
        break;
      }
    }
  }

  const localOrders = getLocalOrders();

  if (liveOrders.length > 0 || localOrders.length > 0) {
    const seen = new Set<string>();
    const merged: LiveOrderItem[] = [];
    for (const item of [...localOrders, ...liveOrders]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged.slice(0, 15);
  }

  return STARTER_DEMO_ORDERS;
}

/**
 * Submits a COD order directly to WooCommerce via:
 * 1) Bundled ./woo-bridge.php?action=create_order (zero-setup on static WordPress dist/)
 * 2) Express /api/woocommerce/orders (in Node/AI Studio preview)
 * 3) WordPress REST plugin /wp-json/gift-magic/v1/orders
 */
export async function submitWooOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResult> {
  const requestInit: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };

  // 1. On real WordPress/cPanel hosting (like public_html/wp-content/landing-page/), try bundled ./woo-bridge.php first
  if (!isPreviewOrLocalHost() || detectedPhpBridge) {
    const bridgeResult = await fetchJsonSafely<{
      orderCode?: string;
      syncedToWooCommerce?: boolean;
      order?: LiveOrderItem;
    }>('./woo-bridge.php?action=create_order', requestInit);

    if (bridgeResult?.syncedToWooCommerce && bridgeResult.orderCode) {
      detectedPhpBridge = true;
      if (bridgeResult.order) {
        saveLocalOrder(bridgeResult.order);
      }
      return {
        orderCode: bridgeResult.orderCode,
        syncedToWooCommerce: true,
      };
    }
  }

  // 2. Try Node/Express proxy (handles WC REST v3 & server-side WP bridge fallback)
  let expressFallbackCode: string | undefined;
  let expressFallbackOrder: LiveOrderItem | undefined;

  if (isPreviewOrLocalHost()) {
    const expressResult = await fetchJsonSafely<{
      orderCode?: string;
      syncedToWooCommerce?: boolean;
      order?: LiveOrderItem;
    }>('/api/woocommerce/orders', requestInit);

    if (expressResult?.syncedToWooCommerce && expressResult.orderCode) {
      if (expressResult.order) {
        saveLocalOrder(expressResult.order);
      }
      return {
        orderCode: expressResult.orderCode,
        syncedToWooCommerce: true,
      };
    }

    expressFallbackCode = expressResult?.orderCode;
    expressFallbackOrder = expressResult?.order;
  }

  // 3. Fallback: Try WordPress REST plugin endpoints (/wp-json/gift-magic/v1/orders or ?rest_route=)
  for (const wpOrigin of getWordPressRestOrigins()) {
    const wpResult =
      (await fetchJsonSafely<{
        orderCode?: string;
        syncedToWooCommerce?: boolean;
        order?: LiveOrderItem;
      }>(`${wpOrigin}/wp-json/gift-magic/v1/orders`, requestInit)) ??
      (await fetchJsonSafely<{
        orderCode?: string;
        syncedToWooCommerce?: boolean;
        order?: LiveOrderItem;
      }>(`${wpOrigin}/?rest_route=/gift-magic/v1/orders`, requestInit));

    if (wpResult?.orderCode) {
      if (wpResult.order) {
        saveLocalOrder(wpResult.order);
      }
      return {
        orderCode: wpResult.orderCode,
        syncedToWooCommerce: Boolean(wpResult.syncedToWooCommerce),
      };
    }
  }

  // 4. Local confirmation fallback if WooCommerce bridge/API is unreachable
  if (expressFallbackCode) {
    if (expressFallbackOrder) {
      saveLocalOrder(expressFallbackOrder);
    }
    return {
      orderCode: expressFallbackCode,
      syncedToWooCommerce: false,
    };
  }

  const fallbackCode = `GM-${Math.floor(1000 + Math.random() * 9000)}`;
  const addressParts = payload.address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const shortLocation =
    addressParts.length > 1
      ? addressParts[addressParts.length - 1]
      : payload.deliveryZone === 'outside'
        ? 'ঢাকার বাইরে'
        : 'ঢাকা';

  saveLocalOrder({
    id: `local-${Date.now()}`,
    customerName: payload.customerName,
    location: shortLocation,
    packageName: payload.packageName,
    image: DEFAULT_IMAGE,
    createdAt: new Date().toISOString(),
  });

  return {
    orderCode: fallbackCode,
    syncedToWooCommerce: false,
  };
}
