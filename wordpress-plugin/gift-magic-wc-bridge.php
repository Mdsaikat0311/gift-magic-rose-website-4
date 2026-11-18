<?php
/**
 * Plugin Name: Gift Magic WooCommerce & Pixel Bridge
 * Description: Connects the Gift Magic static landing page directly to WooCommerce Orders, Live Recent Orders Toast, and Meta Pixel + Conversions API tracking.
 * Version: 1.1.0
 * Author: Gift Magic
 */

if (!defined('ABSPATH')) {
  exit;
}

/**
 * Ensure proper CORS headers for Gift Magic REST API routes (both preflight OPTIONS & normal responses).
 */
add_action('rest_api_init', function () {
  remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
  add_filter('rest_pre_serve_request', function ($value) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    return $value;
  });

  register_rest_route('gift-magic/v1', '/recent-orders', [
    'methods'             => ['GET', 'OPTIONS'],
    'callback'            => 'gift_magic_get_recent_orders',
    'permission_callback' => '__return_true',
  ]);

  register_rest_route('gift-magic/v1', '/orders', [
    'methods'             => ['POST', 'OPTIONS'],
    'callback'            => 'gift_magic_create_woo_order',
    'permission_callback' => '__return_true',
  ]);

  register_rest_route('gift-magic/v1', '/tracking-config', [
    'methods'             => ['GET', 'OPTIONS'],
    'callback'            => 'gift_magic_get_tracking_config',
    'permission_callback' => '__return_true',
  ]);

  register_rest_route('gift-magic/v1', '/tracking-event', [
    'methods'             => ['POST', 'OPTIONS'],
    'callback'            => 'gift_magic_forward_capi_event',
    'permission_callback' => '__return_true',
  ]);
});

/**
 * WordPress Admin Settings Page (Settings -> Gift Magic) for Pixel ID, CAPI Token & WooCommerce Product ID.
 */
add_action('admin_menu', function () {
  add_options_page(
    'Gift Magic Settings',
    'Gift Magic',
    'manage_options',
    'gift-magic-settings',
    'gift_magic_render_settings_page'
  );
});

add_action('admin_init', function () {
  register_setting('gift_magic_options_group', 'gift_magic_pixel_id', ['sanitize_callback' => 'sanitize_text_field']);
  register_setting('gift_magic_options_group', 'gift_magic_capi_token', ['sanitize_callback' => 'sanitize_text_field']);
  register_setting('gift_magic_options_group', 'gift_magic_test_event_code', ['sanitize_callback' => 'sanitize_text_field']);
  register_setting('gift_magic_options_group', 'gift_magic_wc_product_id', ['sanitize_callback' => 'absint']);
});

function gift_magic_render_settings_page() {
  if (!current_user_can('manage_options')) {
    return;
  }
  ?>
  <div class="wrap">
    <h1>Gift Magic — WooCommerce &amp; Meta Pixel সেটিংস</h1>
    <p>এখানে আপনার Meta Pixel ID ও Conversions API Access Token বসালে আপনার ল্যান্ডিং পেজে ব্রাউজার + সার্ভার-সাইড দুইভাবেই ট্র্যাকিং শুরু হবে।</p>
    <form method="post" action="options.php">
      <?php settings_fields('gift_magic_options_group'); ?>
      <table class="form-table" role="presentation">
        <tr>
          <th scope="row"><label for="gift_magic_pixel_id">Meta Pixel ID</label></th>
          <td>
            <input name="gift_magic_pixel_id" id="gift_magic_pixel_id" type="text" class="regular-text" value="<?php echo esc_attr(get_option('gift_magic_pixel_id', '')); ?>" placeholder="যেমন: 123456789012345" />
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="gift_magic_capi_token">Meta Conversions API Access Token</label></th>
          <td>
            <input name="gift_magic_capi_token" id="gift_magic_capi_token" type="password" class="regular-text" value="<?php echo esc_attr(get_option('gift_magic_capi_token', '')); ?>" placeholder="EAAG..." />
            <p class="description">সার্ভার-সাইড CAPI ইভেন্ট (Purchase, InitiateCheckout, ViewContent) পাঠানোর জন্য ব্যবহৃত হবে।</p>
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="gift_magic_test_event_code">Test Event Code (ঐচ্ছিক)</label></th>
          <td>
            <input name="gift_magic_test_event_code" id="gift_magic_test_event_code" type="text" class="regular-text" value="<?php echo esc_attr(get_option('gift_magic_test_event_code', '')); ?>" placeholder="TEST12345" />
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="gift_magic_wc_product_id">WooCommerce Product ID (ঐচ্ছিক)</label></th>
          <td>
            <input name="gift_magic_wc_product_id" id="gift_magic_wc_product_id" type="number" class="small-text" value="<?php echo esc_attr(get_option('gift_magic_wc_product_id', '')); ?>" />
            <p class="description">খালি রাখলে স্টোরের "মায়াভরা" প্রোডাক্টটি স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।</p>
          </td>
        </tr>
      </table>
      <?php submit_button('সেটিংস সেভ করুন'); ?>
    </form>
  </div>
  <?php
}

function gift_magic_get_recent_orders(WP_REST_Request $request) {
  if ($request->get_method() === 'OPTIONS') {
    return new WP_REST_Response(null, 204);
  }

  if (!function_exists('wc_get_orders')) {
    return new WP_REST_Response(['configured' => false, 'orders' => []], 200);
  }

  $cached = get_transient('gift_magic_recent_orders_v1');
  if (is_array($cached)) {
    return new WP_REST_Response(['configured' => true, 'orders' => $cached], 200);
  }

  $wc_orders = wc_get_orders([
    'limit'   => 15,
    'orderby' => 'date',
    'order'   => 'DESC',
    'type'    => 'shop_order',
    'status'  => ['wc-processing', 'wc-completed', 'wc-on-hold', 'wc-pending'],
  ]);

  $results       = [];
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

  return new WP_REST_Response(['configured' => true, 'orders' => $results], 200);
}

