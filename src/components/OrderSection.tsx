import { FormEvent, useRef, useState } from 'react';
import { Lock, Minus, Plus, ShieldCheck } from 'lucide-react';
import {
  GIFT_PACKAGES,
  formatBDT,
} from '../data/products';
import { trackMetaEvent } from '../lib/metaPixel';
import { submitWooOrder } from '../lib/woocommerceClient';
import { ProductImage } from './ProductImage';
import type { ConfirmedOrder } from './ThankYouPage';

interface OrderSectionProps {
  onOrderConfirmed: (order: ConfirmedOrder) => void;
}

export function OrderSection({ onOrderConfirmed }: OrderSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('inside');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const checkoutTrackedRef = useRef(false);

  const selectedPkg = GIFT_PACKAGES[0];
  const subtotal = selectedPkg.price * quantity;
  const total = subtotal;

  function markInitiateCheckout() {
    if (checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    void trackMetaEvent({
      eventName: 'InitiateCheckout',
      value: total,
      currency: 'BDT',
      contentName: selectedPkg.name,
      contentIds: [selectedPkg.id],
      numItems: quantity,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    const trimmedName = customerName.trim();
    const trimmedPhone = phone.trim().replace(/[\s-]/g, '');
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setErrorMessage('অনুগ্রহ করে আপনার পুরো নাম লিখুন।');
      return;
    }

    if (!/^(\+?88)?01[3-9]\d{8}$/.test(trimmedPhone)) {
      setErrorMessage('অনুগ্রহ করে সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      return;
    }

    if (trimmedAddress.length < 8) {
      setErrorMessage('অনুগ্রহ করে ডেলিভারির সম্পূর্ণ ঠিকানা (বাসা, রোড, এলাকা/জেলা) লিখুন।');
      return;
    }

    setIsSubmitting(true);
    let finalOrderCode = `GM-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const result = await submitWooOrder({
        customerName: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        deliveryZone,
        quantity,
        packageName: selectedPkg.name,
        unitPrice: selectedPkg.price,
      });
      finalOrderCode = result.orderCode;
    } finally {
      setIsSubmitting(false);
    }

    const orderPayload: ConfirmedOrder = {
      orderCode: finalOrderCode,
      customerName: trimmedName,
      phone: trimmedPhone,
      address: trimmedAddress,
      deliveryZone,
      packageId: selectedPkg.id,
      packageName: selectedPkg.name,
      quantity,
      subtotal,
      total,
    };

    setCustomerName('');
    setPhone('');
    setAddress('');
    setQuantity(1);
    setErrorMessage('');
    onOrderConfirmed(orderPayload);
  }

  return (
    <section
      id="order-form"
      className="bg-[#121214] py-14 pb-20 text-white sm:py-18 sm:pb-24"
    >
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        {/* Centered Funnel Checkout Heading */}
        <div className="text-center">
          <p className="text-xs font-semibold text-[#F0C66B] sm:text-sm">
            ১০০% ক্যাশ অন ডেলিভারি · সারাদেশে ডেলিভারি ফ্রি
          </p>
          <h2
            className="font-display mt-2 text-2xl font-bold text-white sm:text-4xl"
            style={{ textWrap: 'balance' }}
          >
            অর্ডার কনফার্ম করতে ফর্মটি পূরণ করুন
          </h2>
          <p className="mt-2 text-sm text-[#D4D4D8]">
            কোনো অগ্রিম টাকা লাগবে না — পণ্য হাতে পেয়ে ডেলিভারি ম্যানের সামনে দেখে পেমেন্ট করুন।
          </p>
        </div>

        {/* Single-Flow Crisp White Funnel Checkout Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 overflow-hidden rounded-2xl bg-white text-[#141416] shadow-2xl"
        >
          {/* Step 1: Package Selection & Quantity Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D8] bg-[#F7F5F2] px-5 py-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#DFDBD2] bg-white">
                <ProductImage
                  src={selectedPkg.image}
                  alt={selectedPkg.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0B6E43]">
                  নির্বাচিত প্যাকেজ (১৫ আইটেম)
                </p>
                <p className="truncate text-sm font-bold text-[#141416] sm:text-base">
                  {selectedPkg.name}
                </p>
                <p className="text-xs text-[#52525B] tabular-nums">
                  প্যাকেজ মূল্য: ৳{formatBDT(selectedPkg.price)} · বাবুল র‍্যাপ ফ্রি
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-[#52525B]">পরিমাণ:</span>
              <div className="flex items-center gap-1 rounded-lg border border-[#D4D4D8] bg-white p-1">
                <button
                  type="button"
                  aria-label="পরিমাণ কমান"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#141416] hover:bg-[#F4F4F5] cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[26px] text-center text-sm font-bold text-[#141416] tabular-nums">
                  {formatBDT(quantity)}
                </span>
                <button
                  type="button"
                  aria-label="পরিমাণ বাড়ান"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#141416] hover:bg-[#F4F4F5] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Customer Information Fields */}
          <div className="space-y-5 p-5 sm:p-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="customer-name"
                  className="mb-1.5 block text-sm font-bold text-[#141416]"
                >
                  ১. আপনার নাম <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onFocus={markInitiateCheckout}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="আপনার পুরো নাম লিখুন"
                  className="w-full rounded-xl border border-[#D4D4D8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#141416] placeholder:text-[#71717A] focus:border-[#0B6E43] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-1.5 block text-sm font-bold text-[#141416]"
                >
                  ২. মোবাইল নম্বর <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={phone}
                  onFocus={markInitiateCheckout}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full rounded-xl border border-[#D4D4D8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#141416] tabular-nums placeholder:text-[#71717A] focus:border-[#0B6E43] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="customer-address"
                className="mb-1.5 block text-sm font-bold text-[#141416]"
              >
                ৩. ডেলিভারির সম্পূর্ণ ঠিকানা <span className="text-[#B91C1C]">*</span>
              </label>
              <textarea
                id="customer-address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="বাসা নম্বর, রোড, এলাকা, থানা ও জেলার নাম লিখুন"
                className="w-full rounded-xl border border-[#D4D4D8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#141416] placeholder:text-[#71717A] focus:border-[#0B6E43] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-bold text-[#141416]">
                ৪. ডেলিভারি এলাকা বেছে নিন (সকল এলাকায় ফ্রি)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryZone('inside')}
                  className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
                    deliveryZone === 'inside'
                      ? 'border-[#0B6E43] bg-[#0B6E43]/10 text-[#0B6E43]'
                      : 'border-[#D4D4D8] bg-[#FAFAFA] text-[#3F3F46] hover:border-[#A1A1AA]'
                  }`}
                >
                  ঢাকার ভেতরে (ফ্রি ৳০)
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryZone('outside')}
                  className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
                    deliveryZone === 'outside'
                      ? 'border-[#0B6E43] bg-[#0B6E43]/10 text-[#0B6E43]'
                      : 'border-[#D4D4D8] bg-[#FAFAFA] text-[#3F3F46] hover:border-[#A1A1AA]'
                  }`}
                >
                  ঢাকার বাইরে (ফ্রি ৳০)
                </button>
              </div>
            </div>

            {/* Step 3: Live Receipt Summary */}
            <div className="rounded-xl border border-[#E5E0D8] bg-[#F7F5F2] p-4 sm:p-5">
              <div className="space-y-2 text-sm text-[#3F3F46]">
                <div className="flex justify-between">
                  <span>
                    {selectedPkg.name} × {formatBDT(quantity)}
                  </span>
                  <span className="font-semibold text-[#141416] tabular-nums">
                    ৳{formatBDT(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    ডেলিভারি চার্জ (
                    {deliveryZone === 'inside' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}) ও বাবুল র‍্যাপ
                  </span>
                  <span className="font-bold text-[#0B6E43]">ফ্রি (৳০)</span>
                </div>
                <div className="flex justify-between border-t border-[#DED8CE] pt-2.5 text-base font-bold text-[#141416]">
                  <span>সর্বমোট পরিশোধযোগ্য (হাতে পেয়ে দেবেন)</span>
                  <span className="text-xl text-[#0B6E43] tabular-nums">
                    ৳{formatBDT(total)}
                  </span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B91C1C] sm:text-sm"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#0B6E43] px-6 py-4 text-base font-bold text-white shadow-md transition-colors duration-150 hover:bg-[#095936] disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6E43] cursor-pointer sm:text-lg"
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span>
                {isSubmitting
                  ? 'অর্ডার কনফার্ম হচ্ছে...'
                  : `অর্ডার কনফার্ম করুন · ৳${formatBDT(total)}`}
              </span>
            </button>

            <div className="flex items-center justify-center gap-2 text-center text-xs text-[#52525B]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#0B6E43]" />
              <span>
                অর্ডার কনফার্ম করলে সরাসরি আমাদের স্টোরে জমা হবে এবং নতুন কনফার্মেশন পেজ ওপেন হবে।
              </span>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
