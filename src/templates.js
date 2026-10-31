// Starter content per business type, so the assistant can answer from minute one.
// Owners edit everything afterwards in "Business info".

export const TEMPLATES = {
  restaurant: {
    ar: {
      description: 'مطعم بيقدّم أكل طازة يومياً، توصيل واستلام من الفرع.',
      hours: 'يومياً من 12 الظهر لحد 2 بعد نص الليل',
      currency: 'جنيه',
      products: 'بيتزا مارجريتا - صغير 120 / وسط 150 / كبير 190\nبيتزا سوبر سوبريم - صغير 160 / وسط 210 / كبير 250\nبرجر كلاسيك - 140 (مع بطاطس)\nبرجر دبل تشيز - 185 (مع بطاطس)\nسلطة سيزر - 95\nبطاطس محمرة - 45\nمشروبات غازية - 25\nعصير فريش - 50',
      policies: 'التوصيل خلال 45 دقيقة تقريباً، ورسوم التوصيل 20 جنيه.\nالحد الأدنى للطلب 100 جنيه.\nالدفع كاش عند الاستلام أو فودافون كاش أو إنستاباي.\nلو فيه أي مشكلة في الطلب بنبدّله أو نرجّع الفلوس.',
    },
    en: {
      description: 'A restaurant serving fresh food daily, with delivery and pickup.',
      hours: 'Every day, 12 pm to 2 am',
      currency: 'USD',
      products: 'Margherita pizza - small 9 / medium 12 / large 15\nSupreme pizza - small 11 / medium 14 / large 18\nClassic burger - 10 (with fries)\nDouble cheeseburger - 13 (with fries)\nCaesar salad - 8\nFries - 4\nSoft drinks - 2\nFresh juice - 4',
      policies: 'Delivery takes about 45 minutes; delivery fee is 2.\nMinimum order is 10.\nPay cash on delivery or by card on delivery.\nIf anything is wrong with your order we replace it or refund it.',
    },
    calendar: false,
  },
  clinic: {
    ar: {
      description: 'عيادة أسنان: كشف، تنظيف، حشو، تقويم وتبييض.',
      hours: 'السبت للخميس من 11 الصبح لحد 9 بالليل، الجمعة إجازة',
      currency: 'جنيه',
      products: 'كشف - 300\nتنظيف جير وتلميع - 600\nحشو عادي - 700\nحشو عصب - من 1500\nتبييض بالليزر - 3500\nاستشارة تقويم - 400',
      policies: 'الحجز بميعاد مسبق. لو هتتأخر أكتر من 15 دقيقة كلّمنا.\nالإلغاء قبلها بـ 24 ساعة على الأقل.\nبنقبل كاش وفيزا وإنستاباي.\nالأسعار تقريبية والسعر النهائي بيتحدد بعد الكشف.',
    },
    en: {
      description: 'Dental clinic: check-ups, cleaning, fillings, braces and whitening.',
      hours: 'Saturday to Thursday, 11 am to 9 pm. Closed on Friday.',
      currency: 'USD',
      products: 'Check-up - 30\nCleaning and polishing - 60\nFilling - 70\nRoot canal - from 150\nLaser whitening - 350\nBraces consultation - 40',
      policies: 'Appointments only. Call us if you will be more than 15 minutes late.\nCancel at least 24 hours ahead.\nWe accept cash and cards.\nPrices are estimates; the final price is set after the check-up.',
    },
    calendar: { open: '11:00', close: '21:00', closedDays: [5], slotMinutes: 30 },
  },
  salon: {
    ar: {
      description: 'صالون تجميل للسيدات: شعر، بشرة، مانيكير وباديكير، ومكياج مناسبات.',
      hours: 'يومياً من 12 الظهر لحد 10 بالليل، الثلاثاء إجازة',
      currency: 'جنيه',
      products: 'قص وسشوار - 350\nصبغة كاملة - من 900\nبروتين - من 1800\nتنظيف بشرة - 500\nمانيكير وباديكير - 400\nمكياج سواريه - 1200\nمكياج عروسة - بالحجز والاتفاق',
      policies: 'الحجز بميعاد مسبق، وعربون 20% لمكياج العرايس.\nالإلغاء قبلها بـ 12 ساعة.\nالدفع كاش أو إنستاباي.',
    },
    en: {
      description: 'Beauty salon: hair, skincare, nails and event make-up.',
      hours: 'Every day, 12 pm to 10 pm. Closed on Tuesday.',
      currency: 'USD',
      products: 'Cut and blow-dry - 35\nFull colour - from 90\nKeratin - from 180\nFacial - 50\nManicure and pedicure - 40\nEvening make-up - 120\nBridal make-up - by appointment',
      policies: 'Appointments only; 20% deposit for bridal make-up.\nCancel at least 12 hours ahead.\nCash or card.',
    },
    calendar: { open: '12:00', close: '22:00', closedDays: [2], slotMinutes: 60 },
  },
  store: {
    ar: {
      description: 'متجر أونلاين لملابس كاجوال رجالي وحريمي، شحن لكل المحافظات.',
      hours: 'خدمة العملاء يومياً من 10 الصبح لحد 10 بالليل',
      currency: 'جنيه',
      products: 'تيشيرت قطن بيسك - 250 (مقاسات S إلى XXL، 6 ألوان)\nهودي أوفر سايز - 650\nبنطلون جينز - 550\nشورت رياضي - 220\nكاب - 150',
      policies: 'الشحن للقاهرة والجيزة 50 جنيه وللمحافظات 70 جنيه، خلال 2 إلى 4 أيام.\nالاستبدال خلال 14 يوم والمنتج بحالته.\nالدفع عند الاستلام أو فودافون كاش.',
    },
    en: {
      description: 'Online store for casual clothing, shipping nationwide.',
      hours: 'Customer service every day, 10 am to 10 pm',
      currency: 'USD',
      products: 'Basic cotton T-shirt - 15 (S to XXL, 6 colours)\nOversized hoodie - 40\nJeans - 35\nSports shorts - 14\nCap - 10',
      policies: 'Shipping is 5 in the capital and 7 elsewhere, 2 to 4 days.\nExchanges within 14 days in original condition.\nCash on delivery or card.',
    },
    calendar: false,
  },
};

export function applyTemplate(store, type, lang) {
  const t = TEMPLATES[type];
  if (!t) return false;
  const content = t[lang === 'en' ? 'en' : 'ar'];
  const p = store.data.profile;
  for (const [k, v] of Object.entries(content)) if (!p[k]) p[k] = v;
  p.businessType = type;
  if (t.calendar) Object.assign(store.data.settings.calendar, t.calendar, { enabled: true });
  store.save();
  return true;
}