function gift_magic_create_woo_order(WP_REST_Request $request) {
  if ($request->get_method() === 'OPTIONS') {
    return new WP_REST_Response(null, 204);
  }

  if (!function_exists('wc_create_order')) {
    return new WP_REST_Response(['error' => 'WooCommerce active নয়।'], 500);
  }

  $params       = $request->get_json_params();
  $customerName = sanitize_text_field($params['customerName'] ?? '');
  $phone        = sanitize_text_field($params['phone'] ?? '');
  $address      = sanitize_textarea_field($params['address'] ?? '');
  $deliveryZone = sanitize_text_field($params['deliveryZone'] ?? 'inside');
  $quantity     = max(1, min(10, intval($params['quantity'] ?? 1)));
  $packageName  = sanitize_text_field($params['packageName'] ?? 'মায়াভরা গিফট প্যাকেজ (১৫ আইটেম)');
  $unitPrice    = max(1, floatval($params['unitPrice'] ?? 599));

  if ($customerName === '' || $phone === '' || $address === '') {
    return new WP_REST_Response(['error' => 'অনুগ্রহ করে নাম, মোবাইল নম্বর এবং ঠিকানা দিন।'], 400);
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

    return new WP_REST_Response([
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
    ], 201);
  } catch (Throwable $e) {
    return new WP_REST_Response(['error' => 'অর্ডার সেভ করতে সমস্যা হয়েছে।'], 500);
  }
}

function gift_magic_get_pixel_settings() {
  $pixel_id        = trim((string) get_option('gift_magic_pixel_id', ''));
  $access_token    = trim((string) get_option('gift_magic_capi_token', ''));
  $test_event_code = trim((string) get_option('gift_magic_test_event_code', ''));

  if ($pixel_id === '') {
    $pys = get_option('pys_facebook');
    if (is_array($pys)) {
      if (!empty($pys['pixel_id']) && is_array($pys['pixel_id'])) {
        $pixel_id = trim((string) ($pys['pixel_id'][0] ?? ''));
      } elseif (!empty($pys['pixel_id'])) {
        $pixel_id = trim((string) $pys['pixel_id']);
      }
      if ($access_token === '' && !empty($pys['server_access_api_token']) && is_array($pys['server_access_api_token'])) {
        $access_token = trim((string) ($pys['server_access_api_token'][0] ?? ''));
      }
      if ($test_event_code === '' && !empty($pys['test_api_event_code']) && is_array($pys['test_api_event_code'])) {
        $test_event_code = trim((string) ($pys['test_api_event_code'][0] ?? ''));
      }
    }
  }

  if ($pixel_id === '') {
    $fb_wc_pixel = trim((string) get_option('wc_facebook_pixel_id', ''));
    if ($fb_wc_pixel !== '') {
      $pixel_id = $fb_wc_pixel;
    }
  }

  return [
    'pixel_id'        => $pixel_id,
    'access_token'    => $access_token,
    'test_event_code' => $test_event_code,
  ];
}

function gift_magic_get_tracking_config(WP_REST_Request $request) {
  if ($request->get_method() === 'OPTIONS') {
    return new WP_REST_Response(null, 204);
  }

  $settings = gift_magic_get_pixel_settings();
  return new WP_REST_Response(['pixelId' => $settings['pixel_id']], 200);
}

function gift_magic_hash_value($value) {
  return hash('sha256', strtolower(trim((string) $value)));
}

function gift_magic_forward_capi_event(WP_REST_Request $request) {
  if ($request->get_method() === 'OPTIONS') {
    return new WP_REST_Response(null, 204);
  }

  $settings        = gift_magic_get_pixel_settings();
  $pixel_id        = $settings['pixel_id'];
  $access_token    = $settings['access_token'];
  $test_event_code = $settings['test_event_code'];

  if ($pixel_id === '' || $access_token === '') {
    return new WP_REST_Response(['sent' => false], 200);
  }

  $params     = $request->get_json_params();
  $event_name = sanitize_text_field($params['eventName'] ?? '');
  $event_id   = sanitize_text_field($params['eventId'] ?? '');

  if ($event_name === '') {
    return new WP_REST_Response(['sent' => false], 400);
  }

  $user_data = [
    'client_ip_address' => sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? ''),
    'client_user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
    'country'           => [gift_magic_hash_value('bd')],
  ];

  $phone = preg_replace('/\D+/', '', (string) ($params['phone'] ?? ''));
  if ($phone !== '') {
    if (strpos($phone, '0') === 0) {
      $phone = '88' . $phone;
    } elseif (strpos($phone, '880') !== 0) {
      $phone = '880' . $phone;
    }
    $user_data['ph'] = [gift_magic_hash_value($phone)];
  }

  $customer_name = sanitize_text_field($params['customerName'] ?? '');
  if ($customer_name !== '') {
    $parts           = preg_split('/\s+/', $customer_name);
    $user_data['fn'] = [gift_magic_hash_value($parts[0] ?? $customer_name)];
    if (count($parts) > 1) {
      $user_data['ln'] = [gift_magic_hash_value(implode(' ', array_slice($parts, 1)))];
    }
  }

  $city = sanitize_text_field($params['city'] ?? '');
  if ($city !== '') {
    $user_data['ct'] = [gift_magic_hash_value($city)];
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
  return new WP_REST_Response(['sent' => $ok], 200);
}
