import crypto from 'crypto';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

export interface LiveOrderItem {
  id: string;
  customerName: string;
  location: string;
  packageName: string;
  image: string;
  createdAt: string;
}

interface WooBilling {
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
}

interface WooLineItem {
  name?: string;
  image?: {
    src?: string;
  };
}

interface WooOrderResponse {
  id: number;
  status?: string;
  date_created?: string;
  date_created_gmt?: string;
  billing?: WooBilling;
  line_items?: WooLineItem[];
}

const DEFAULT_PRODUCT_IMAGE = './assets/aistudio/IMG-20261009-WA0060_6d549559.jpg';
const DEFAULT_PACKAGE_NAME = 'মায়াভরা গিফট প্যাকেজ (১৫ আইটেম)';
const CACHE_TTL_MS = 45_000;

let cachedWooOrders: LiveOrderItem[] = [];
let cachedAt = 0;
let cachedProductId: number | null = null;
const submittedOrders: LiveOrderItem[] = [];

function getWooConfig() {
  const rawUrl = process.env.WOOCOMMERCE_URL?.trim() || 'https://giftmagicbd.shop';
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim() || '';
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim() || '';
  const productIdRaw = process.env.WOOCOMMERCE_PRODUCT_ID?.trim() || '';

  const baseUrl = rawUrl.replace(/\/+$/, '');
  const isPlaceholder =
    !baseUrl ||
    !consumerKey ||
    !consumerSecret ||
    consumerKey === 'MY_WOOCOMMERCE_CONSUMER_KEY' ||
    consumerSecret === 'MY_WOOCOMMERCE_CONSUMER_SECRET';

  const parsedProductId = Number(productIdRaw);

  return {
    configured: !isPlaceholder,
    baseUrl,
    consumerKey,
    consumerSecret,
    productId: Number.isFinite(parsedProductId) && parsedProductId > 0 ? parsedProductId : null,
  };
}

function getMetaConfig() {
  const pixelId =
    process.env.META_PIXEL_ID?.trim() ||
    process.env.VITE_META_PIXEL_ID?.trim() ||
    '';
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim() || '';
  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim() || '';

  return {
    pixelId,
    accessToken,
    testEventCode,
    capiConfigured: Boolean(pixelId && accessToken),
  };
}

function getAuthHeader(consumerKey: string, consumerSecret: string): string {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;
}

function sha256Normalized(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizeBangladeshPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return `880${digits}`;
}

function mapWooOrder(order: WooOrderResponse): LiveOrderItem {
  const firstName = order.billing?.first_name?.trim() || '';
  const lastName = order.billing?.last_name?.trim() || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const city = order.billing?.city?.trim() || '';
  const state = order.billing?.state?.trim() || '';
  const locationParts = [city, state && state !== city ? state : ''].filter(Boolean);

  const firstItem = order.line_items?.[0];
  const createdAt = order.date_created_gmt
    ? `${order.date_created_gmt.replace(/Z$/, '')}Z`
    : order.date_created || new Date().toISOString();

  return {
    id: `wc-${order.id}`,
    customerName: fullName || 'সম্মানিত ক্রেতা',
    location: locationParts.join(', '),
    packageName: firstItem?.name?.trim() || DEFAULT_PACKAGE_NAME,
    image: firstItem?.image?.src || DEFAULT_PRODUCT_IMAGE,
    createdAt,
  };
}

async function fetchWooOrdersFromApi(force = false): Promise<{
  configured: boolean;
  orders: LiveOrderItem[];
}> {
  const config = getWooConfig();
  const now = Date.now();

  if (!force && now - cachedAt < CACHE_TTL_MS && cachedWooOrders.length > 0) {
    return { configured: true, orders: cachedWooOrders };
  }

  // Primary: WooCommerce REST API v3 with Consumer Key & Secret
  if (config.configured) {
    try {
      const endpoint = `${config.baseUrl}/wp-json/wc/v3/orders?per_page=15&orderby=date&order=desc`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: getAuthHeader(config.consumerKey, config.consumerSecret),
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const rawOrders = (await response.json()) as WooOrderResponse[];
        if (Array.isArray(rawOrders)) {
          const excludedStatuses = new Set(['trash', 'cancelled', 'failed']);
          const mapped = rawOrders
            .filter((order) => !order.status || !excludedStatuses.has(order.status))
            .map(mapWooOrder);
          cachedWooOrders = mapped;
          cachedAt = now;
          return { configured: true, orders: mapped };
        }
      }
    } catch (error) {
      console.error('WooCommerce REST v3 check error:', error);
    }
  }

  // Fallback: WordPress Gift Magic Bridge endpoint on configured WooCommerce URL
  if (config.baseUrl) {
    try {
      const bridgeRes = await fetch(`${config.baseUrl}/wp-json/gift-magic/v1/recent-orders`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (bridgeRes.ok) {
        const data = (await bridgeRes.json()) as {
          configured?: boolean;
          orders?: LiveOrderItem[];
        };
        if (Array.isArray(data.orders)) {
          cachedWooOrders = data.orders;
          cachedAt = now;
          return { configured: Boolean(data.configured ?? true), orders: data.orders };
        }
      }
    } catch {
      // Bridge plugin not installed yet on remote WordPress site
    }
  }

  return { configured: config.configured, orders: cachedWooOrders };
}

