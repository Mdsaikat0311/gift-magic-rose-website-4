import {
  ArrowDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  GALLERY_IMAGES,
  GiftPackage,
  formatBDT,
} from '../data/products';
import { ProductImage } from './ProductImage';

interface HeroGalleryProps {
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  selectedPackage: GiftPackage;
  onQuickOrder: () => void;
}

export function HeroGallery({
  activeImageIndex,
  onSelectImage,
  selectedPackage,
  onQuickOrder,
}: HeroGalleryProps) {
  const activeImage = GALLERY_IMAGES[activeImageIndex] ?? GALLERY_IMAGES[0];
  const savings = selectedPackage.regularPrice - selectedPackage.price;
  const discountPercent = Math.round(
    (savings / selectedPackage.regularPrice) * 100
  );

  function handlePrevImage() {
    onSelectImage(
      activeImageIndex === 0 ? GALLERY_IMAGES.length - 1 : activeImageIndex - 1
    );
  }

  function handleNextImage() {
    onSelectImage(
      activeImageIndex === GALLERY_IMAGES.length - 1 ? 0 : activeImageIndex + 1
    );
  }

  return (
    <section id="top" className="relative">
      {/* Dark Obsidian Funnel Hero Stage */}
      <div className="bg-[#121214] pt-8 pb-12 text-white sm:pt-12 sm:pb-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          {/* Centered High-Impact Funnel Headline */}
          <div className="mx-auto max-w-[820px] text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#F0C66B] sm:text-sm">
              <span>মায়াভরা গিফট প্যাকেজ</span>
              <span aria-hidden="true">·</span>
              <span>সম্পূর্ণ ১৫ আইটেম কম্বো</span>
              <span aria-hidden="true">·</span>
              <span>সারাদেশে ফ্রি হোম ডেলিভারি</span>
            </div>

            <h1
              className="font-display mt-3 text-[28px] font-bold leading-[1.24] text-white sm:text-4xl lg:text-[46px]"
              style={{ textWrap: 'balance' }}
            >
              প্রিয় মানুষের মুখে হাসি ফোটাতে ১৫ আইটেমের পূর্ণাঙ্গ গিফট বক্স
            </h1>

            <p className="mx-auto mt-3.5 max-w-[60ch] text-sm leading-relaxed text-[#D4D4D8] sm:text-base">
              ভেলভেট গোলাপ রিং বক্স, ডায়মন্ড-কাট রিং, নোজপিন, কানের দুল, নেকলেস, পায়েল,
              কাভেরি মেহেদী, ২টি ডেইরি মিল্ক ও চিরকুটসহ সাজানো সম্পূর্ণ কম্বো।
            </p>

            {/* Centered Offer Price Strip + Single Dominant CTA */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-sm text-[#D4D4D8]">
                <span className="line-through tabular-nums text-[#8E8E98]">
                  রেগুলার মূল্য ৳{formatBDT(selectedPackage.regularPrice)}
                </span>
                <span className="text-2xl font-bold text-[#F0C66B] tabular-nums sm:text-3xl">
                  অফার মূল্য ৳{formatBDT(selectedPackage.price)}
                </span>
                <span className="font-semibold text-[#6EE7B7] tabular-nums">
                  ({formatBDT(discountPercent)}% ছাড় · ৳{formatBDT(savings)} সাশ্রয়)
                </span>
              </div>

              <button
                type="button"
                onClick={onQuickOrder}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0B6E43] px-8 py-3.5 text-base font-bold text-white shadow-lg transition-colors duration-150 hover:bg-[#095936] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0C66B] sm:w-auto whitespace-nowrap cursor-pointer"
              >
                <span>এখনই অর্ডার করতে ক্লিক করুন · ৳{formatBDT(selectedPackage.price)}</span>
                <ArrowDown className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Wide Funnel Product Stage Card */}
          <div className="mt-9 grid grid-cols-1 items-start gap-7 rounded-2xl border border-white/12 bg-[#1A191D] p-4 sm:mt-11 sm:p-6 lg:grid-cols-12 lg:gap-8">
            {/* Gallery Column (Uncropped Original Photo + Thumbnails) */}
            <div id="gallery" className="flex flex-col gap-3 lg:col-span-7">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#100F12]">
                <ProductImage
                  src={activeImage.src}
                  alt={activeImage.alt}
                  priority
                  className="block h-auto w-full"
                />

                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="আগের ছবি"
                  className="absolute top-1/2 left-2.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="পরের ছবি"
                  className="absolute top-1/2 right-2.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="bg-black/75 px-4 py-2.5 text-xs font-medium text-[#F4F4F5] sm:text-sm">
                  {activeImage.caption}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {GALLERY_IMAGES.map((img, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => onSelectImage(index)}
                      aria-label={img.caption}
                      className={`aspect-square overflow-hidden rounded-lg border p-0.5 transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#F0C66B] bg-[#F0C66B]/15'
                          : 'border-white/15 bg-[#121214] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ProductImage
                        src={img.src}
                        alt={img.alt}
                        className="h-full w-full rounded-md object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Funnel Offer Summary Panel */}
            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#222126] p-5 sm:p-6 lg:col-span-5">
              <div>
                <p className="text-xs font-semibold text-[#F0C66B]">
                  প্যাকেজ সামারি · ক্যাশ অন ডেলিভারি
                </p>
                <h2 className="font-display mt-1.5 text-xl font-bold text-white sm:text-2xl">
                  অর্ডার করলে যা যা পাচ্ছেন
                </h2>

                <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                  <li className="flex items-start gap-2.5 py-3 text-sm text-[#E4E4E7]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE7B7]" />
                    <span>
                      ভেলভেট রোজ রিং বক্স ও জুয়েলারিসহ মোট ১৫টি ম্যাচিং উপহার
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 py-3 text-sm text-[#E4E4E7]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE7B7]" />
                    <span>
                      বক্স সুরক্ষায় এক্সট্রা ফ্রি বাবুল র‍্যাপ প্যাকেজিং
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 py-3 text-sm text-[#E4E4E7]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE7B7]" />
                    <span>
                      সারা বাংলাদেশে হোম ডেলিভারি সম্পূর্ণ ফ্রি (৳০)
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 py-3 text-sm text-[#E4E4E7]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE7B7]" />
                    <span>
                      অগ্রিম এক টাকাও নেই — হাতে পেয়ে দেখে টাকা পরিশোধ করবেন
                    </span>
                  </li>
                </ul>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-[#D4D4D8]">
                    <dt>১৫ আইটেমের প্যাকেজ মূল্য</dt>
                    <dd className="font-bold text-white tabular-nums">
                      ৳{formatBDT(selectedPackage.price)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-[#D4D4D8]">
                    <dt>বাবুল প্যাকেজিং ও ডেলিভারি</dt>
                    <dd className="font-bold text-[#6EE7B7]">ফ্রি (৳০)</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={onQuickOrder}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#F0C66B] px-5 py-3 text-sm font-bold text-[#121214] transition-colors hover:bg-[#E5B856] whitespace-nowrap cursor-pointer"
                >
                  <span>অর্ডার ফর্ম পূরণ করুন</span>
                  <ArrowDown className="h-4 w-4 shrink-0" />
                </button>
                <p className="mt-2 text-center text-xs text-[#A1A1AA]">
                  ঢাকায় ২৪–৪৮ ঘণ্টা · ঢাকার বাইরে ২–৩ দিনে ডেলিভারি
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crisp White 3-Column Trust Strip Below Hero */}
      <div className="border-b border-[#E5E0D8] bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 divide-y divide-[#ECE8E1] px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3.5 py-5 sm:pr-6">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B6E43]" />
            <div>
              <h2 className="font-sans text-sm font-bold text-[#141416]">
                সারাদেশে ডেলিভারি চার্জ ফ্রি (৳০)
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
                ঢাকা ও ঢাকার বাইরে কোনো অতিরিক্ত ডেলিভারি খরচ ছাড়াই হোম ডেলিভারি।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 py-5 sm:px-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B6E43]" />
            <div>
              <h2 className="font-sans text-sm font-bold text-[#141416]">
                পণ্য দেখে মূল্য পরিশোধ
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
                অর্ডার করতে ১ টাকাও অগ্রিম লাগবে না; হাতে পেয়ে নিশ্চিত হয়ে পেমেন্ট।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 py-5 sm:pl-6">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#0B6E43]" />
            <div>
              <h2 className="font-sans text-sm font-bold text-[#141416]">
                অরিজিনাল ১৫ উপহারের নিশ্চয়তা
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#52525B]">
                ছবিতে যা দেখছেন ভেতরে হুবহু সেই ১৫টি উপহার ও বাবুল প্যাকেজিং থাকছে।
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
