<?php
/**
 * Gift Magic — Direct WooCommerce & Meta Pixel Bridge (Bundled inside dist/)
 * Automatically connects a static dist/ upload inside any WordPress folder
 * (e.g. public_html/wp-content/landing-page/) directly to WooCommerce & Meta CAPI.
 */

@ini_set('display_errors', '0');
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  ob_end_clean();
  http_response_code(204);
  exit;
}

if (!defined('WP_USE_THEMES')) {
  define('WP_USE_THEMES', false);
}

$wp_load_path = null;
for ($depth = 1; $depth <= 6; $depth++) {
  $candidate = dirname(__DIR__, $depth) . '/wp-load.php';
  if (file_exists($candidate)) {
    $wp_load_path = $candidate;
    break;
  }
}

if (!$wp_load_path) {
  ob_end_clean();
  http_response_code(404);
  echo json_encode([
    'configured' => false,
    'error'      => 'wp-load.php পাওয়া যায়নি।',
  ]);
  exit;
}

require_once $wp_load_path;
ob_end_clean();

$action = isset($_GET['action']) ? sanitize_key($_GET['action']) : '';

function gm_bridge_get_pixel_settings() {
  $pixel_id = trim((string) get_option('gift_magic_pixel_id', ''));
  $capi_token = trim((string) get_option('gift_magic_capi_token', ''));
  $test_code = trim((string) get_option('gift_magic_test_event_code', ''));

  // Auto-detect Pixel ID & Token from PixelYourSite if Gift Magic settings are empty
  if ($pixel_id === '') {
    $pys = get_option('pys_facebook');
    if (is_array($pys)) {
      if (!empty($pys['pixel_id']) && is_array($pys['pixel_id'])) {
        $pixel_id = trim((string) ($pys['pixel_id'][0] ?? ''));
      } elseif (!empty($pys['main_pixel_enabled']) && !empty($pys['pixel_id'])) {
        $pixel_id = trim((string) $pys['pixel_id']);
      }
      if ($capi_token === '' && !empty($pys['server_access_api_token']) && is_array($pys['server_access_api_token'])) {
        $capi_token = trim((string) ($pys['server_access_api_token'][0] ?? ''));
      }
      if ($test_code === '' && !empty($pys['test_api_event_code']) && is_array($pys['test_api_event_code'])) {
        $test_code = trim((string) ($pys['test_api_event_code'][0] ?? ''));
      }
    }
  }

  // Auto-detect from Facebook for WooCommerce plugin
  if ($pixel_id === '') {
    $fb_wc_pixel = trim((string) get_option('wc_facebook_pixel_id', ''));
    if ($fb_wc_pixel !== '') {
      $pixel_id = $fb_wc_pixel;
    }
  }

  return [
    'pixel_id'   => $pixel_id,
    'capi_token' => $capi_token,
    'test_code'  => $test_code,
  ];
}

function gm_bridge_hash($value) {
  return hash('sha256', strtolower(trim((string) $value)));
}

if ($action === 'recent_orders') {
  if (!function_exists('wc_get_orders')) {
    echo json_encode(['configured' => false, 'orders' => []]);
    exit;
  }

  $cached = get_transient('gift_magic_recent_orders_v1');
  if (is_array($cached)) {
    echo json_encode(['configured' => true, 'orders' => $cached]);
    exit;
  }

  $wc_orders = wc_get_orders([
    'limit'   => 15,
    'orderby' => 'date',
    'order'   => 'DESC',
    'type'    => 'shop_order',
    'status'  => ['wc-processing', 'wc-completed', 'wc-on-hold', 'wc-pending'],
  ]);

  $results = [];
  $default_image = './assets/aistudio/IMG-20261009-WA0060_6d549559.jpg';

  foreach ($wc_orders as $order) {
    if (!$order instanceof WC_Order) {
      continue;
    }

    $full_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    $city      = trim((string) $order->get_billing_city());
    $state     = trim((string) $order->get_billing_state());
    $location  = ($state && $state !== $city) ? trim($city . ', ' . $state, ', ') : $city;

    $package_name = 'মায়াভরা গিফট প্যাকেজ (১৫ আইটেম)';
    $image_url    = $default_image;

    foreach ($order->get_items() as $item) {
      if ($item instanceof WC_Order_Item_Product) {
        $item_name = trim((string) $item->get_name());
        if ($item_name !== '') {
          $package_name = $item_name;
        }
        $product = $item->get_product();
        if ($product && $product->get_image_id()) {
          $thumb = wp_get_attachment_image_url($product->get_image_id(), 'thumbnail');
          if ($thumb) {
            $image_url = $thumb;
          }
        }
        break;
      }
    }

    $date_obj   = $order->get_date_created();
    $created_at = $date_obj ? gmdate('c', $date_obj->getTimestamp()) : gmdate('c');

    $results[] = [
      'id'           => 'wc-' . $order->get_id(),
      'customerName' => $full_name !== '' ? $full_name : 'সম্মানিত ক্রেতা',
      'location'     => $location,
      'packageName'  => $package_name,
      'image'        => $image_url,
      'createdAt'    => $created_at,
    ];
  }

  set_transient('gift_magic_recent_orders_v1', $results, 30);
  echo json_encode(['configured' => true, 'orders' => $results]);
  exit;
}