async function resolveWooProductId(
  baseUrl: string,
  authHeader: string,
  configuredProductId: number | null
): Promise<number | null> {
  if (configuredProductId) return configuredProductId;
  if (cachedProductId) return cachedProductId;

  try {
    const response = await fetch(`${baseUrl}/wp-json/wc/v3/products?per_page=1&status=publish`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const products = (await response.json()) as Array<{ id?: number }>;
    const firstId = products?.[0]?.id;
    if (typeof firstId === 'number' && firstId > 0) {
      cachedProductId = firstId;
      return firstId;
    }
    return null;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Fetch recent orders from WooCommerce (plus any orders placed directly on this page)
  app.get('/api/woocommerce/recent-orders', async (_req, res) => {
    const { configured, orders: wooOrders } = await fetchWooOrdersFromApi();
    const seenIds = new Set<string>();
    const combined: LiveOrderItem[] = [];

    for (const item of [...submittedOrders, ...wooOrders]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }

    res.json({
      configured,
      orders: combined.slice(0, 15),
    });
  });

  // Create a COD order (syncs to WooCommerce via REST v3 or WordPress Bridge)
  app.post('/api/woocommerce/orders', async (req, res) => {
    const {
      customerName,
      phone,
      address,
      deliveryZone,
      quantity,
      packageName,
      unitPrice,
    } = req.body ?? {};

    const cleanName = typeof customerName === 'string' ? customerName.trim() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanAddress = typeof address === 'string' ? address.trim() : '';
    const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
    const price = Number(unitPrice) || 599;
    const pkgName =
      typeof packageName === 'string' && packageName.trim()
        ? packageName.trim()
        : DEFAULT_PACKAGE_NAME;

    if (!cleanName || !cleanPhone || !cleanAddress) {
      res.status(400).json({ error: 'অনুগ্রহ করে নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন।' });
      return;
    }

    const zoneLabel = deliveryZone === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকা';
    const addressParts = cleanAddress.split(',').map((s) => s.trim()).filter(Boolean);
    const shortLocation =
      addressParts.length > 1
        ? addressParts[addressParts.length - 1]
        : zoneLabel;

    let orderCode = `GM-${Math.floor(1000 + Math.random() * 9000)}`;
    let liveOrderId = `local-${Date.now()}`;
    let syncedToWooCommerce = false;

    const config = getWooConfig();
    if (config.configured) {
      try {
        const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);
        const productId = await resolveWooProductId(
          config.baseUrl,
          authHeader,
          config.productId
        );

        const nameParts = cleanName.split(/\s+/);
        const firstName = nameParts[0] || cleanName;
        const lastName = nameParts.slice(1).join(' ');

        const payload: Record<string, unknown> = {
          status: 'processing',
          payment_method: 'cod',
          payment_method_title: 'Cash on Delivery',
          set_paid: false,
          billing: {
            first_name: firstName,
            last_name: lastName,
            address_1: cleanAddress,
            city: shortLocation,
            country: 'BD',
            phone: cleanPhone,
          },
          shipping: {
            first_name: firstName,
            last_name: lastName,
            address_1: cleanAddress,
            city: shortLocation,
            country: 'BD',
          },
          line_items: productId
            ? [
                {
                  product_id: productId,
                  quantity: qty,
                  subtotal: String(price * qty),
                  total: String(price * qty),
                },
              ]
            : [
                {
                  name: pkgName,
                  quantity: qty,
                  subtotal: String(price * qty),
                  total: String(price * qty),
                },
              ],
          shipping_lines: [
            {
              method_id: 'free_shipping',
              method_title: 'সারা দেশে ফ্রি ডেলিভারি',
              total: '0',
            },
          ],
        };

        const wcResponse = await fetch(`${config.baseUrl}/wp-json/wc/v3/orders`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });

        if (wcResponse.ok) {
          const created = (await wcResponse.json()) as WooOrderResponse;
          if (created?.id) {
            orderCode = `WC-${created.id}`;
            liveOrderId = `wc-${created.id}`;
            syncedToWooCommerce = true;
            cachedAt = 0;
          }
        } else {
          const errText = await wcResponse.text().catch(() => '');
          console.error('WooCommerce order creation failed:', wcResponse.status, errText);
        }
      } catch (err) {
        console.error('WooCommerce order creation error:', err);
      }
    } else if (config.baseUrl) {
      // Fallback: forward server-side to WordPress Bridge plugin if active on remote WooCommerce domain
      try {
        const bridgeRes = await fetch(`${config.baseUrl}/wp-json/gift-magic/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            customerName: cleanName,
            phone: cleanPhone,
            address: cleanAddress,
            deliveryZone,
            quantity: qty,
            packageName: pkgName,
            unitPrice: price,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (bridgeRes.ok) {
          const bridgeData = (await bridgeRes.json()) as {
            orderCode?: string;
            syncedToWooCommerce?: boolean;
            order?: LiveOrderItem;
          };
          if (bridgeData.orderCode) {
            orderCode = bridgeData.orderCode;
            liveOrderId = bridgeData.order?.id || liveOrderId;
            syncedToWooCommerce = Boolean(bridgeData.syncedToWooCommerce);
            cachedAt = 0;
          }
        }
      } catch {
        // Remote WordPress bridge not active yet
      }
    }

    const newLiveOrder: LiveOrderItem = {
      id: liveOrderId,
      customerName: cleanName,
      location: shortLocation,
      packageName: pkgName,
      image: DEFAULT_PRODUCT_IMAGE,
      createdAt: new Date().toISOString(),
    };

    submittedOrders.unshift(newLiveOrder);
    if (submittedOrders.length > 15) {
      submittedOrders.pop();
    }

    res.status(201).json({
      orderCode,
      syncedToWooCommerce,
      order: newLiveOrder,
    });
  });

  // Public Pixel ID config (never exposes CAPI secret token)
  app.get('/api/tracking/config', async (_req, res) => {
    const meta = getMetaConfig();
    if (meta.pixelId) {
      res.json({ pixelId: meta.pixelId });
      return;
    }

    const woo = getWooConfig();
    if (woo.baseUrl) {
      try {
        const wpRes = await fetch(`${woo.baseUrl}/wp-json/gift-magic/v1/tracking-config`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        });
        if (wpRes.ok) {
          const wpData = (await wpRes.json()) as { pixelId?: string };
          if (wpData.pixelId) {
            res.json({ pixelId: wpData.pixelId });
            return;
          }
        }
      } catch {
        // Remote WP config not active
      }
    }

    res.json({ pixelId: '' });
  });

  // Server-side Meta Conversions API (CAPI) proxy
  app.post('/api/tracking/event', async (req, res) => {
    const meta = getMetaConfig();
    const body = req.body ?? {};
    const eventName = typeof body.eventName === 'string' ? body.eventName.trim() : '';
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';

    if (!eventName) {
      res.status(400).json({ sent: false });
      return;
    }

    if (!meta.capiConfigured) {
      const woo = getWooConfig();
      if (woo.baseUrl) {
        try {
          const wpRes = await fetch(`${woo.baseUrl}/wp-json/gift-magic/v1/tracking-event`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
          });
          if (wpRes.ok) {
            const wpData = await wpRes.json();
            res.json(wpData);
            return;
          }
        } catch {
          // Ignore remote fallback error
        }
      }
      res.json({ sent: false });
      return;
    }

    try {
      const userData: Record<string, unknown> = {
        client_ip_address:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          undefined,
        client_user_agent: req.headers['user-agent'] || undefined,
        country: [sha256Normalized('bd')],
      };

      if (typeof body.phone === 'string' && body.phone.trim()) {
        const normalizedPhone = normalizeBangladeshPhone(body.phone);
        if (normalizedPhone) userData.ph = [sha256Normalized(normalizedPhone)];
      }
      if (typeof body.customerName === 'string' && body.customerName.trim()) {
        const parts = body.customerName.trim().split(/\s+/);
        if (parts[0]) userData.fn = [sha256Normalized(parts[0])];
        if (parts.length > 1) userData.ln = [sha256Normalized(parts.slice(1).join(' '))];
      }
      if (typeof body.city === 'string' && body.city.trim()) {
        userData.ct = [sha256Normalized(body.city)];
      }

      const capiPayload: Record<string, unknown> = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId || undefined,
            action_source: 'website',
            event_source_url:
              typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
            user_data: userData,
            custom_data: {
              currency: typeof body.currency === 'string' ? body.currency : 'BDT',
              value: Number(body.value) || undefined,
              content_name:
                typeof body.contentName === 'string' ? body.contentName : undefined,
              content_ids: Array.isArray(body.contentIds)
                ? body.contentIds
                : undefined,
              content_type: 'product',
              num_items: Number(body.numItems) || undefined,
              order_id: typeof body.orderId === 'string' ? body.orderId : undefined,
            },
          },
        ],
      };

      if (meta.testEventCode) {
        capiPayload.test_event_code = meta.testEventCode;
      }

      const capiRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(meta.pixelId)}/events?access_token=${encodeURIComponent(meta.accessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capiPayload),
          signal: AbortSignal.timeout(6000),
        }
      );

      res.json({ sent: capiRes.ok });
    } catch (error) {
      console.error('Meta CAPI forwarding error:', error);
      res.json({ sent: false });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Gift Magic server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
