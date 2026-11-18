import { useRef, useState } from 'react';
import {
  ArrowDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  COMBO_ITEMS,
  GALLERY_IMAGES,
  GIFT_PACKAGES,
  formatBDT,
} from '../data/products';
import { ProductImage } from './ProductImage';

interface ComboShowcaseProps {
  onQuickOrder: () => void;
}

export function ComboShowcase({ onQuickOrder }: ComboShowcaseProps) {
  const pkg = GIFT_PACKAGES[0];
  const detailPhotos = GALLERY_IMAGES.slice(1);
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function goToPrevSlide() {
    setActiveSlide((prev) =>
      prev === 0 ? detailPhotos.length - 1 : prev - 1
    );
  }

  function goToNextSlide() {
    setActiveSlide((prev) =>
      prev === detailPhotos.length - 1 ? 0 : prev + 1
    );
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX;
    if (typeof endX === 'number') {
      const diff = touchStartX.current - endX;
      if (diff > 40) {
        goToNextSlide();
      } else if (diff < -40) {
        goToPrevSlide();
      }
    }
    touchStartX.current = null;
  }

  return (
    <>
      {/* Band 1: Pure White Uncropped Close-Up Showcase (3-Up on Desktop, Swipe Slider on Mobile) */}
      <section
        id="gallery-strip"
        className="border-b border-[#E5E0D8] bg-white py-12 sm:py-16"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold text-[#0B6E43] sm:text-sm">
              ভেতর ও বাইরের বিস্তারিত ছবি
            </p>
            <h2
              className="font-display mt-1.5 text-2xl font-bold text-[#141416] sm:text-3xl"
              style={{ textWrap: 'balance' }}
            >
              ছবিতে যেমন দেখছেন, হাতে পাবেন ঠিক তেমনই
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#52525B]">
              ভেলভেট রোজ রিং বক্স, জুয়েলারি ও প্রতিটি গিফট আইটেমের আসল ছবি।
            </p>
          </div>

          {/* Mobile Swipeable Uncropped Slider */}
          <div className="mt-8 md:hidden">
            <div
              className="relative overflow-hidden rounded-2xl border border-[#E5E0D8] bg-[#F7F5F2] shadow-sm"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex items-start transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {detailPhotos.map((photo) => (
                  <div key={photo.id} className="w-full shrink-0">
                    <ProductImage
                      src={photo.src}
                      alt={photo.alt}
                      className="block h-auto w-full"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={goToPrevSlide}
                aria-label="আগের ছবি"
                className="absolute top-1/2 left-2.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#141416] shadow-md cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNextSlide}
                aria-label="পরের ছবি"
                className="absolute top-1/2 right-2.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#141416] shadow-md cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-col items-center gap-2 text-center">
              <p className="text-xs font-medium text-[#3F3F46]">
                {detailPhotos[activeSlide]?.caption}
              </p>
              <div className="flex items-center justify-center gap-2">
                {detailPhotos.map((photo, index) => {
                  const isActive = index === activeSlide;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setActiveSlide(index)}
                      aria-label={`ছবি ${formatBDT(index + 1)}`}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        isActive ? 'w-7 bg-[#0B6E43]' : 'w-2.5 bg-[#D4D4D8]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop 3-Column Simultaneous Uncropped Gallery */}
          <div className="mt-10 hidden grid-cols-3 items-start gap-6 md:grid">
            {detailPhotos.map((photo, index) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-[#E5E0D8] bg-[#F7F5F2] shadow-xs"
              >
                <ProductImage
                  src={photo.src}
                  alt={photo.alt}
                  className="block h-auto w-full"
                />
                <figcaption className="border-t border-[#E5E0D8] bg-white px-4 py-3 text-xs font-medium text-[#27272A]">
                  <span className="mr-1.5 font-bold text-[#0B6E43] tabular-nums">
                    ০{formatBDT(index + 1)}.
                  </span>
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Band 2: Warm Mist Bento Highlights + Full 15-Item Checklist */}
      <section id="inside-box" className="bg-[#F7F5F2] py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold text-[#0B6E43] sm:text-sm">
                সম্পূর্ণ ১৫টি উপহারের তালিকা
              </p>
              <h2
                className="font-display mt-1.5 text-2xl font-bold text-[#141416] sm:text-3xl"
                style={{ textWrap: 'balance' }}
              >
                মায়াভরা গিফট প্যাকেজের ভেতরে যা যা পাচ্ছেন
              </h2>
            </div>
            <p className="text-xs font-semibold text-[#141416] sm:text-sm whitespace-nowrap shrink-0">
              মোট ১৫ আইটেম · ফ্রি বাবুল র‍্যাপ
            </p>
          </div>

          {/* Asymmetric 2-Column Highlight Cards */}
          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-[#DFDBD2] bg-white p-6 lg:col-span-7">
              <p className="text-xs font-bold text-[#0B6E43]">
                ০১. প্যাকেজের মূল আকর্ষণ
              </p>
              <h3 className="font-display mt-1.5 text-xl font-bold text-[#141416]">
                ভেলভেট রোজ রিং বক্স ও ম্যাচিং জুয়েলারি সেট
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#52525B]">
                আসল লাল গোলাপের আদলে তৈরি ভেলভেট বক্সের ভেতরে রয়েছে ডায়মন্ড-কাট আংটি।
                সাথে মিলিয়ে থাকছে নোজপিন, ২ জোড়া কানের দুল, স্টাইলিশ নেকলেস, পায়েল ও ব্রেসলেট।
              </p>
            </div>

            <div className="rounded-2xl bg-[#121214] p-6 text-white lg:col-span-5">
              <p className="text-xs font-bold text-[#F0C66B]">
                ০২. চকলেট, মেহেদী ও ভালোবাসার চিরকুট
              </p>
              <h3 className="font-display mt-1.5 text-xl font-bold text-white">
                সারপ্রাইজ দেওয়ার মতো কমপ্লিট কম্বো
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#D4D4D8]">
                ২টি ডেইরি মিল্ক চকলেট, কাভেরি মেহেদী, কপালের টিপ, সুন্দর কলম ও স্পেশাল চিরকুট—যা
                প্রিয় মানুষের জন্য মুহূর্তটিকে স্মরণীয় করে তুলবে।
              </p>
            </div>
          </div>

          {/* Full 15-Item Crisp Emerald Checklist Grid */}
          <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMBO_ITEMS.map((item) => (
              <li
                key={item.number}
                className="flex items-start gap-3 rounded-xl border border-[#E5E0D8] bg-white p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0B6E43]" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-[#0B6E43] tabular-nums">
                      {item.number}.
                    </span>
                    <h3 className="font-sans text-sm font-bold leading-snug text-[#141416]">
                      {item.name}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#52525B]">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Funnel Mid-Page Conversion Bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#0B6E43]/25 bg-white p-6 shadow-xs sm:flex-row sm:px-8">
            <div>
              <p className="font-display text-lg font-bold text-[#141416] sm:text-xl">
                সবগুলো ১৫টি উপহার একসাথে পাচ্ছেন মাত্র ৳{formatBDT(pkg.price)}-এ
              </p>
              <p className="mt-0.5 text-xs text-[#52525B] sm:text-sm">
                অগ্রিম পেমেন্ট ছাড়াই অর্ডার করুন · সারাদেশে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি
              </p>
            </div>
            <button
              type="button"
              onClick={onQuickOrder}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0B6E43] px-6 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#095936] sm:w-auto whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>এখনই অর্ডার করুন</span>
              <ArrowDown className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
