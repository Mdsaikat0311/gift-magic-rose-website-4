export interface ProductGalleryImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export interface GiftPackage {
  id: 'combo';
  name: string;
  subtitle: string;
  price: number;
  regularPrice: number;
  image: string;
  shortNote: string;
  highlights: string[];
}

export interface ComboItem {
  number: string;
  name: string;
  detail: string;
}

export const GALLERY_IMAGES: ProductGalleryImage[] = [
  {
    id: 'combo-full',
    src: './assets/aistudio/IMG-20261009-WA0060_6d549559.jpg',
    alt: 'সম্পূর্ণ ১৫ আইটেমের রোমান্টিক গিফট কম্বো বক্স — রোজ রিং, লাভ কার্ড, চকলেট, জুয়েলারি ও টিপ',
    caption: 'সম্পূর্ণ ১৫ আইটেমের রোমান্টিক গিফট কম্বো — মাত্র ৳৫৯৯ (ফ্রি ডেলিভারি)',
  },
  {
    id: 'ring-closeup',
    src: './assets/aistudio/IMG_20260620_165842_dad54ecb.jpg',
    alt: 'লাল ভেলভেট রোজ রিং বক্সের ভেতরে গোল্ডেন স্টোন আংটি',
    caption: 'ভেলভেট রোজ বক্স ও ডায়মন্ড-কাট আংটি',
  },
  {
    id: 'ring-front',
    src: './assets/aistudio/IMG_20260620_165846_80a4cac5.jpg',
    alt: 'হাতে ধরা খোলা লাল গোলাপ রিং বক্স ও আংটি',
    caption: 'হাতে ধরে প্রপোজ বা সারপ্রাইজ দেওয়ার মতো পারফেক্ট সাইজ',
  },
  {
    id: 'ring-stem',
    src: './assets/aistudio/IMG-20260728-WA0057_ee5d712d.jpg',
    alt: 'ডাঁটা ও সবুজ পাতাসহ লাল গোলাপ রিং বক্স',
    caption: 'বাস্তবসম্মত ডাঁটা ও পাতাসহ রোজ রিং বক্স',
  },
];

export const GIFT_PACKAGES: GiftPackage[] = [
  {
    id: 'combo',
    name: 'মায়াভরা গিফট প্যাকেজ (১৫ আইটেম)',
    subtitle: 'আর্টিফিশিয়াল গোলাপ ও ডায়মন্ড কাট রিংসহ মোট ১৫টি আকর্ষণীয় উপহার',
    price: 599,
    regularPrice: 890,
    image: './assets/aistudio/IMG-20261009-WA0060_6d549559.jpg',
    shortNote: 'প্রিয় মানুষকে সারপ্রাইজ দেওয়ার জন্য ১৫টি প্রিমিয়াম উপহারসহ সম্পূর্ণ গিফট প্যাকেজ',
    highlights: [
      'আর্টিফিশিয়াল গোলাপ, ডায়মন্ড কাট রিং, নোসেপিন ও কানের দুলসহ ১৫টি আইটেম',
      'ফ্রি বাবুল প্যাকেজিং — নিরাপদ ও সুরক্ষিত ডেলিভারি',
      'সারাদেশে ডেলিভারি চার্জ একদম ফ্রি (৳০)',
    ],
  },
];

export const COMBO_ITEMS: ComboItem[] = [
  {
    number: '০১',
    name: 'আর্টিফিশিয়াল গোলাপ',
    detail: 'আসল গোলাপের আদলে তৈরি লাল ভেলভেট রিং বক্স গোলাপ',
  },
  {
    number: '০২',
    name: 'ডায়মন্ড কাট রিং',
    detail: 'চকচকে পাথর বসানো গোল্ডেন অ্যাডজাস্টেবল আংটি',
  },
  {
    number: '০৩',
    name: 'ডায়মন্ড কাট নোসেপিন',
    detail: 'আকর্ষণীয় ডিজাইনের সূক্ষ্ম স্টোন নাকফুল',
  },
  {
    number: '০৪',
    name: 'ডায়মন্ড কাট কানের দুল (১ জোড়া)',
    detail: 'মার্জিত ও ঝকঝকে ১ জোড়া স্টাড কানের দুল',
  },
  {
    number: '০৫',
    name: 'প্রিমিয়াম কোয়ালিটির নেকলেস',
    detail: 'গোল্ডেন চেইনের সাথে স্টাইলিশ পেনডেন্ট নেকলেস',
  },
  {
    number: '০৬',
    name: 'প্রিমিয়াম কোয়ালিটির পায়েল',
    detail: 'পায়ে মানানসই সূক্ষ্ম কাজ করা গোল্ডেন পায়েল',
  },
  {
    number: '০৭',
    name: 'একটি কাভেরি মেহেদী',
    detail: 'গাঢ় ও সুন্দর রঙের জন্য অরগানিক কাভেরি মেহেদী কোণ',
  },
  {
    number: '০৮',
    name: 'একটি প্রিমিয়াম ব্রেসলাইট',
    detail: 'হাতে পরার জন্য মুক্তা ও পাথরের স্টাইলিশ ব্রেসলেট',
  },
  {
    number: '০৯',
    name: 'আকর্ষণীয় এক পাতা টিপ (২৫+ পিস)',
    detail: '২৫টির বেশি ফ্যান্সি ডিজাইনার টিপের সম্পূর্ণ পাতা',
  },
  {
    number: '১০',
    name: '২টি ডেইরি মিল্ক',
    detail: 'মিষ্টি মুহূর্তের জন্য ২টি ডেইরি মিল্ক চকলেট বার',
  },
  {
    number: '১১',
    name: 'চিরকুট',
    detail: 'হৃদয়ছোঁয়া ভালোবাসার কথা লেখা বিশেষ চিরকুট কার্ড',
  },
  {
    number: '১২',
    name: 'পাউচ ব্যাগ',
    detail: 'গোল্ডেন জরি মেশ ডিজাইনের সুন্দর গিফট পাউচ',
  },
  {
    number: '১৩',
    name: 'প্রিমিয়াম কোয়ালিটির বক্স',
    detail: 'সব উপহার গুছিয়ে রাখার জন্য আকর্ষণীয় গিফট বক্স',
  },
  {
    number: '১৪',
    name: 'ব্রুজ',
    detail: 'শাড়ি, হিজাব বা পোশাকের সাথে পরার স্টাইলিশ ব্রুজ পিন',
  },
  {
    number: '১৫',
    name: 'বাবুল প্যাকেজিং করা থাকবে (ফ্রি)',
    detail: 'নিরাপদে পৌঁছানোর জন্য সম্পূর্ণ ফ্রি বাবুল র‍্যাপ প্যাকেজিং',
  },
];

export const DELIVERY_RATES = {
  insideDhaka: 0,
  outsideDhaka: 0,
};

export function formatBDT(amount: number): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return amount
    .toLocaleString('en-US')
    .replace(/\d/g, (digit) => bengaliDigits[Number(digit)] ?? digit);
}
