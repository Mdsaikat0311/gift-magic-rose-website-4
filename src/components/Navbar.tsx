interface NavbarProps {
  onQuickOrder: () => void;
}

export function Navbar({ onQuickOrder }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121214]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Title */}
        <a
          href="#top"
          className="font-display text-xl font-bold tracking-tight text-[#F0C66B] whitespace-nowrap shrink-0 sm:text-2xl"
        >
          Gift Magic
        </a>

        {/* Zone 2: Single-line Editorial Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#E4E4E7]">
          <a
            href="#top"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F0C66B] hover:underline hover:underline-offset-4"
          >
            প্যাকেজ পরিচিতি
          </a>
          <a
            href="#gallery-strip"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F0C66B] hover:underline hover:underline-offset-4"
          >
            রোজ রিং গ্যালারি
          </a>
          <a
            href="#inside-box"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F0C66B] hover:underline hover:underline-offset-4"
          >
            ১৫টি উপহার
          </a>
          <a
            href="#order-form"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F0C66B] hover:underline hover:underline-offset-4"
          >
            অর্ডার ফর্ম
          </a>
        </nav>

        {/* Zone 3: Single Primary Conversion CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickOrder}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#0B6E43] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#095936] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0C66B] whitespace-nowrap shrink-0 cursor-pointer"
          >
            অর্ডার করুন · ৳৫৯৯
          </button>
        </div>
      </div>
    </header>
  );
}