if ($action === 'create_order') {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
  }

  if (!function_exists('wc_create_order')) {
    http_response_code(500);
    echo json_encode(['error' => 'WooCommerce active নয়।']);
    exit;
  }

  $raw    = file_get_contents('php://input');
  $params = json_decode($raw ?: '{}', true);
  if (!is_array($params)) {
    $params = [];
  }

  $customerName = sanitize_text_field($params['customerName'] ?? '');
  $phone        = sanitize_text_field($params['phone'] ?? '');
  $address      = sanitize_textarea_field($params['address'] ?? '');
  $deliveryZone = sanitize_text_field($params['deliveryZone'] ?? 'inside');
  $quantity     = max(1, min(10, intval($params['quantity'] ?? 1)));
  $packageName  = sanitize_text_field($params['packageName'] ?? 'মায়াভরা গিফট প্যাকেজ (১৫ আইটেম)');
  $unitPrice    = max(1, floatval($params['unitPrice'] ?? 599));

  if ($customerName === '' || $phone === '' || $address === '') {
    http_response_code(400);
    echo json_encode(['error' => 'অনুগ্রহ করে নাম, মোবাইল নম্বর এবং ঠিকানা দিন।']);
    exit;
  }

  $name_parts = preg_split('/\s+/', $customerName);
  $first_name = $name_parts[0] ?? $customerName;
  $last_name  = count($name_parts) > 1 ? implode(' ', array_slice($name_parts, 1)) : '';

  $address_parts = array_values(array_filter(array_map('trim', explode(',', $address))));
  $city = count($address_parts) > 1
    ? $address_parts[count($address_parts) - 1]
    : ($deliveryZone === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকা');

  try {
    if (function_exists('wc_load_cart') && function_exists('WC') && WC() && !WC()->cart) {
      wc_load_cart();
    }

    $order = new WC_Order();
    $order->set_created_via('checkout');
    $order->set_currency('BDT');
    $order->set_status('pending');

    $configured_product_id = absint(get_option('gift_magic_wc_product_id', 0));
    $product               = $configured_product_id > 0 ? wc_get_product($configured_product_id) : null;

    if (!$product) {
      $matched_products = wc_get_products([
        'limit'  => 1,
        'status' => 'publish',
        'type'   => 'simple',
        's'      => 'মায়াভরা',
      ]);
      if (empty($matched_products)) {
        $matched_products = wc_get_products([
          'limit'  => 1,
          'status' => 'publish',
          'type'   => 'simple',
        ]);
      }
      if (!empty($matched_products) && $matched_products[0] instanceof WC_Product) {
        $product = $matched_products[0];
      }
    }

    $added_item = false;
    if ($product instanceof WC_Product && $product->is_purchasable()) {
      $item_id = $order->add_product($product, $quantity);
      if ($item_id && !is_wp_error($item_id)) {
        $line_item = $order->get_item($item_id);
        if ($line_item instanceof WC_Order_Item_Product) {
          $line_item->set_name($packageName);
          $line_item->set_subtotal($unitPrice * $quantity);
          $line_item->set_total($unitPrice * $quantity);
          $added_item = true;
        }
      }
    }

    if (!$added_item) {
      $item = new WC_Order_Item_Product();
      $item->set_name($packageName);
      $item->set_quantity($quantity);
      $item->set_subtotal($unitPrice * $quantity);
      $item->set_total($unitPrice * $quantity);
      $order->add_item($item);
    }

    $shipping = new WC_Order_Item_Shipping();
    $shipping->set_method_title('সারা দেশে ফ্রি ডেলিভারি');
    $shipping->set_method_id('free_shipping');
    $shipping->set_total(0);
    $order->add_item($shipping);

    $billing = [
      'first_name' => $first_name,
      'last_name'  => $last_name,
      'address_1'  => $address,
      'city'       => $city,
      'country'    => 'BD',
      'phone'      => $phone,
    ];

    $order->set_address($billing, 'billing');
    $order->set_address($billing, 'shipping');
    $order->set_payment_method('cod');
    $order->set_payment_method_title('Cash on Delivery');
    $order->calculate_totals();

    // Save first with complete billing + items so woocommerce_new_order receives full data
    $order_id = $order->save();

    $posted_data = [
      'billing_first_name'  => $first_name,
      'billing_last_name'   => $last_name,
      'billing_address_1'   => $address,
      'billing_city'        => $city,
      'billing_country'     => 'BD',
      'billing_phone'       => $phone,
      'shipping_first_name' => $first_name,
      'shipping_last_name'  => $last_name,
      'shipping_address_1'  => $address,
      'shipping_city'       => $city,
      'shipping_country'    => 'BD',
      'payment_method'      => 'cod',
    ];

    // Trigger native checkout lifecycle hooks so AFI (Google Sheets) & courier/sync plugins fire cleanly
    $ob_level = ob_get_level();
    ob_start();
    try {
      try {
        do_action('woocommerce_checkout_order_processed', $order_id, $posted_data, $order);
      } catch (Throwable $hook_err) {
      }

      $order->update_status('processing', 'Gift Magic Landing Page থেকে নতুন অর্ডার এসেছে।', true);

      try {
        do_action('woocommerce_thankyou', $order_id);
      } catch (Throwable $hook_err) {
      }
    } finally {
      while (ob_get_level() > $ob_level) {
        ob_end_clean();
      }
    }

    delete_transient('gift_magic_recent_orders_v1');

    http_response_code(201);
    echo json_encode([
      'orderCode'           => 'WC-' . $order->get_id(),
      'syncedToWooCommerce' => true,
      'order'               => [
        'id'           => 'wc-' . $order->get_id(),
        'customerName' => $customerName,
        'location'     => $city,
        'packageName'  => $packageName,
        'image'        => './assets/aistudio/IMG-20261009-WA0060_6d549559.jpg',
        'createdAt'    => gmdate('c'),
      ],
    ]);
    exit;
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'অর্ডার সেভ করতে সমস্যা হয়েছে।']);
    exit;
  }
}

