export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0A0C] text-[#D4D4D8]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div>
          <span className="font-display text-base font-bold text-[#F0C66B]">
            Gift Magic
          </span>
          <span className="mx-2 text-white/30" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-[#A1A1AA] sm:text-sm">
            মায়াভরা ১৫ আইটেমের গিফট প্যাকেজ · সারাদেশে ফ্রি হোম ডেলিভারি
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs text-[#D4D4D8] sm:text-sm">
          <a href="#top" className="hover:text-[#F0C66B] hover:underline">
            শুরুতে যান
          </a>
          <a href="#gallery-strip" className="hover:text-[#F0C66B] hover:underline">
            রোজ রিং গ্যালারি
          </a>
          <a href="#inside-box" className="hover:text-[#F0C66B] hover:underline">
            ১৫টি উপহার
          </a>
          <a href="#order-form" className="hover:text-[#F0C66B] hover:underline">
            অর্ডার ফর্ম
          </a>
          <span className="text-[#71717A]">© ২০২৬ Gift Magic</span>
        </div>
      </div>
    </footer>
  );
}
