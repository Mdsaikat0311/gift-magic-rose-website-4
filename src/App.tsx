/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AmbientBackground } from './components/AmbientBackground';
import { ComboShowcase } from './components/ComboShowcase';
import { Footer } from './components/Footer';
import { HeroGallery } from './components/HeroGallery';
import { Navbar } from './components/Navbar';
import { OrderSection } from './components/OrderSection';
import { RecentOrderToast } from './components/RecentOrderToast';
import { ConfirmedOrder, ThankYouPage } from './components/ThankYouPage';
import { GIFT_PACKAGES } from './data/products';
import { trackMetaEvent } from './lib/metaPixel';

const CONFIRMED_ORDER_STORAGE_KEY = 'gm_last_confirmed_order';

function readConfirmedOrderFromUrl(): ConfirmedOrder | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get('order-received');
  const isThankYou = params.get('thank-you') === '1';

  if (!isThankYou || !orderCode) return null;

  try {
    const raw = window.sessionStorage.getItem(CONFIRMED_ORDER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConfirmedOrder;
      if (parsed?.orderCode === orderCode) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read error
  }

  const pkg = GIFT_PACKAGES[0];
  const value = Number(params.get('value')) || pkg.price;

  return {
    orderCode,
    customerName: 'সম্মানিত ক্রেতা',
    phone: '',
    address: 'সারা বাংলাদেশ (ক্যাশ অন ডেলিভারি)',
    deliveryZone: 'inside',
    packageId: pkg.id,
    packageName: pkg.name,
    quantity: Math.max(1, Math.round(value / pkg.price)),
    subtotal: value,
    total: value,
  };
}

export default function App() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [orderRefreshSignal, setOrderRefreshSignal] = useState(0);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(
    () => readConfirmedOrderFromUrl()
  );

  const selectedPackage = GIFT_PACKAGES[0];

  // Track initial landing PageView + ViewContent when on landing page
  useEffect(() => {
    if (confirmedOrder) return;

    void trackMetaEvent({ eventName: 'PageView' });
    void trackMetaEvent({
      eventName: 'ViewContent',
      value: selectedPackage.price,
      currency: 'BDT',
      contentName: selectedPackage.name,
      contentIds: [selectedPackage.id],
      numItems: 1,
    });
  }, [confirmedOrder, selectedPackage.id, selectedPackage.name, selectedPackage.price]);

  // Support browser back/forward navigation cleanly
  useEffect(() => {
    function handlePopState() {
      setConfirmedOrder(readConfirmedOrderFromUrl());
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function handleQuickOrder() {
    if (confirmedOrder) {
      handleBackToHome();
      window.setTimeout(() => {
        document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }

    void trackMetaEvent({
      eventName: 'InitiateCheckout',
      value: selectedPackage.price,
      currency: 'BDT',
      contentName: selectedPackage.name,
      contentIds: [selectedPackage.id],
      numItems: 1,
    });
    const el = document.getElementById('order-form');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleOrderConfirmed(order: ConfirmedOrder) {
    setOrderRefreshSignal((n) => n + 1);

    try {
      window.sessionStorage.setItem(
        CONFIRMED_ORDER_STORAGE_KEY,
        JSON.stringify(order)
      );
    } catch {
      // Ignore storage write errors
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('thank-you', '1');
    nextUrl.searchParams.set('order-received', order.orderCode);
    nextUrl.searchParams.set('value', String(order.total));
    nextUrl.hash = '';
    window.history.pushState(null, '', nextUrl.toString());

    setConfirmedOrder(order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBackToHome() {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('thank-you');
    cleanUrl.searchParams.delete('order-received');
    cleanUrl.searchParams.delete('value');
    window.history.pushState(null, '', cleanUrl.toString());

    setConfirmedOrder(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackground />

      <Navbar onQuickOrder={handleQuickOrder} />

      <main className="flex-1">
        {confirmedOrder ? (
          <ThankYouPage
            order={confirmedOrder}
            onBackToHome={handleBackToHome}
          />
        ) : (
          <>
            <HeroGallery
              activeImageIndex={activeImageIndex}
              onSelectImage={setActiveImageIndex}
              selectedPackage={selectedPackage}
              onQuickOrder={handleQuickOrder}
            />

            <ComboShowcase onQuickOrder={handleQuickOrder} />

            <OrderSection onOrderConfirmed={handleOrderConfirmed} />
          </>
        )}
      </main>

      <Footer />

      <RecentOrderToast refreshSignal={orderRefreshSignal} />
    </div>
  );
}