if ($action === 'tracking_config') {
  $settings = gm_bridge_get_pixel_settings();
  echo json_encode(['pixelId' => $settings['pixel_id']]);
  exit;
}

if ($action === 'tracking_event') {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['sent' => false]);
    exit;
  }

  $settings = gm_bridge_get_pixel_settings();
  $pixel_id        = $settings['pixel_id'];
  $access_token    = $settings['capi_token'];
  $test_event_code = $settings['test_code'];

  if ($pixel_id === '' || $access_token === '') {
    echo json_encode(['sent' => false]);
    exit;
  }

  $raw    = file_get_contents('php://input');
  $params = json_decode($raw ?: '{}', true);
  if (!is_array($params)) {
    $params = [];
  }

  $event_name = sanitize_text_field($params['eventName'] ?? '');
  $event_id   = sanitize_text_field($params['eventId'] ?? '');

  if ($event_name === '') {
    http_response_code(400);
    echo json_encode(['sent' => false]);
    exit;
  }

  $user_data = [
    'client_ip_address' => sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? ''),
    'client_user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
    'country'           => [gm_bridge_hash('bd')],
  ];

  $phone = preg_replace('/\D+/', '', (string) ($params['phone'] ?? ''));
  if ($phone !== '') {
    if (strpos($phone, '0') === 0) {
      $phone = '88' . $phone;
    } elseif (strpos($phone, '880') !== 0) {
      $phone = '880' . $phone;
    }
    $user_data['ph'] = [gm_bridge_hash($phone)];
  }

  $customer_name = sanitize_text_field($params['customerName'] ?? '');
  if ($customer_name !== '') {
    $parts           = preg_split('/\s+/', $customer_name);
    $user_data['fn'] = [gm_bridge_hash($parts[0] ?? $customer_name)];
    if (count($parts) > 1) {
      $user_data['ln'] = [gm_bridge_hash(implode(' ', array_slice($parts, 1)))];
    }
  }

  $city = sanitize_text_field($params['city'] ?? '');
  if ($city !== '') {
    $user_data['ct'] = [gm_bridge_hash($city)];
  }

  $custom_data = array_filter([
    'currency'     => sanitize_text_field($params['currency'] ?? 'BDT'),
    'value'        => isset($params['value']) ? floatval($params['value']) : null,
    'content_name' => sanitize_text_field($params['contentName'] ?? ''),
    'content_ids'  => is_array($params['contentIds'] ?? null) ? array_map('sanitize_text_field', $params['contentIds']) : null,
    'content_type' => 'product',
    'num_items'    => isset($params['numItems']) ? intval($params['numItems']) : null,
    'order_id'     => sanitize_text_field($params['orderId'] ?? ''),
  ], function ($v) {
    return $v !== null && $v !== '';
  });

  $payload = [
    'data' => [
      [
        'event_name'       => $event_name,
        'event_time'       => time(),
        'event_id'         => $event_id,
        'action_source'    => 'website',
        'event_source_url' => esc_url_raw($params['sourceUrl'] ?? ''),
        'user_data'        => $user_data,
        'custom_data'      => $custom_data,
      ],
    ],
  ];

  if ($test_event_code !== '') {
    $payload['test_event_code'] = $test_event_code;
  }

  $response = wp_remote_post(
    'https://graph.facebook.com/v21.0/' . rawurlencode($pixel_id) . '/events?access_token=' . rawurlencode($access_token),
    [
      'headers' => ['Content-Type' => 'application/json'],
      'body'    => wp_json_encode($payload),
      'timeout' => 6,
    ]
  );

  $ok = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
  echo json_encode(['sent' => $ok]);
  exit;
}

http_response_code(400);
echo json_encode(['error' => 'Invalid action']);
