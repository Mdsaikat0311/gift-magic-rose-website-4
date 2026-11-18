import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, PackageCheck, PhoneCall } from 'lucide-react';
import { formatBDT } from '../data/products';
import { trackMetaEvent } from '../lib/metaPixel';

export interface ConfirmedOrder {
  orderCode: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryZone: 'inside' | 'outside';
  packageId: string;
  packageName: string;
  quantity: number;
  subtotal: number;
  total: number;
}

interface ThankYouPageProps {
  order: ConfirmedOrder;
  onBackToHome: () => void;
}

export function ThankYouPage({ order, onBackToHome }: ThankYouPageProps) {
  const [copied, setCopied] = useState(false);

  // Fire Thank You PageView + Purchase once per orderCode (prevents duplicate tracking on reload)
  useEffect(() => {
    const trackedKey = `gm_purchase_tracked_${order.orderCode}`;
    try {
      if (window.sessionStorage.getItem(trackedKey)) {
        return;
      }
      window.sessionStorage.setItem(trackedKey, '1');
    } catch {
      // Proceed even if sessionStorage is unavailable
    }

    const addressParts = order.address
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const cityForTracking =
      addressParts.length > 1
        ? addressParts[addressParts.length - 1]
        : order.deliveryZone === 'outside'
          ? 'Bangladesh'
          : 'Dhaka';

    void trackMetaEvent({ eventName: 'PageView' });
    void trackMetaEvent({
      eventName: 'Purchase',
      value: order.total,
      currency: 'BDT',
      contentName: order.packageName,
      contentIds: [order.packageId],
      numItems: order.quantity,
      orderId: order.orderCode,
      customerName: order.customerName,
      phone: order.phone,
      city: cityForTracking,
    });
  }, [order]);

  function handleCopyOrderId() {
    navigator.clipboard?.writeText(order.orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      id="thank-you-page"
      className="py-10 pb-16 sm:py-16 sm:pb-24"
    >
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#D8E5D9] bg-white/95 p-6 shadow-md backdrop-blur-md sm:p-10">
          {/* Header Banner */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#E5EFE6] pb-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-[#236B39]" />
              <div>
                <p className="text-xs font-semibold text-[#236B39]">
                  অর্ডার রিসিভড · ক্যাশ অন ডেলিভারি
                </p>
                <h1 className="font-display mt-1 text-2xl font-bold text-[#193B23] sm:text-3xl">
                  ধন্যবাদ! অর্ডার #{order.orderCode} সফলভাবে সম্পন্ন হয়েছে
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-[#355A40]">
                  প্রিয় {order.customerName}, আপনার গিফট প্যাকেজটি সুন্দরভাবে প্যাকিংয়ের জন্য গ্রহণ করা হয়েছে।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyOrderId}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#C6DBC9] bg-[#F7FBF7] px-3.5 py-2 text-xs font-semibold text-[#1E472A] transition-colors hover:bg-[#EAF4EB] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? 'কপি হয়েছে' : 'অর্ডার কোড কপি করুন'}</span>
            </button>
          </div>

          {/* Order Details Grid */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E0D8] bg-[#F7F5F2] p-5 text-sm text-[#27272A]">
              <h2 className="font-display text-base font-bold text-[#141416]">
                ক্রেতার তথ্য
              </h2>
              <div className="mt-3 space-y-2">
                <p>
                  <span className="font-semibold text-[#52525B]">নাম:</span>{' '}
                  {order.customerName}
                </p>
                <p>
                  <span className="font-semibold text-[#52525B]">মোবাইল:</span>{' '}
                  <span className="tabular-nums">{order.phone}</span>
                </p>
                <p>
                  <span className="font-semibold text-[#52525B]">ঠিকানা:</span>{' '}
                  {order.address}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE8DD] bg-[#F7FBF7] p-5 text-sm text-[#1F3A26]">
              <h2 className="font-display text-base font-bold text-[#193B23]">
                অর্ডারের হিসাব
              </h2>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span>
                    {order.packageName} ({formatBDT(order.quantity)}টি)
                  </span>
                  <span className="font-semibold tabular-nums shrink-0">
                    ৳{formatBDT(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>
                    ডেলিভারি চার্জ (
                    {order.deliveryZone === 'inside' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'})
                  </span>
                  <span className="font-semibold text-[#0B6E43] shrink-0">
                    ফ্রি (৳০)
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#DCE8DD] pt-2.5 text-base font-bold text-[#193B23]">
                  <span>সর্বমোট (হাতে পেয়ে পরিশোধ)</span>
                  <span className="tabular-nums">৳{formatBDT(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-[#E5E0D8] bg-[#F7F5F2] p-4 text-xs text-[#3F3F46] sm:grid-cols-2 sm:text-sm">
            <div className="flex items-start gap-2.5">
              <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6E43]" />
              <span>আমাদের প্রতিনিধি শীঘ্রই আপনার মোবাইল নম্বরে কল করে কনফার্ম করবেন।</span>
            </div>
            <div className="flex items-start gap-2.5">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6E43]" />
              <span>অগ্রিম এক টাকাও লাগবে না — ডেলিভারি ম্যানের সামনে দেখে পেমেন্ট করবেন।</span>
            </div>
          </div>

          {/* Back to Landing Page */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0B6E43] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#095936] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>ল্যান্ডিং পেজে ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
