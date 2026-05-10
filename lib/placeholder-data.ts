/**
 * Placeholder data — DISPOSABLE.
 *
 * Shapes are schema-derived types from `lib/db/schema.ts` so `queries.ts`
 * can swap between Drizzle and these arrays transparently.
 *
 * Imported ONLY by `lib/db/queries.ts`. Pages and components must use
 * the queries layer.
 */

import type {
  Article,
  Book,
  Booking,
  BookingInterest,
  BookingOrder,
  BookingsPendingHold,
  ContactMessage,
  ContentBlock,
  CorporateClient,
  CorporateProgram,
  CorporateRequest,
  Event,
  GalleryItem,
  Interview,
  Order,
  SiteSetting,
  Subscriber,
  Test,
  TestOption,
  TestQuestion,
  Tour,
  TourSuggestion,
  User,
} from './db/schema'

const NOW = new Date('2026-04-24T00:00:00Z')

const LONG_AR =
  'يُسلِّط هذا المقال الضوء على رؤية الدكتور خالد غطّاس بوصفه عالم بيولوجيا وخبيرًا في السلوك البشري، يجمع بين العلم والفن والفلسفة لمعالجة قضايا الإنسان المعاصر. ' +
  'يربط الطرح بين العلوم السلوكية، الفهم الثقافي، والتجربة الإنسانية، ليقدم محتوى يعزز التفكير النقدي ويدعو إلى التغيير الإيجابي في حياة الأفراد والمؤسسات والمجتمعات.'

const LONG_EN =
  'This article highlights Dr. Khaled Ghattass\'s vision as a cell biologist and expert in human behavior, weaving together science, art, and philosophy to address contemporary human concerns. ' +
  'It connects behavioral science, cultural understanding, and lived experience to deliver content that fosters critical thinking and calls for positive change in individuals, institutions, and communities.'

const ALWARSHEH_AR_FULL =
  'أسّس الدكتور خالد غطّاس الورشة Al-Warsheh في لبنان، في حديقة منزله في برجا، بتاريخ 11 تموز / يوليو 2020، كنموذج اجتماعي ينطلق من قناعة أساسية مفادها أن المجتمع ليس كيانًا منفصلًا عن الإنسان، بل هو انعكاس مباشر لواقعه الداخلي. ' +
  'فالإنسان هو من يُنتج المجتمع الذي يعيش فيه، وإذا أردنا تعديل مسار المجتمع، فإن البداية الحقيقية تكون من الإنسان نفسه. ' +
  'اختير اسم الورشة كتعبير دقيق عن جوهر هذا النموذج. فالورشة، كما في البناء، تبقى ورشة ما دامت عملية العمل مستمرة، ولا تُسمّى بناية إلا عند اكتمالها. وبما أن العمل على الإنسان لا يكتمل، وتزكية النفس مسار دائم لا ينتهي، بقي الاسم تعبيرًا عن هذه العملية المستمرة. ' +
  'تقوم الورشة على أربع ركائز: الفكر للتفكّر وتوسيع المعرفة، الفن كمساحة للارتقاء الإنساني، القيم لإعادة النظر بما يحكم علاقاتنا، والرياضة لأن الجسد جزء أساسي من توازن الإنسان السليم. ' +
  'وتُختصر رسالتها في مقولة المؤسس: «أريد أن أُدخل بعض الفكر في أفكارنا، بعض الحياة في حياتنا، بعض الإنسان في إنسانيتنا، ثم نُغيّر بذلك الدنيا.»'

const ALWARSHEH_EN_FULL =
  'Dr. Khaled Ghattass founded Al-Warsheh in Lebanon, in his home garden in Burja, on 11 July 2020. The initiative starts from a core conviction: society is not an entity separate from the individual but a direct reflection of one\'s inner reality. ' +
  'If we want to change society, the real starting point is the human being themselves. ' +
  'The name "Al-Warsheh" (literally: workshop) was chosen deliberately. A workshop remains a workshop as long as the work is ongoing — it is not called a building until it is finished. Because the work on the human being is never complete, and the refinement of the self is a path without end, the name reflects this continuous process. ' +
  'Al-Warsheh rests on four pillars: Thought (for reflection and expanding awareness), Art (as a space for human elevation), Values (revisiting what governs our relationships), and Sports (because the body is essential to a balanced human being). ' +
  'Its message is summarized in the founder\'s statement: "I want to bring some thought into our thoughts, some life into our lives, some humanity into our humanity, and through that we change the world."'

const MAHAWER_AR_FULL =
  'منذ انطلاقتها، لم تُقدَّم الورشة بوصفها مساحة نشاطات متفرّقة، بل كانت نموذجاً متكاملاً يؤكد أن الإنسان السليم هو الإنسان المتوازن؛ ذاك الذي لا يتطرّف في جانب ويُهمِل سواه. ' +
  'بدأ الدكتور خالد غطّاس جلسات فكرية على صخرة في حديقة منزله، بحضور عدد محدود من الشبان والشابات. ومع مرور الوقت، انتقلت هذه الجلسات من لقاءات محلية إلى محاضرات أُقيمت على مسارح كبرى حول العالم. ' +
  'وشمل محور الفكر نادي كتاب، تُوِّج عام 2023 بافتتاح مكتبة خالد غطّاس. كما نظّمت الورشة جائزة الدكتور خالد غطّاس للقراءة في دورتها الأولى، على كتاب وكان النفاق جميلًا. ' +
  'في محور الفن، تأسس كورال الورشة، وأُطلق معرض الرسم السنوي «إحياء» بالتعاون مع الفنان نبيل سعد. ' +
  'وفي الرياضة، شاركت الورشة في دورات كرة قدم وحقّقت المركز الأول في بطولة رمضان 2025، ونُظّمت بطولات MMA تحت عنوان GOC – Gate of Champions. ' +
  'وبعد اجتماع معمّق في 10 شباط 2024، أُعيد رسم المحاور لتصبح ثلاثة أعمدة (الفكر، الفن، الرياضة) ترتكز على قاعدة القيم. هكذا تستمر الورشة كنموذج حيّ لا يدّعي الكمال، بل يعمل على الإنسان كما هو.'

const MAHAWER_EN_FULL =
  'From its inception, Al-Warsheh was not presented as a space of scattered activities but as an integrated model affirming that the sound human being is the balanced human being — one who does not extremize in one side while neglecting the others. ' +
  'Dr. Khaled Ghattass began intellectual sessions on a rock in his home garden, attended by a small group of young men and women. Over time, these sessions moved from local gatherings to lectures held on major stages worldwide. ' +
  'The Thought pillar included a book club, crowned in 2023 with the opening of the Khaled Ghattass Library. Al-Warsheh also organized the inaugural Dr. Khaled Ghattass Reading Prize on the book "وكان النفاق جميلًا". ' +
  'In Art, the Al-Warsheh Choir was founded, and the annual Ihya\' painting exhibition was launched in collaboration with artist Nabil Saad. ' +
  'In Sports, Al-Warsheh participated in football tournaments and won first place in the 2025 Ramadan Championship, and hosted MMA tournaments under the GOC – Gate of Champions banner. ' +
  'After an in-depth meeting on 10 February 2024, the pillars were redrawn into three columns (Thought, Art, Sports) resting on a single foundation: Values. Al-Warsheh continues as a living model that does not claim perfection but works on the human being as they are.'

/* ────────────────────────────────────────────────────────────────────── */
/* Articles                                                               */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Articles — 2 real articles from drkhaledghattass.com/blog/ + thematic
 * placeholders. Real articles are the Al-Warsheh series from the press office.
 */
export const placeholderArticles: Article[] = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    slug: 'al-warsheh-social-model',
    titleAr: 'الورشة: نموذج اجتماعي يبدأ من الإنسان',
    titleEn: 'Al-Warsheh: A Social Model That Starts From the Human',
    excerptAr:
      'كيف بدأت الورشة في حديقة منزل الدكتور خالد غطّاس في برجا، ولماذا اختير هذا الاسم.',
    excerptEn:
      'How Al-Warsheh began in Dr. Khaled Ghattass\'s home garden in Burja, and why this name was chosen.',
    contentAr: ALWARSHEH_AR_FULL,
    contentEn: ALWARSHEH_EN_FULL,
    coverImage: '/Paid sessions/session-1.png',
    category: 'SOCIETY',
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 0,
    viewCount: 4820,
    publishedAt: new Date('2025-11-09'),
    createdAt: new Date('2025-11-09'),
    updatedAt: new Date('2025-11-09'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    slug: 'al-warsheh-pillars',
    titleAr: 'محاور الورشة: كيف يُبنى الإنسان المتوازن؟',
    titleEn: 'The Pillars of Al-Warsheh: How Is a Balanced Human Built?',
    excerptAr:
      'الفكر، الفن، الرياضة — وقاعدة القيم. قراءة في الأركان الأربع التي تقوم عليها الورشة.',
    excerptEn:
      'Thought, Art, Sports — and the foundation of Values. A reading of the four pillars on which Al-Warsheh stands.',
    contentAr: MAHAWER_AR_FULL,
    contentEn: MAHAWER_EN_FULL,
    coverImage: '/Paid sessions/session-2.png',
    category: 'SOCIETY',
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 1,
    viewCount: 3214,
    publishedAt: new Date('2026-01-29'),
    createdAt: new Date('2026-01-29'),
    updatedAt: new Date('2026-01-29'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    slug: 'human-behavior-and-decision-making',
    titleAr: 'السلوك البشري واتخاذ القرار',
    titleEn: 'Human Behavior and Decision Making',
    excerptAr: 'مدخل إلى الاقتصاد السلوكي وكيفية تأثيره في القرارات اليومية.',
    excerptEn: 'An introduction to behavioral economics and how it shapes everyday decisions.',
    contentAr: LONG_AR,
    contentEn: LONG_EN,
    coverImage: '/placeholder/nav/nav-1.jpg',
    category: 'PSYCHOLOGY',
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 2,
    viewCount: 1820,
    publishedAt: new Date('2025-09-15'),
    createdAt: new Date('2025-09-15'),
    updatedAt: new Date('2025-09-15'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a4',
    slug: 'critical-thinking-arab-context',
    titleAr: 'التفكير النقدي في السياق العربي',
    titleEn: 'Critical Thinking in the Arab Context',
    excerptAr: 'دعوة لإعادة قراءة المسلّمات والاشتباك معها بفضول علمي.',
    excerptEn: 'A call to re-read assumptions and engage them with scientific curiosity.',
    contentAr: LONG_AR,
    contentEn: LONG_EN,
    coverImage: '/placeholder/nav/nav-2.jpg',
    category: 'CULTURE',
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 3,
    viewCount: 1240,
    publishedAt: new Date('2025-07-22'),
    createdAt: new Date('2025-07-22'),
    updatedAt: new Date('2025-07-22'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a5',
    slug: 'authentic-leadership',
    titleAr: 'القيادة الأصيلة في بيئات معقّدة',
    titleEn: 'Authentic Leadership in Complex Environments',
    excerptAr: 'كيف تواءم بين قيمك الشخصية ودورك المهني، من تجربة هارفارد وستانفورد.',
    excerptEn: 'How to align personal values with professional role, drawing on Harvard and Stanford training.',
    contentAr: LONG_AR,
    contentEn: LONG_EN,
    coverImage: '/placeholder/nav/nav-3.jpg',
    category: 'SOCIETY',
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 4,
    viewCount: 980,
    publishedAt: new Date('2025-05-10'),
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-10'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a6',
    slug: 'art-and-human-elevation',
    titleAr: 'الفن مساحة للارتقاء الإنساني',
    titleEn: 'Art as a Space for Human Elevation',
    excerptAr: 'الفن ليس ترفًا — هو طريق لاستشعار الجمال والعمق في زمن السرعة.',
    excerptEn: 'Art is not a luxury — it is a path to sensing beauty and depth in an age of speed.',
    contentAr: LONG_AR,
    contentEn: LONG_EN,
    coverImage: '/placeholder/nav/nav-4.jpg',
    category: 'CULTURE',
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 5,
    viewCount: 740,
    publishedAt: new Date('2025-03-18'),
    createdAt: new Date('2025-03-18'),
    updatedAt: new Date('2025-03-18'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a7',
    slug: 'biology-of-stress',
    titleAr: 'بيولوجيا التوتر: ما يحدث داخل الخلية',
    titleEn: 'The Biology of Stress: What Happens Inside the Cell',
    excerptAr: 'قراءة علمية مبسّطة لما يجري في الجسم تحت الضغط، وكيف نتعامل معه.',
    excerptEn: 'A simplified scientific reading of what happens in the body under stress, and how to handle it.',
    contentAr: LONG_AR,
    contentEn: LONG_EN,
    coverImage: '/placeholder/nav/nav-5.jpg',
    category: 'PSYCHOLOGY',
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 6,
    viewCount: 612,
    publishedAt: new Date('2025-01-08'),
    createdAt: new Date('2025-01-08'),
    updatedAt: new Date('2025-01-08'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a8',
    slug: 'values-as-foundation',
    titleAr: 'القيم بوصفها قاعدة لا محورًا',
    titleEn: 'Values as Foundation, Not as a Pillar',
    excerptAr: 'لماذا أعادت الورشة رسم محاورها لتصبح القيم قاعدة للفكر والفن والرياضة.',
    excerptEn: 'Why Al-Warsheh redrew its pillars so that Values became the foundation for Thought, Art, and Sports.',
    contentAr: LONG_AR,
    contentEn: LONG_EN,
    coverImage: '/placeholder/nav/nav-1.jpg',
    category: 'PHILOSOPHY',
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 7,
    viewCount: 540,
    publishedAt: new Date('2024-12-12'),
    createdAt: new Date('2024-12-12'),
    updatedAt: new Date('2024-12-12'),
  },
]

/* ────────────────────────────────────────────────────────────────────── */
/* Books                                                                  */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Books — real catalog scraped from drkhaledghattass.com.
 * Cover mapping per user-provided assignment of /public/Paid books/*.jpg.
 * All books are digital editions; sale price 20 USD (original 35).
 */
export const placeholderBooks: Book[] = [
  {
    id: '00000000-0000-0000-0000-0000000000b1',
    slug: 'lays-haza-ma-katabt',
    titleAr: 'ليس هذا ما كتبت',
    titleEn: 'This Is Not What I Wrote',
    subtitleAr: 'إصدار عربي — نسخة إلكترونية',
    subtitleEn: 'Arabic edition — digital book',
    descriptionAr:
      'كتاب يُعيد قراءة ما كتبه الإنسان عن نفسه وعن الآخرين، ويفتح أفقًا نقديًا لفهم الفجوة بين النية والتعبير، بين ما نقصده وما نكتبه. إصدار عربي يُسلَّم نسخة إلكترونية إلى البريد بعد الشراء.',
    descriptionEn:
      'A book that re-reads what we have written about ourselves and others, opening a critical horizon on the gap between intention and expression. Arabic edition delivered as a digital file to your email after purchase.',
    coverImage: '/Paid books/book-1.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: 'book-1.pdf',
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2018,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 0,
    createdAt: new Date('2018-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b2',
    slug: 'wakana-al-nifaq-jamilan',
    titleAr: 'وكان النفاق جميلًا',
    titleEn: 'Hypocrisy Was Once Beautiful',
    subtitleAr: 'إصدار عربي — نسخة إلكترونية',
    subtitleEn: 'Arabic edition — digital book',
    descriptionAr:
      'يقدّم الدكتور خالد غطّاس قراءة جريئة في ظاهرة النفاق الاجتماعي وتجلياته في علاقاتنا اليومية، عبر قصص ومواقف تكشف كيف يتحوّل التظاهر إلى عادة، والصدق إلى استثناء. الكتاب الذي اختير لجائزة د. خالد غطّاس للقراءة في دورتها الأولى.',
    descriptionEn:
      'Dr. Khaled Ghattass delivers a bold reading of social hypocrisy in our everyday relationships — how performance becomes habit and honesty becomes the exception. The first chosen title for the Dr. Khaled Ghattass Reading Prize.',
    coverImage: '/Paid books/book-2.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: 'book-1.pdf',
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2021,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 1,
    createdAt: new Date('2021-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b3',
    slug: 'the-story-before-the-end',
    titleAr: 'القصة ما قبل الأخيرة (نسخة إنجليزية)',
    titleEn: 'The Story Before The End',
    subtitleAr: 'الترجمة الإنجليزية — نسخة إلكترونية',
    subtitleEn: 'English translation — digital book',
    descriptionAr:
      'الترجمة الإنجليزية لرواية «القصة ما قبل الأخيرة». رحلة شعورية عقلانية مع البطل ياسر، عبر خمسة عشر فصلًا من الحوارات والمواقف الإنسانية حول الحياة، الموت، الحب، والخوف من الفقد.',
    descriptionEn:
      'The English translation of "The Story Before the Last." A bold emotional and rational journey readers experience with Yasser, the protagonist, through fifteen chapters exploring life, death, love, and the fear of loss.',
    coverImage: '/Paid books/book-3.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: 'book-1.pdf',
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2025,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 2,
    createdAt: new Date('2025-10-01'),
    updatedAt: new Date('2025-10-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b4',
    slug: 'hypocrisy-was-once-beautiful',
    titleAr: 'وكان النفاق جميلًا (نسخة إنجليزية)',
    titleEn: 'Hypocrisy Was Once Beautiful',
    subtitleAr: 'الترجمة الإنجليزية — نسخة إلكترونية',
    subtitleEn: 'English translation — digital book',
    descriptionAr:
      'الترجمة الإنجليزية لكتاب «وكان النفاق جميلًا». نظرة جريئة على ظاهرة النفاق الاجتماعي وكيف تشكّل علاقاتنا اليومية بطرق نادرًا ما نلاحظها.',
    descriptionEn:
      'The English translation of "وكان النفاق جميلًا." A bold look at social hypocrisy and how it quietly shapes our everyday relationships in ways we rarely notice.',
    coverImage: '/Paid books/book-4.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: 'book-1.pdf',
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2024,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 3,
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b5',
    slug: 'this-isnt-what-i-wrote',
    titleAr: 'ليس هذا ما كتبت (نسخة إنجليزية)',
    titleEn: 'This Isn\'t What I Wrote',
    subtitleAr: 'الترجمة الإنجليزية — نسخة إلكترونية',
    subtitleEn: 'English translation — digital book',
    descriptionAr:
      'الترجمة الإنجليزية لكتاب «ليس هذا ما كتبت». تفتح حوارًا حول المسافة بين ما نريد قوله وما يصل فعلًا إلى الآخر.',
    descriptionEn:
      'The English translation of "ليس هذا ما كتبت." Opens a dialogue on the distance between what we mean to say and what actually reaches the other.',
    coverImage: '/Paid books/book-5.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: 'book-1.pdf',
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2024,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 4,
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b6',
    slug: 'al-qissa-ma-qabl-al-akhira',
    titleAr: 'القصة ما قبل الأخيرة',
    titleEn: 'The Story Before the Last',
    subtitleAr: 'كتاب جديد — الأكثر مبيعًا',
    subtitleEn: 'New release — bestseller',
    descriptionAr:
      'كتاب جديد للدكتور خالد غطّاس. رحلة شعورية عقلانية جريئة يعيشها القارئ مع البطل «ياسر» في قصة من خمسة عشر فصلًا. يتنقّل فيها الكاتب والقارئ معًا عبر أعمق التجارب الإنسانية، بأحداث مشوّقة، وصور غريبة، وحوارات خيالية عن الحياة والموت، والحب والنقمة، وسلطة الآباء والأبناء، والرضا والتأقلم، والخوف من الفقد. قصة ساعدت الآلاف على الشفاء والتخطّي لا عبر النسيان أو التجميل، بل عبر الفهم والصدق والإيمان.',
    descriptionEn:
      'The latest book by Dr. Khaled Ghattass. A bold emotional and rational journey readers experience with the protagonist "Yasser" across fifteen chapters of gripping events, strange images, and imagined dialogues on life, death, love, resentment, parental authority, acceptance, and the fear of loss. A story that has helped thousands heal not through forgetting, but through understanding, honesty, and faith.',
    coverImage: '/Paid books/book-6.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: 'book-1.pdf',
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2025,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 5,
    createdAt: new Date('2025-10-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b7',
    slug: 'arabic-bundle',
    titleAr: 'جميع الكتب العربية',
    titleEn: 'Arabic Books Bundle',
    subtitleAr: 'حزمة الإصدارات العربية الثلاثة',
    subtitleEn: 'Three Arabic editions in one bundle',
    descriptionAr:
      'احصل على جميع الكتب العربية للدكتور خالد غطّاس في حزمة واحدة بسعر مميّز: «ليس هذا ما كتبت»، «وكان النفاق جميلًا»، و«القصة ما قبل الأخيرة». تُسلَّم النسخ الإلكترونية إلى البريد مباشرة بعد الشراء.',
    descriptionEn:
      'Get all three Arabic books by Dr. Khaled Ghattass in one discounted bundle: "ليس هذا ما كتبت", "وكان النفاق جميلًا", and "القصة ما قبل الأخيرة". Digital editions delivered to your email after purchase.',
    coverImage: '/Paid books/package-ar.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: null,
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2025,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 6,
    createdAt: new Date('2025-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b8',
    slug: 'english-package',
    titleAr: 'الحزمة الإنجليزية',
    titleEn: 'English Package',
    subtitleAr: 'حزمة الترجمات الإنجليزية الثلاثة',
    subtitleEn: 'Three English translations bundled together',
    descriptionAr:
      'الحزمة الإنجليزية لكتب الدكتور خالد غطّاس: The Story Before The End، Hypocrisy Was Once Beautiful، This Isn\'t What I Wrote. تُسلَّم النسخ الإلكترونية إلى البريد مباشرة بعد الشراء.',
    descriptionEn:
      'The English package of Dr. Khaled Ghattass\'s translated books: The Story Before The End, Hypocrisy Was Once Beautiful, and This Isn\'t What I Wrote. Digital editions delivered to your email after purchase.',
    coverImage: '/Paid books/package-en.jpg',
    productType: 'BOOK',
    price: '20.00',
    currency: 'USD',
    digitalFile: null,
    externalUrl: null,
    publisher: 'Khaled Ghattass',
    publicationYear: 2025,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 7,
    createdAt: new Date('2025-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000b9',
    slug: 'session-story-before-the-end',
    titleAr: 'جلسة استشارية: القصة ما قبل الأخيرة',
    titleEn: 'Consultation Session: The Story Before the End',
    subtitleAr: 'جلسة فردية عبر الإنترنت — 60 دقيقة',
    subtitleEn: 'One-on-one online session — 60 minutes',
    descriptionAr:
      'جلسة استشارية فردية مع الدكتور خالد غطّاس مستوحاة من رواية «القصة ما قبل الأخيرة». مساحة آمنة للحديث عن أعمق التجارب الإنسانية: الفقد، التأقلم، الحياة والموت. تُحجَز عبر البريد الإلكتروني بعد الشراء.',
    descriptionEn:
      'A one-on-one consultation session with Dr. Khaled Ghattass inspired by "The Story Before The End." A safe space to discuss life\'s deepest human experiences: loss, acceptance, life, and death. Booked via email after purchase.',
    coverImage: '/Paid sessions/session-1.png',
    productType: 'SESSION',
    price: '49.00',
    currency: 'USD',
    digitalFile: null,
    externalUrl: null,
    publisher: null,
    publicationYear: null,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 8,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000ba',
    slug: 'session-risky-experience',
    titleAr: 'جلسة استشارية: تجربة خطرة',
    titleEn: 'Consultation Session: A Risky Experience',
    subtitleAr: 'جلسة فردية عبر الإنترنت — 45 دقيقة',
    subtitleEn: 'One-on-one online session — 45 minutes',
    descriptionAr:
      'جلسة موجَّهة لمن يعيش لحظة قرار صعبة أو يواجه تحوّلاً كبيراً في حياته. حوار صادق وعميق مع الدكتور خالد غطّاس حول كيفية الانتقال من التردّد إلى الفعل. تُحجَز عبر البريد الإلكتروني بعد الشراء.',
    descriptionEn:
      'A targeted session for anyone navigating a difficult decision or a major life transition. A frank and deep dialogue with Dr. Khaled Ghattass on moving from hesitation to action. Booked via email after purchase.',
    coverImage: '/Paid sessions/session-2.png',
    productType: 'SESSION',
    price: '29.00',
    currency: 'USD',
    digitalFile: null,
    externalUrl: null,
    publisher: null,
    publicationYear: null,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 9,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
]

/* ────────────────────────────────────────────────────────────────────── */
/* Interviews                                                             */
/* ────────────────────────────────────────────────────────────────────── */

const INTERVIEW_TEMPLATE: ReadonlyArray<{
  slug: string
  titleAr: string
  titleEn: string
  descAr: string
  descEn: string
  source: string
  sourceAr: string
  year: number
}> = [
  { slug: 'al-jazeera-identity',     titleAr: 'مقابلة مع الجزيرة: الهوية والمعنى',     titleEn: 'Al Jazeera Interview: Identity and Meaning',  descAr: 'حوار مطول حول أسئلة الهوية والمعنى في العالم العربي.',     descEn: 'A long-form dialogue on identity and meaning.',                  source: 'Al Jazeera',      sourceAr: 'الجزيرة',          year: 2024 },
  { slug: 'bbc-arabic-thought',      titleAr: 'مقابلة مع BBC عربي: الفكر والمجتمع',    titleEn: 'BBC Arabic Interview: Thought and Society',   descAr: 'حديث حول تحديات الفكر العربي المعاصر.',                    descEn: 'A conversation on contemporary Arab thought.',                   source: 'BBC Arabic',      sourceAr: 'بي بي سي عربي',    year: 2023 },
  { slug: 'al-arabiya-youth',        titleAr: 'مقابلة مع العربية: الشباب وسؤال المستقبل', titleEn: 'Al Arabiya Interview: Youth and the Future', descAr: 'قضايا الشباب العربي في ظل التحولات الكبرى.',               descEn: 'Arab youth issues amid major transformations.',                  source: 'Al Arabiya',      sourceAr: 'العربية',          year: 2023 },
  { slug: 'sky-arabia-wellbeing',    titleAr: 'مقابلة مع سكاي نيوز عربية: الصحة النفسية', titleEn: 'Sky News Arabia: Mental Wellbeing',          descAr: 'نظرة على الصحة النفسية في مجتمعاتنا العربية.',             descEn: 'A look at mental health in Arab societies.',                     source: 'Sky News Arabia', sourceAr: 'سكاي نيوز عربية',  year: 2023 },
  { slug: 'france24-arabic',         titleAr: 'مقابلة مع فرانس24: الفلسفة والسياسة',    titleEn: 'France 24 Arabic: Philosophy and Politics',  descAr: 'حوار حول الفلسفة والسياسة في الفضاء العربي.',              descEn: 'A dialogue on philosophy and politics in the Arab sphere.',      source: 'France 24 Arabic',sourceAr: 'فرانس 24 عربي',    year: 2022 },
  { slug: 'dw-arabic-education',     titleAr: 'مقابلة مع دويتشه فيله: التربية والهوية', titleEn: 'DW Arabic: Education and Identity',          descAr: 'التربية بوصفها مشروعًا للهوية.',                            descEn: 'Education as a project of identity.',                            source: 'DW Arabic',       sourceAr: 'دويتشه فيله',      year: 2022 },
  { slug: 'podcast-dialogue',        titleAr: 'بودكاست حوارات: المعنى في زمن السرعة',   titleEn: 'Dialogues Podcast: Meaning in Fast Times',   descAr: 'حديث عن المعنى في عصر السرعة والاستهلاك.',                 descEn: 'A discussion on meaning amid speed and consumption.',            source: 'Hiwarat Podcast', sourceAr: 'بودكاست حوارات',  year: 2021 },
  { slug: 'asharq-future',           titleAr: 'مقابلة مع الشرق: المستقبل والإنسان',    titleEn: 'Asharq Interview: Future and Human',         descAr: 'تأملات حول مستقبل الإنسان في عصر التكنولوجيا.',           descEn: 'Reflections on the human future in the technology age.',         source: 'Asharq News',     sourceAr: 'الشرق',            year: 2021 },
]

export const placeholderInterviews: Interview[] = INTERVIEW_TEMPLATE.map((it, i) => ({
  id: `00000000-0000-0000-0000-0000000000i${i + 1}` as string,
  slug: it.slug,
  titleAr: it.titleAr,
  titleEn: it.titleEn,
  descriptionAr: it.descAr,
  descriptionEn: it.descEn,
  thumbnailImage: `/placeholder/nav/nav-${(i % 5) + 1}.jpg`,
  // TODO(content): replace with the real YouTube/Vimeo URL once supplied.
  videoUrl: '',
  source: it.source,
  sourceAr: it.sourceAr,
  year: it.year,
  status: 'PUBLISHED',
  featured: i < 3,
  orderIndex: i,
  createdAt: new Date(`${it.year}-06-15`),
  updatedAt: new Date(`${it.year}-06-15`),
}))

/* ────────────────────────────────────────────────────────────────────── */
/* Gallery (20 items)                                                     */
/* ────────────────────────────────────────────────────────────────────── */

const GALLERY_TEMPLATE: ReadonlyArray<{ titleAr: string; titleEn: string; category: string }> = [
  { titleAr: 'محاضرة في بيروت 2024',     titleEn: 'Beirut Lecture 2024',       category: 'lecture' },
  { titleAr: 'معرض القاهرة للكتاب',       titleEn: 'Cairo Book Fair',           category: 'event' },
  { titleAr: 'مؤتمر الدوحة للحوار',        titleEn: 'Doha Dialogue Conference',  category: 'conference' },
  { titleAr: 'ورشة عمل في عمّان',          titleEn: 'Amman Workshop',            category: 'workshop' },
  { titleAr: 'ندوة في تونس',              titleEn: 'Tunis Panel',               category: 'panel' },
  { titleAr: 'منتدى الرباط',              titleEn: 'Rabat Forum',               category: 'forum' },
  { titleAr: 'جلسة قراءة خاصة',           titleEn: 'Private Reading Session',   category: 'portrait' },
  { titleAr: 'محاضرة في باريس',           titleEn: 'Paris Lecture',             category: 'lecture' },
  { titleAr: 'قمة دبي للفكر',             titleEn: 'Dubai Thought Summit',      category: 'conference' },
  { titleAr: 'ندوة الكويت',               titleEn: 'Kuwait Symposium',          category: 'panel' },
  { titleAr: 'محاضرة في مسقط',            titleEn: 'Muscat Talk',               category: 'lecture' },
  { titleAr: 'مهرجان جدة الأدبي',          titleEn: 'Jeddah Literary Festival',  category: 'event' },
  { titleAr: 'الشارقة للناشرين',           titleEn: 'Sharjah Publishers Forum',  category: 'forum' },
  { titleAr: 'ورشة الرياض',               titleEn: 'Riyadh Workshop',           category: 'workshop' },
  { titleAr: 'لقاء المنامة',              titleEn: 'Manama Gathering',          category: 'event' },
  { titleAr: 'مؤتمر بغداد',               titleEn: 'Baghdad Conference',        category: 'conference' },
  { titleAr: 'قراءة في إسطنبول',          titleEn: 'Istanbul Reading',          category: 'event' },
  { titleAr: 'محاضرة في برلين',           titleEn: 'Berlin Lecture',            category: 'lecture' },
  { titleAr: 'ندوة في لندن',              titleEn: 'London Panel',              category: 'panel' },
  { titleAr: 'صورة خاصة',                 titleEn: 'Studio Portrait',           category: 'portrait' },
]

export const placeholderGallery: GalleryItem[] = GALLERY_TEMPLATE.map((g, i) => ({
  id: `00000000-0000-0000-0000-00000000g${(i + 1).toString().padStart(3, '0')}`,
  titleAr: g.titleAr,
  titleEn: g.titleEn,
  image: `/placeholder/nav/nav-${(i % 5) + 1}.jpg`,
  category: g.category,
  status: 'PUBLISHED',
  orderIndex: i,
  createdAt: new Date(2024 - Math.floor(i / 4), (i * 3) % 12, ((i * 5) % 28) + 1),
}))

/* ────────────────────────────────────────────────────────────────────── */
/* Events                                                                 */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Events — جولة الدنيا الثانية (World Tour 2025-2026), theme:
 * "بين الغريب والسائد.. لقاء عن الحب والحياة" (Between the Strange and the Common — A Meeting on Love and Life).
 */
export const placeholderEvents: Event[] = [
  {
    id: '00000000-0000-0000-0000-0000000000e1',
    slug: 'world-tour-beirut-2026',
    titleAr: 'جولة الدنيا — بيروت 2026',
    titleEn: 'World Tour — Beirut 2026',
    descriptionAr: 'محطة بيروت من جولة الدنيا الثانية. عنوان الجولة: «بين الغريب والسائد.. لقاء عن الحب والحياة».',
    descriptionEn: 'Beirut stop on the second World Tour. Tour theme: "Between the Strange and the Common — A Meeting on Love and Life."',
    locationAr: 'بيروت، لبنان',
    locationEn: 'Beirut, Lebanon',
    coverImage: '/Paid sessions/session-1.png',
    startDate: new Date('2026-06-12T19:00:00Z'),
    endDate: new Date('2026-06-12T21:30:00Z'),
    registrationUrl: null,
    status: 'UPCOMING',
    orderIndex: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000e2',
    slug: 'world-tour-doha-2026',
    titleAr: 'جولة الدنيا — الدوحة 2026',
    titleEn: 'World Tour — Doha 2026',
    descriptionAr: 'محطة الدوحة من جولة الدنيا الثانية.',
    descriptionEn: 'Doha stop on the second World Tour.',
    locationAr: 'الدوحة، قطر',
    locationEn: 'Doha, Qatar',
    coverImage: '/Paid sessions/session-2.png',
    startDate: new Date('2026-09-05T17:00:00Z'),
    endDate: new Date('2026-09-05T19:30:00Z'),
    registrationUrl: null,
    status: 'UPCOMING',
    orderIndex: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000e3',
    slug: 'world-tour-dubai-2026',
    titleAr: 'جولة الدنيا — دبي 2026',
    titleEn: 'World Tour — Dubai 2026',
    descriptionAr: 'محطة دبي من جولة الدنيا الثانية.',
    descriptionEn: 'Dubai stop on the second World Tour.',
    locationAr: 'دبي، الإمارات',
    locationEn: 'Dubai, UAE',
    coverImage: null,
    startDate: new Date('2026-11-20T18:00:00Z'),
    endDate: new Date('2026-11-20T20:30:00Z'),
    registrationUrl: null,
    status: 'UPCOMING',
    orderIndex: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000e4',
    slug: 'al-warsheh-meeting-burja',
    titleAr: 'لقاء الورشة الأسبوعي — برجا',
    titleEn: 'Al-Warsheh Weekly Gathering — Burja',
    descriptionAr: 'لقاء أسبوعي في مقر الورشة في برجا، يتناول مواضيع الفكر والقيم.',
    descriptionEn: 'A weekly gathering at Al-Warsheh\'s home in Burja, covering thought and values.',
    locationAr: 'برجا، لبنان',
    locationEn: 'Burja, Lebanon',
    coverImage: null,
    startDate: new Date('2025-10-14T18:00:00Z'),
    endDate: new Date('2025-10-14T20:00:00Z'),
    registrationUrl: null,
    status: 'PAST',
    orderIndex: 3,
    createdAt: new Date('2025-10-14'),
    updatedAt: new Date('2025-10-14'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000e5',
    slug: 'goc-mma-2025',
    titleAr: 'بطولة GOC — Gate of Champions 2025',
    titleEn: 'GOC – Gate of Champions Tournament 2025',
    descriptionAr: 'بطولة الفنون القتالية MMA بالشراكة مع Top Team Academy، ضمن محور الرياضة في الورشة.',
    descriptionEn: 'MMA tournament in partnership with Top Team Academy, under Al-Warsheh\'s Sports pillar.',
    locationAr: 'بيروت، لبنان',
    locationEn: 'Beirut, Lebanon',
    coverImage: null,
    startDate: new Date('2025-05-03T16:00:00Z'),
    endDate: new Date('2025-05-03T22:00:00Z'),
    registrationUrl: null,
    status: 'PAST',
    orderIndex: 4,
    createdAt: new Date('2025-05-03'),
    updatedAt: new Date('2025-05-03'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000e6',
    slug: 'ihya-art-exhibition-2024',
    titleAr: 'معرض إحياء السنوي 2024',
    titleEn: 'Ihya\' Annual Art Exhibition 2024',
    descriptionAr: 'معرض الرسم السنوي للورشة بالتعاون مع الفنان نبيل سعد، تحت موضوع "إحياء القيم".',
    descriptionEn: 'Al-Warsheh\'s annual art exhibition with painter Nabil Saad, under the theme "Reviving Values."',
    locationAr: 'برجا، لبنان',
    locationEn: 'Burja, Lebanon',
    coverImage: null,
    startDate: new Date('2024-09-18T17:00:00Z'),
    endDate: new Date('2024-09-18T22:00:00Z'),
    registrationUrl: null,
    status: 'PAST',
    orderIndex: 5,
    createdAt: new Date('2024-09-18'),
    updatedAt: new Date('2024-09-18'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000e7',
    slug: 'reading-prize-2024',
    titleAr: 'جائزة د. خالد غطّاس للقراءة — الدورة الأولى',
    titleEn: 'Dr. Khaled Ghattass Reading Prize — First Edition',
    descriptionAr: 'الدورة الأولى من جائزة القراءة على كتاب «وكان النفاق جميلًا».',
    descriptionEn: 'First edition of the reading prize, on the book "وكان النفاق جميلًا".',
    locationAr: 'مكتبة خالد غطاس — برجا، لبنان',
    locationEn: 'Khaled Ghattass Library — Burja, Lebanon',
    coverImage: null,
    startDate: new Date('2024-04-22T18:30:00Z'),
    endDate: new Date('2024-04-22T21:00:00Z'),
    registrationUrl: null,
    status: 'PAST',
    orderIndex: 6,
    createdAt: new Date('2024-04-22'),
    updatedAt: new Date('2024-04-22'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000e8',
    slug: 'library-opening-2023',
    titleAr: 'افتتاح مكتبة خالد غطاس 2023',
    titleEn: 'Khaled Ghattass Library Opening 2023',
    descriptionAr: 'افتتاح مكتبة الورشة العامة في برجا، تتويجًا لمحور الفكر.',
    descriptionEn: 'Inauguration of Al-Warsheh\'s public library in Burja, the culmination of the Thought pillar.',
    locationAr: 'برجا، لبنان',
    locationEn: 'Burja, Lebanon',
    coverImage: null,
    startDate: new Date('2023-11-09T18:00:00Z'),
    endDate: new Date('2023-11-09T21:00:00Z'),
    registrationUrl: null,
    status: 'PAST',
    orderIndex: 7,
    createdAt: new Date('2023-11-09'),
    updatedAt: new Date('2023-11-09'),
  },
]

/* ────────────────────────────────────────────────────────────────────── */
/* Site settings + content blocks                                         */
/* ────────────────────────────────────────────────────────────────────── */

export const placeholderSettings: SiteSetting[] = [
  { id: 's-1', key: 'site_title_ar',       value: 'د. خالد غطاس',                                                                  valueJson: null, updatedAt: NOW },
  { id: 's-2', key: 'site_title_en',       value: 'Dr. Khaled Ghattass',                                                            valueJson: null, updatedAt: NOW },
  { id: 's-3', key: 'site_description_ar', value: 'عالم بيولوجيا وخبير في السلوك البشري — كاتب ومحاضر، مؤسس مبادرة الورشة.',          valueJson: null, updatedAt: NOW },
  { id: 's-4', key: 'site_description_en', value: 'Cell biologist and expert in human behavior — author, speaker, and founder of Al-Warsheh.', valueJson: null, updatedAt: NOW },
  { id: 's-5', key: 'twitter_url',         value: 'https://twitter.com/drkhaledghattas',                                            valueJson: null, updatedAt: NOW },
  { id: 's-6', key: 'facebook_url',        value: 'https://facebook.com/drkhaledghattas',                                           valueJson: null, updatedAt: NOW },
  { id: 's-7', key: 'youtube_url',         value: 'https://youtube.com/@drkhaledghattass',                                          valueJson: null, updatedAt: NOW },
  { id: 's-8', key: 'instagram_url',       value: 'https://instagram.com/drkhaledghattas',                                          valueJson: null, updatedAt: NOW },
  { id: 's-9', key: 'contact_email',       value: 'Team@drkhaledghattass.com',                                                   valueJson: null, updatedAt: NOW },
  { id: 's-10', key: 'contact_phone',      value: '009613579666',                                                                   valueJson: null, updatedAt: NOW },
  { id: 's-11', key: 'contact_address_ar', value: 'مكتبة خالد غطاس — برجا، لبنان',                                                  valueJson: null, updatedAt: NOW },
  { id: 's-12', key: 'contact_address_en', value: 'Khaled Ghattass Library — Burja, Lebanon',                                       valueJson: null, updatedAt: NOW },
]

export const placeholderContentBlocks: ContentBlock[] = [
  {
    id: 'cb-1',
    key: 'hero_eyebrow',
    valueAr: 'فكر ومعنى',
    valueEn: 'Thought & Meaning',
    description: 'Small label above the hero headline.',
    updatedAt: NOW,
  },
  {
    id: 'cb-2',
    key: 'hero_description',
    valueAr:
      'الموقع الرسمي للدكتور خالد غطاس — عالم بيولوجيا وخبير في السلوك البشري، كاتب ومحاضر، مؤسس مبادرة الورشة.',
    valueEn:
      'The official site of Dr. Khaled Ghattass — cell biologist and expert in human behavior, author, speaker, and founder of Al-Warsheh.',
    description: 'Hero supporting paragraph.',
    updatedAt: NOW,
  },
  {
    id: 'cb-3',
    key: 'footer_description',
    valueAr:
      'موقع يعرّف بفكر الدكتور خالد غطاس ومسيرته بين العلم والفن والفلسفة، ويجمع كتاباته ومحاضراته ومبادرة «الورشة».',
    valueEn:
      'A curated archive of Dr. Khaled Ghattass\'s thought between science, art, and philosophy — books, lectures, and the Al-Warsheh initiative.',
    description: 'Footer supporting copy.',
    updatedAt: NOW,
  },
  {
    id: 'cb-4',
    key: 'about.bio.full',
    valueAr:
      'الدكتور خالد غطاس - المؤسس\n\nالدكتور خالد غطاس هو عالم بيولوجيا الخلايا وخبير في السلوك البشري، يجمع بين العلم والفن في رحلة استمرت لأكثر من 15 عامًا، مراقبًا سلوك البشر ومؤثرًا في مجتمعاتهم. كمدير تنفيذي يروي القصص وكاتب قصائد، يسعى الدكتور غطاس لإعادة التوازن إلى مجتمعاتنا من خلال مواجهته للمفاهيم الخاطئة والمضللة التي تؤثر سلبًا على الأفراد والعائلات والمجتمعات في العالم العربي.\n\nعلى مدار السنوات السبع الماضية، استخدم الدكتور غطاس كتاباته ومحاضراته وتأثيره الواسع على وسائل التواصل الاجتماعي ومنصات الإعلام التقليدي لإلهام أعداد كبيرة من الأفراد وصانعي القرار. من خلال نهجه السردي الفريد، يمزج الدكتور غطاس بين العلم والفن والفلسفة لتقديم محتوى يعزز التفكير النقدي ويدعو إلى التغيير الإيجابي.\n\nبصفته مؤسس مبادرة "الورشة" الاجتماعية في لبنان، يسعى الدكتور غطاس إلى تمكين قادة شباب متوازنين ومهرة من خلال نشر القيم الاجتماعية الأساسية عبر الفن والثقافة والعلوم. برؤيته العميقة وخبراته المتنوعة، تمكن الدكتور غطاس من ترك بصمة مؤثرة على المجتمعات العربية، محققًا تقديرًا واسعًا من خلال عمله الاجتماعي والمهني.',
    valueEn:
      'Dr. Khaled Ghattass - The Founder\n\nDr. Khaled Ghattass is a cell biologist and expert in human behavior who has woven science and art together over a 15-year journey of observing human behavior and influencing communities. As an executive storyteller and poet, Dr. Ghattass works to restore balance to our societies by confronting the misconceptions that negatively shape individuals, families, and communities across the Arab world.\n\nOver the past seven years, Dr. Ghattass has used his writing, lectures, and broad influence on social media and traditional press to inspire countless individuals and decision-makers. Through a distinctive narrative approach, he weaves together science, art, and philosophy to deliver content that fosters critical thinking and calls for positive change.\n\nAs the founder of the social initiative "Al-Warsheh" in Lebanon, Dr. Ghattass works to empower balanced and skilled young leaders by spreading core social values through art, culture, and science. With deep vision and varied expertise, Dr. Ghattass has left an impactful mark on Arab communities, gaining wide recognition for his social and professional work.',
    description: 'Long-form bio for /about page hero paragraph.',
    updatedAt: NOW,
  },
  {
    id: 'cb-5',
    key: 'about.bio.preview',
    valueAr:
      'الدكتور خالد غطاس هو عالم بيولوجيا الخلايا وخبير في السلوك البشري، يجمع بين العلم والفن في رحلة استمرت لأكثر من 15 عامًا، مراقبًا سلوك البشر ومؤثرًا في مجتمعاتهم.',
    valueEn:
      'Dr. Khaled Ghattass is a cell biologist and expert in human behavior who has woven science and art together over a 15-year journey of observing human behavior and influencing communities.',
    description: 'Short bio preview for homepage about-section teaser.',
    updatedAt: NOW,
  },
  {
    id: 'cb-6',
    key: 'about.alwarsheh.story',
    valueAr:
      'في إطار المواجهة لتحديات مجتمعية ملحة مثل تغليب المصلحة الفردية على المجتمعية، تراجع القيم الإنسانية، والعنف العشوائي، قام عالم الأحياء الدكتور خالد غطاس بتوجيه رسائل عبر مواقع التواصل الاجتماعي لتحفيز الشباب على إضافة القيم للعلاقات الاجتماعية، التفكير النقدي، التطوير الذاتي والتفاعل المجتمعي.\n\nمن هذه الرسائل ولدت مقولته الشهيرة التي أصبحت رسالته فيما بعد:\n«نريد أن ندخلَ بعضَ الفكر في أفكارنا، بعضَ الحياة في حياتنا، بعضَ الإنسان في إنسانيتنا، ثم نغير بذلك الدنيا.»\n\nولأن التغيير يتطلب عمل دؤوب ومستمر، أسس الدكتور غطاس نموذج اجتماعي اطلق عليه اسم «الورشة» جعل مقرها منزله وحديقته التي يتوسطها شجرة لطالما كانت ترمز له للحياة والتجدد والأمل.',
    valueEn:
      'Faced with urgent social challenges — the tilt toward individual interest at the cost of community, the retreat of human values, and random violence — biologist Dr. Khaled Ghattass began sending messages on social media to inspire young people to bring values into social relationships, critical thinking, personal development, and community engagement.\n\nFrom these messages was born his famous statement, which became his message:\n"We want to put some thought into our thoughts, some life into our lives, some humanity into our humanity, and through that we change the world."\n\nBecause change requires persistent and continuous work, Dr. Ghattass founded a social model he called "Al-Warsheh" (the Workshop), based at his home and garden — at the center of which stands a tree that has long symbolized for him life, renewal, and hope.',
    description: 'Al-Warsheh founding story for /about page or future Al-Warsheh section.',
    updatedAt: NOW,
  },
  {
    id: 'cb-7',
    key: 'hero.quote',
    valueAr:
      'قال لي أحدهم، أنّي لن أخرج برسالاتي وأفكاري من سور حديقة منزلي، واليوم بفضل الله أجول الدنيا بهذه الرسالة والأفكار.',
    valueEn:
      'Someone once told me my message and ideas would never leave the wall of my home garden — today, thanks to God, I tour the world with that message and those ideas.',
    description: 'Hero pull-quote shown above the headline on the homepage.',
    updatedAt: NOW,
  },
  {
    id: 'cb-8',
    key: 'tour.theme.2025_2026',
    valueAr: 'بين الغريب والسائد.. لقاء عن الحب والحياة',
    valueEn: 'Between the Strange and the Common — A Meeting on Love and Life',
    description: 'World Tour 2025-2026 sub-title (جولة الدنيا الثانية).',
    updatedAt: NOW,
  },
]

/* ────────────────────────────────────────────────────────────────────── */
/* Empty stubs for tables that have no public data yet.                   */
/* ────────────────────────────────────────────────────────────────────── */

export const placeholderUsers: User[] = [
  {
    id: '00000000-0000-0000-0000-0000000000u1',
    email: 'admin@drkhaledghattass.com',
    emailVerified: true,
    name: 'Kamal',
    image: null,
    bio: null,
    preferences: null,
    role: 'ADMIN',
    passwordHash: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000u2',
    email: 'khaled@drkhaledghattass.com',
    emailVerified: true,
    name: 'Dr. Khaled Ghattass',
    image: null,
    bio: null,
    preferences: null,
    role: 'CLIENT',
    passwordHash: null,
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000u3',
    email: 'reader.one@example.com',
    emailVerified: true,
    name: 'Layla Khoury',
    image: null,
    bio: null,
    preferences: null,
    role: 'USER',
    passwordHash: null,
    createdAt: new Date('2026-02-12'),
    updatedAt: new Date('2026-02-12'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000u4',
    email: 'reader.two@example.com',
    emailVerified: false,
    name: 'Karim Hadid',
    image: null,
    bio: null,
    preferences: null,
    role: 'USER',
    passwordHash: null,
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
  },
]

export const placeholderOrders: Order[] = [
  {
    id: '00000000-0000-0000-0000-0000000000o1',
    userId: '00000000-0000-0000-0000-0000000000u3',
    status: 'PAID',
    totalAmount: '24.00',
    currency: 'USD',
    stripePaymentIntentId: 'pi_mock_001',
    stripeSessionId: 'cs_mock_001',
    customerEmail: 'reader.one@example.com',
    customerName: 'Layla Khoury',
    giftId: null,
    createdAt: new Date('2026-04-12T14:30:00Z'),
    updatedAt: new Date('2026-04-12T14:30:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000o2',
    userId: '00000000-0000-0000-0000-0000000000u4',
    status: 'FULFILLED',
    totalAmount: '36.00',
    currency: 'USD',
    stripePaymentIntentId: 'pi_mock_002',
    stripeSessionId: 'cs_mock_002',
    customerEmail: 'reader.two@example.com',
    customerName: 'Karim Hadid',
    giftId: null,
    createdAt: new Date('2026-04-08T09:15:00Z'),
    updatedAt: new Date('2026-04-09T11:00:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000o3',
    userId: null,
    status: 'PENDING',
    totalAmount: '19.00',
    currency: 'USD',
    stripePaymentIntentId: null,
    stripeSessionId: 'cs_mock_003',
    customerEmail: 'guest@example.com',
    customerName: 'Anonymous',
    giftId: null,
    createdAt: new Date('2026-04-22T18:42:00Z'),
    updatedAt: new Date('2026-04-22T18:42:00Z'),
  },
]

export const placeholderSubscribers: Subscriber[] = [
  {
    id: '00000000-0000-0000-0000-0000000000s1',
    email: 'reader.one@example.com',
    nameAr: 'ليلى خوري',
    nameEn: 'Layla Khoury',
    status: 'ACTIVE',
    source: 'homepage',
    unsubscribeToken: 'tok_001',
    createdAt: new Date('2026-02-12'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000s2',
    email: 'reader.two@example.com',
    nameAr: null,
    nameEn: 'Karim Hadid',
    status: 'ACTIVE',
    source: 'footer',
    unsubscribeToken: 'tok_002',
    createdAt: new Date('2026-03-04'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000s3',
    email: 'old.subscriber@example.com',
    nameAr: null,
    nameEn: null,
    status: 'UNSUBSCRIBED',
    source: 'article',
    unsubscribeToken: 'tok_003',
    createdAt: new Date('2025-09-20'),
  },
]

export const placeholderContactMessages: ContactMessage[] = [
  {
    id: '00000000-0000-0000-0000-0000000000m1',
    name: 'Sarah Mansour',
    email: 'sarah@example.com',
    subject: 'Speaking invitation — AUB Beirut',
    message:
      'We would love to invite Dr. Ghattass to give a keynote at our annual philosophy conference next October.',
    status: 'UNREAD',
    createdAt: new Date('2026-04-22T10:14:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000m2',
    name: 'Tariq Aslan',
    email: 'tariq@example.com',
    subject: 'Translation rights query',
    message: 'Could you share contact details for translation rights to The Meaning Within?',
    status: 'UNREAD',
    createdAt: new Date('2026-04-19T16:22:00Z'),
  },
  {
    id: '00000000-0000-0000-0000-0000000000m3',
    name: 'Reem Saab',
    email: 'reem@example.com',
    subject: 'Podcast appearance',
    message: 'Following up on our podcast invitation — happy to schedule any week in May.',
    status: 'READ',
    createdAt: new Date('2026-04-10T08:30:00Z'),
  },
]

/**
 * Corporate programs — sourced verbatim from drkhaledghattass.com/cooperate.
 * Four offerings ranging from a 1-hour interactive lecture to a 2-day
 * leadership program.
 */
export const placeholderCorporatePrograms: CorporateProgram[] = [
  {
    id: '00000000-0000-0000-0000-0000000000c1',
    slug: 'interactive-lecture',
    titleAr: 'محاضرة تفاعلية لمدة ساعة',
    titleEn: 'One-Hour Interactive Lecture',
    descriptionAr:
      'مخصصة لجميع الموظفين في المؤسسة. تتناول الجلسة أهم مفاهيم النجاح في بيئة العمل الحديثة، مثل المرونة، وبناء الثقة، وعقلية النمو. وتشمل الحديث عن أسباب رفض الآخرين، والدوافع الإنسانية، وأهم التوازنات في الحياة والعمل، وعلم الأحياء المرتبط بالتوتر، ومتى يجب رفع الموضوع إلى المدير، إضافة إلى مهارات التواصل الفعّال واتخاذ القرارات السليمة. وتختتم الجلسة بحلقة أسئلة وأجوبة لتعزيز الفهم وربط الأفكار بالواقع العملي.',
    descriptionEn:
      'Designed for all employees in the organization. The session explores the most important concepts of success in the modern workplace — resilience, trust-building, and the growth mindset. It covers the reasons people reject others, human motivations, the key balances of life and work, the biology of stress, when to escalate to management, and the skills of effective communication and sound decision-making. The session closes with a Q&A to deepen understanding and connect ideas to real-world practice.',
    durationAr: 'ساعة واحدة',
    durationEn: '1 hour',
    audienceAr: 'جميع الموظفين',
    audienceEn: 'All employees',
    coverImage: null,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c2',
    slug: 'leadership-essence',
    titleAr: 'برنامج جوهر القيادة',
    titleEn: 'The Essence of Leadership',
    descriptionAr:
      'برنامج لمدة يومين يهدف إلى مواءمة القيم الشخصية مع الأدوار المهنية، وتعزيز الوعي الذاتي، وتقوية مهارات اتخاذ القرار، من خلال تمارين عملية وتوجيه مهني. يطوّر المشاركون أدوات تساعدهم على إدارة الضغط، وتوضيح الأهداف، وتحسين فعالية القيادة بأسلوب واضح ومتوازن.',
    descriptionEn:
      'A two-day program designed to align personal values with professional roles, deepen self-awareness, and sharpen decision-making — through hands-on exercises and professional coaching. Participants develop tools to manage pressure, clarify their goals, and lead with clarity and balance.',
    durationAr: 'يومان',
    durationEn: '2 days',
    audienceAr: 'القادة والمديرون',
    audienceEn: 'Leaders & managers',
    coverImage: null,
    status: 'PUBLISHED',
    featured: true,
    orderIndex: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c3',
    slug: 'talent-management',
    titleAr: 'إدارة المواهب',
    titleEn: 'Talent Management',
    descriptionAr:
      'برنامج جلسة مدتها ساعة ونصف إلى ساعتين، مصممة خصيصًا للمديرين التنفيذيين، والمديرين، وأصحاب المناصب القيادية لاكتشاف استراتيجيات ثورية في إدارة المواهب لم يسبق لهم الاطلاع عليها من قبل. سيشارك الحاضرون في جلسات تفاعلية ديناميكية تتحدى الأفكار التقليدية وتُلهم أساليب جديدة لتنمية المواهب داخل مؤسساتهم.',
    descriptionEn:
      'A 1.5–2 hour session built specifically for executives, managers, and leadership-track professionals to discover revolutionary talent-management strategies they have not seen before. Attendees take part in dynamic interactive sessions that challenge conventional thinking and inspire new approaches to growing talent inside their organizations.',
    durationAr: 'من ساعة ونصف إلى ساعتين',
    durationEn: '1.5–2 hours',
    audienceAr: 'التنفيذيون والمديرون',
    audienceEn: 'Executives & managers',
    coverImage: null,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c4',
    slug: 'art-of-influence',
    titleAr: 'إتقان فن التأثير',
    titleEn: 'Mastering the Art of Influence',
    descriptionAr:
      'توجيه القرارات لصالحك. يقدّم هذا البرنامج لمدة يوم واحد لقادة الأعمال والمتخصصين في التسويق، ويهدف إلى استكشاف مبادئ الاقتصاد السلوكي وبنية الدماغ لفهم كيفية تأثيرهما في توجيه سلوك المستهلكين وتحقيق الأهداف التجارية بفعالية. يتعرّف المشاركون على أدوات عملية واستراتيجيات تساعدهم على التأثير واتخاذ قرارات مدروسة تخدم أهداف المؤسسة.',
    descriptionEn:
      'Guiding decisions in your favor. A one-day program for business leaders and marketing professionals that explores the principles of behavioral economics and brain architecture — and how the two shape consumer behavior and drive commercial outcomes. Participants leave with practical tools and strategies to influence others and make considered decisions that serve the organization\'s goals.',
    durationAr: 'يوم واحد',
    durationEn: '1 day',
    audienceAr: 'قادة الأعمال والتسويق',
    audienceEn: 'Business & marketing leaders',
    coverImage: null,
    status: 'PUBLISHED',
    featured: false,
    orderIndex: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

/**
 * Corporate clients — trust-strip logos shown on /corporate. Sourced from
 * the existing drkhaledghattass.com/cooperate page. Logo paths are placeholders
 * until real assets land in /public/clients/.
 */
export const placeholderCorporateClients: CorporateClient[] = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    name: 'Canadian University Dubai',
    nameAr: 'الجامعة الكندية في دبي',
    logoUrl: '/clients/canadian-university-dubai.png',
    websiteUrl: 'https://www.cud.ac.ae',
    status: 'PUBLISHED',
    orderIndex: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    name: 'Department of Energy — Abu Dhabi',
    nameAr: 'دائرة الطاقة — أبوظبي',
    logoUrl: '/clients/department-of-energy-abu-dhabi.png',
    websiteUrl: 'https://www.doe.gov.ae',
    status: 'PUBLISHED',
    orderIndex: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    name: 'Al Muhaidib',
    nameAr: 'المهيدب',
    logoUrl: '/clients/al-muhaidib.png',
    websiteUrl: 'https://www.almuhaidib.com',
    status: 'PUBLISHED',
    orderIndex: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a4',
    name: 'PepsiCo',
    nameAr: 'بيبسيكو',
    logoUrl: '/clients/pepsico.png',
    websiteUrl: 'https://www.pepsico.com',
    status: 'PUBLISHED',
    orderIndex: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a5',
    name: 'Zain',
    nameAr: 'زين',
    logoUrl: '/clients/zain.png',
    websiteUrl: 'https://www.zain.com',
    status: 'PUBLISHED',
    orderIndex: 4,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a6',
    name: 'Tamer Group',
    nameAr: 'مجموعة تامر',
    logoUrl: '/clients/tamer.png',
    websiteUrl: 'https://www.tamergroup.com',
    status: 'PUBLISHED',
    orderIndex: 5,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a7',
    name: 'Department of Community Development',
    nameAr: 'دائرة تنمية المجتمع',
    logoUrl: '/clients/department-of-community-development.png',
    websiteUrl: 'https://www.dcd.gov.ae',
    status: 'PUBLISHED',
    orderIndex: 6,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

/**
 * Corporate requests — empty by default in placeholder mode. The /admin/
 * corporate/requests page renders an empty state until real submissions
 * land via POST /api/corporate/request.
 */
export const placeholderCorporateRequests: CorporateRequest[] = []

/* ──────────────────────────────────────────────────────────────────────────
 * Booking domain — Phase A1
 *
 * Tours: 8 upcoming + 3 past (matches the design's seed data shape;
 * Dr. Khaled to replace with real cities + dates before launch).
 * Bookings: 1 RECONSIDER_COURSE row (state OPEN) + 8 ONLINE_SESSION rows
 * with mixed states (some OPEN, some near sold-out, one CLOSED).
 * Interest / orders / holds: empty by default.
 *
 * Prices in CENTS (per the schema's integer-cents convention).
 * ──────────────────────────────────────────────────────────────────────── */

const TOUR_NOW = NOW.getTime()
const DAY = 24 * 60 * 60 * 1000

export const placeholderTours: Tour[] = [
  {
    id: '00000000-0000-0000-0000-0000000000b1',
    slug: 'beirut-2026-03',
    titleAr: 'بيروت — جولة الدنيا الثانية',
    titleEn: 'Beirut — Second Tour',
    cityAr: 'بيروت',
    cityEn: 'Beirut',
    countryAr: 'لبنان',
    countryEn: 'Lebanon',
    regionAr: 'الشام',
    regionEn: 'MENA',
    date: new Date(TOUR_NOW + 60 * DAY),
    venueAr: 'دار النمر للفن والثقافة',
    venueEn: 'Dar El-Nimer',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: 'https://example.com/beirut',
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b2',
    slug: 'cairo-2026-03',
    titleAr: 'القاهرة — جولة الدنيا الثانية',
    titleEn: 'Cairo — Second Tour',
    cityAr: 'القاهرة',
    cityEn: 'Cairo',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    regionAr: 'شمال إفريقيا',
    regionEn: 'MENA',
    date: new Date(TOUR_NOW + 70 * DAY),
    venueAr: null,
    venueEn: null,
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: null,
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b3',
    slug: 'riyadh-2026-04',
    titleAr: 'الرياض — جولة الدنيا الثانية',
    titleEn: 'Riyadh — Second Tour',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    countryAr: 'السعودية',
    countryEn: 'Saudi Arabia',
    regionAr: 'الخليج',
    regionEn: 'GCC',
    date: new Date(TOUR_NOW + 90 * DAY),
    venueAr: 'مكتبة الملك فهد الوطنية',
    venueEn: 'King Fahd National Library',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: 'https://example.com/riyadh',
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b4',
    slug: 'istanbul-2026-04',
    titleAr: 'إسطنبول — جولة الدنيا الثانية',
    titleEn: 'Istanbul — Second Tour',
    cityAr: 'إسطنبول',
    cityEn: 'Istanbul',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    regionAr: 'أوروبا',
    regionEn: 'EUROPE',
    date: new Date(TOUR_NOW + 105 * DAY),
    venueAr: 'مركز السلطان أحمد الثقافي',
    venueEn: 'Sultanahmet Cultural Center',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: 'https://example.com/istanbul',
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b5',
    slug: 'dubai-2026-05',
    titleAr: 'دبي — جولة الدنيا الثانية',
    titleEn: 'Dubai — Second Tour',
    cityAr: 'دبي',
    cityEn: 'Dubai',
    countryAr: 'الإمارات',
    countryEn: 'UAE',
    regionAr: 'الخليج',
    regionEn: 'GCC',
    date: new Date(TOUR_NOW + 125 * DAY),
    venueAr: 'دبي للثقافة',
    venueEn: 'Dubai Culture',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: 'https://example.com/dubai',
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 4,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b6',
    slug: 'london-2026-05',
    titleAr: 'لندن — جولة الدنيا الثانية',
    titleEn: 'London — Second Tour',
    cityAr: 'لندن',
    cityEn: 'London',
    countryAr: 'المملكة المتحدة',
    countryEn: 'UK',
    regionAr: 'أوروبا',
    regionEn: 'EUROPE',
    date: new Date(TOUR_NOW + 140 * DAY),
    venueAr: 'مركز Mosaic Rooms',
    venueEn: 'The Mosaic Rooms',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: 'https://example.com/london',
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 5,
    createdAt: NOW,
    updatedAt: NOW,
  },
  // Past tours (date < today)
  {
    id: '00000000-0000-0000-0000-0000000000b7',
    slug: 'kuwait-2025-11',
    titleAr: 'الكويت — جولة الدنيا الأولى',
    titleEn: 'Kuwait City — First Tour',
    cityAr: 'مدينة الكويت',
    cityEn: 'Kuwait City',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    regionAr: 'الخليج',
    regionEn: 'GCC',
    date: new Date(TOUR_NOW - 175 * DAY),
    venueAr: 'دار الآثار الإسلامية',
    venueEn: 'Dar al-Athar al-Islamiyyah',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: null,
    coverImage: null,
    attendedCount: 240,
    isActive: true,
    displayOrder: 100,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000b8',
    slug: 'doha-2025-09',
    titleAr: 'الدوحة — جولة الدنيا الأولى',
    titleEn: 'Doha — First Tour',
    cityAr: 'الدوحة',
    cityEn: 'Doha',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    regionAr: 'الخليج',
    regionEn: 'GCC',
    date: new Date(TOUR_NOW - 230 * DAY),
    venueAr: 'متحف الفن الإسلامي',
    venueEn: 'Museum of Islamic Art',
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: null,
    coverImage: null,
    attendedCount: 310,
    isActive: true,
    displayOrder: 101,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

// Empty by default. The reviewedAt column (added in migration 0008) is
// nullable so existing seed/placeholder rows don't need to set it.
export const placeholderTourSuggestions: TourSuggestion[] = []

export const placeholderBookings: Booking[] = [
  {
    id: '00000000-0000-0000-0000-0000000000c0',
    slug: 'reconsider',
    productType: 'RECONSIDER_COURSE',
    titleAr: 'دورة Reconsider',
    titleEn: 'Reconsider',
    descriptionAr:
      'دورة مكثّفة في التفكير، الكتابة، والتأمّل المنهجي — على مدى ثمانية أسابيع.',
    descriptionEn:
      'An eight-week, deep-work cohort in thinking, writing, and methodical reflection.',
    coverImage: null,
    priceUsd: 35000,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 70 * DAY),
    cohortLabelAr: 'مارس ٢٠٢٦ — مايو ٢٠٢٦',
    cohortLabelEn: 'March 15 — May 10, 2026',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 24,
    bookedCount: 18,
    bookingState: 'OPEN',
    displayOrder: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c1',
    slug: 'session-critical-thinking',
    productType: 'ONLINE_SESSION',
    titleAr: 'ورشة في التفكير النقدي',
    titleEn: 'Workshop on Critical Thinking',
    descriptionAr:
      'كيف نختبر أفكارنا قبل أن نتبنّاها؟ جلسة عملية حول الحجاج، التحيّز، وأدوات السؤال.',
    descriptionEn:
      'How do we test our ideas before adopting them? A practical session on argument, bias, and the tools of inquiry.',
    coverImage: null,
    priceUsd: 7500,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 52 * DAY),
    cohortLabelAr: 'السبت ٧ مارس ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Mar 7, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 24,
    bookingState: 'OPEN',
    displayOrder: 1,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c2',
    slug: 'session-philosophy-of-self',
    productType: 'ONLINE_SESSION',
    titleAr: 'فلسفة الذات',
    titleEn: 'Philosophy of Self',
    descriptionAr:
      'من أنا حين أقول "أنا"؟ قراءة معاصرة في مفهوم الذات بين الفلسفة والعلوم العصبية.',
    descriptionEn:
      'Who am I when I say "I"? A contemporary reading of the self between philosophy and neuroscience.',
    coverImage: null,
    priceUsd: 7500,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 59 * DAY),
    cohortLabelAr: 'السبت ١٤ مارس ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Mar 14, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 38,
    bookingState: 'OPEN',
    displayOrder: 2,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c3',
    slug: 'session-cognitive-foundations',
    productType: 'ONLINE_SESSION',
    titleAr: 'الأسس المعرفية',
    titleEn: 'Cognitive Foundations',
    descriptionAr:
      'كيف يتعلّم الدماغ، وكيف يُخطئ. مدخل تطبيقي إلى علم النفس المعرفي.',
    descriptionEn:
      'How the brain learns and how it errs — an applied introduction to cognitive psychology.',
    coverImage: null,
    priceUsd: 7500,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 66 * DAY),
    cohortLabelAr: 'السبت ٢١ مارس ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Mar 21, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 40,
    bookingState: 'SOLD_OUT',
    displayOrder: 3,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c4',
    slug: 'session-writing-in-your-voice',
    productType: 'ONLINE_SESSION',
    titleAr: 'الكتابة بصوتك',
    titleEn: 'Writing in Your Voice',
    descriptionAr:
      'لماذا تشبه أصواتنا أصوات الآخرين؟ ورشة في اكتشاف الصوت الكتابي الخاصّ.',
    descriptionEn:
      'Why do our voices echo others? A workshop on finding your distinct written voice.',
    coverImage: null,
    priceUsd: 9000,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 73 * DAY),
    cohortLabelAr: 'السبت ٢٨ مارس ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Mar 28, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 12,
    bookingState: 'OPEN',
    displayOrder: 4,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c5',
    slug: 'session-memory-and-meaning',
    productType: 'ONLINE_SESSION',
    titleAr: 'الذاكرة والمعنى',
    titleEn: 'Memory and Meaning',
    descriptionAr:
      'كيف نصنع المعنى من الماضي؟ في الذاكرة الفردية والجمعية، وما يبقى منها.',
    descriptionEn:
      'How do we make meaning from the past? On individual and collective memory, and what remains.',
    coverImage: null,
    priceUsd: 7500,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 80 * DAY),
    cohortLabelAr: 'السبت ٤ أبريل ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Apr 4, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 18,
    bookingState: 'OPEN',
    displayOrder: 5,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c6',
    slug: 'session-applied-ethics',
    productType: 'ONLINE_SESSION',
    titleAr: 'علم الأخلاق التطبيقي',
    titleEn: 'Applied Ethics',
    descriptionAr:
      'قرارات صعبة في حياتنا اليومية — وما تقوله الفلسفة الأخلاقية المعاصرة عنها.',
    descriptionEn:
      'Hard choices in everyday life — and what contemporary moral philosophy says about them.',
    coverImage: null,
    priceUsd: 7500,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 87 * DAY),
    cohortLabelAr: 'السبت ١١ أبريل ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Apr 11, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 40,
    bookingState: 'SOLD_OUT',
    displayOrder: 6,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c7',
    slug: 'session-attention',
    productType: 'ONLINE_SESSION',
    titleAr: 'الانتباه في زمن التشتّت',
    titleEn: 'Attention in an Age of Distraction',
    descriptionAr:
      'كيف نستعيد قدرتنا على التركيز؟ ممارسات عملية مستندة إلى علم النفس والتأمل.',
    descriptionEn:
      'How do we recover our capacity for focus? Practical techniques rooted in psychology and contemplation.',
    coverImage: null,
    priceUsd: 9000,
    currency: 'USD',
    nextCohortDate: new Date(TOUR_NOW + 94 * DAY),
    cohortLabelAr: 'السبت ١٨ أبريل ٢٠٢٦ · ١٩:٠٠ بتوقيت بيروت',
    cohortLabelEn: 'Sat Apr 18, 2026 · 19:00 GMT+3',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 31,
    bookingState: 'OPEN',
    displayOrder: 7,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000c8',
    slug: 'session-solitude-and-friendship',
    productType: 'ONLINE_SESSION',
    titleAr: 'العزلة والصداقة',
    titleEn: 'Solitude and Friendship',
    descriptionAr:
      'متى نحتاج الناس، ومتى نحتاج الانصراف عنهم؟ تأمّل هادئ في علاقاتنا.',
    descriptionEn:
      'When do we need people, and when must we withdraw? A quiet reflection on our relationships.',
    coverImage: null,
    priceUsd: 7500,
    currency: 'USD',
    nextCohortDate: null,
    cohortLabelAr: 'الموعد القادم: قيد التحديد',
    cohortLabelEn: 'Next cohort: TBA',
    durationMinutes: 90,
    formatAr: 'مباشر · أونلاين',
    formatEn: 'Live · Online',
    maxCapacity: 40,
    bookedCount: 0,
    bookingState: 'CLOSED',
    displayOrder: 8,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

export const placeholderBookingInterest: BookingInterest[] = []
export const placeholderBookingHolds: BookingsPendingHold[] = []
export const placeholderBookingOrders: BookingOrder[] = []

/* ──────────────────────────────────────────────────────────────────────────
 * Phase C1 — Tests & Quizzes placeholder catalog.
 *
 * Three published tests across three categories so the /tests catalog,
 * filter pills, detail page, take flow, and result page all render in
 * dev mode (DATABASE_URL unset). UUIDs are fixed so that mock-mode users
 * can submit attempts and the result page can resolve them deterministically.
 * Copy is lifted from the design bundle's TQ_COPY/TESTS array.
 * ──────────────────────────────────────────────────────────────────────── */

const TEST_COG_ID = '11111111-1111-4111-8111-111111111111'
const TEST_FAMILY_ID = '22222222-2222-4222-8222-222222222222'
const TEST_ATTACH_ID = '33333333-3333-4333-8333-333333333333'

export const placeholderTests: Test[] = [
  {
    id: TEST_COG_ID,
    slug: 'cognitive-distortions',
    titleAr: 'كيف يفكّر عقلك حين يخطئ؟',
    titleEn: 'How does your mind think when it errs?',
    introAr:
      'في علم النفس المعرفي، نُسمّي بعض أنماط التفكير "تشوّهات" — لا لأنّها مرضية، بل لأنّها تُشوّه الواقع قبل أن نراه. كلّنا نقع فيها. الفرق أنّ من يعرفها يستطيع أن يتراجع عنها.\n\nفي هذا الاختبار سترى أربعة مواقف من الحياة، وفي كلّ موقفٍ ستختار التفسير الذي يبدو لك الأقرب إلى الصواب. لا تستعجل. هدفي أن تتعرّف على نفسك، لا أن تثبت لي شيئاً.\n\nهذا اختبار للتأمّل، لا تشخيص. إن وجدتَ نفسك في موقفٍ صعب، فاطلب مساعدة مختصّ.',
    introEn:
      "In cognitive psychology we call some patterns of thinking 'distortions' — not because they're pathological, but because they distort reality before we see it. We all fall into them. The difference is that those who know them can step back.\n\nIn this test you'll see four everyday situations. In each one, you'll choose the interpretation that seems closest to the truth. Don't rush. My aim is for you to meet yourself — not to prove anything to me.\n\nThis is a test for reflection, not diagnosis. If you find yourself in real difficulty, please reach out to a professional.",
    descriptionAr:
      'أربعة أنماط شائعة من التشوّهات المعرفية — تعرّف عليها في أمثلةٍ من الحياة اليومية.',
    descriptionEn:
      'Four common cognitive distortions — recognise them in everyday examples from your own life.',
    category: 'psychology',
    estimatedMinutes: 6,
    coverImageUrl: null,
    priceUsd: null,
    isPaid: false,
    isPublished: true,
    displayOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: TEST_FAMILY_ID,
    slug: 'arab-family-roles',
    titleAr: 'أدوار العائلة العربية: ماذا تغيّر؟',
    titleEn: 'Roles in the Arab family: what has shifted?',
    introAr:
      'كلّما تحدّثتُ مع جدّي، شعرتُ أنّ بيننا لغتين. ولمّا تحدّثتُ مع أبنائي، شعرتُ بالشيء نفسه — لكن من الجهة المقابلة.\n\nهذا الاختبار يحاول أن يضع أمامك مواقف عائلية نعرفها جميعاً، ويسألك: ما الذي تتوقّعه أنت؟ ما الذي تجده عادياً؟ ما الذي يستفزّك؟ الإجابات لا تخصّك وحدك — تخصّ جيلاً كاملاً.',
    introEn:
      'Every time I speak with my grandfather I feel there are two languages between us. And when I speak with my own children, I feel the same — only from the other side.\n\nThis test puts in front of you family situations we all know, and asks: what do you expect? what feels normal? what bothers you? Your answers belong not only to you — they belong to a whole generation.',
    descriptionAr:
      'سؤال في كلّ جيل، وأنت في أيّ جيل؟ ثلاثة أسئلة عن السلطة، الرعاية، والعتب.',
    descriptionEn:
      'A question per generation — which one is yours? Three questions on authority, care, and reproach.',
    category: 'society',
    estimatedMinutes: 4,
    coverImageUrl: null,
    priceUsd: null,
    isPaid: false,
    isPublished: true,
    displayOrder: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: TEST_ATTACH_ID,
    slug: 'attachment-patterns',
    titleAr: 'كيف تتعلّق بمن تحبّ؟',
    titleEn: 'How do you attach to those you love?',
    introAr:
      'نظرية التعلّق ليست خرافة عاطفية — هي بحثٌ علميّ عمره ستّون سنة. تقول إنّنا، حين نتعلّق بشخص، نُكرّر دون أن نشعر نمط العلاقة الأوّل في حياتنا.\n\nفي هذا الاختبار ثلاثة مواقف قد تحدث في علاقةٍ قريبة. اقرأها، واختر ما يشبهك. حاول أن تكون صادقاً مع نفسك، لا مع صورتك المثالية.',
    introEn:
      "Attachment theory isn't sentimental folklore — it's sixty years of research. It says that when we attach to someone, we unconsciously repeat the first relational pattern of our lives.\n\nIn this test there are three situations that might happen in a close relationship. Read them and choose what looks like you. Try to be honest with yourself — not with your ideal of yourself.",
    descriptionAr:
      'نظرية التعلّق في ثلاثة أسئلة — تعرّف على نمطك بين القلق والتجنّب والأمان.',
    descriptionEn:
      'Attachment theory in three questions — meet your pattern between anxiety, avoidance, and security.',
    category: 'relationships',
    estimatedMinutes: 5,
    coverImageUrl: null,
    priceUsd: null,
    isPaid: false,
    isPublished: true,
    displayOrder: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

/**
 * Cognitive-distortions test — 4 questions × 4 options each, with the second
 * option ("answer separates event from identity") correct on the failure
 * question. Lifted from the design bundle's QUESTIONS_COG.
 */
export const placeholderTestQuestions: TestQuestion[] = [
  // cognitive-distortions
  {
    id: 'aaaaaaaa-0001-4001-8001-000000000001',
    testId: TEST_COG_ID,
    displayOrder: 0,
    promptAr:
      'أرسلتَ رسالةً إلى صديقٍ ولم يردّ عليك خلال ثلاث ساعات. ما أوّل تفسيرٍ يخطر لك؟',
    promptEn:
      'You sent a message to a friend and they have not replied for three hours. What is your first interpretation?',
    explanationAr:
      'الإجابة الأولى تتجنّب ما نسمّيه "القراءة الذهنية" — أن نفترض ما يدور في رأس الآخر دون دليل. غياب الردّ في حدّ ذاته ليس دليلاً.',
    explanationEn:
      "The first answer avoids what we call 'mind-reading' — assuming what is in another's head without evidence. The absence of a reply, by itself, is not evidence.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'aaaaaaaa-0002-4002-8002-000000000002',
    testId: TEST_COG_ID,
    displayOrder: 1,
    promptAr: 'فشلتَ في عرضٍ مهنيّ مهم. ما الجملة التي تشبه ما تقوله لنفسك؟',
    promptEn:
      'You failed at an important professional pitch. Which sentence sounds like what you say to yourself?',
    explanationAr:
      'الإجابة الثانية تَفصل بين "الحدث" و"الهويّة". التعميم — "أنا فاشل" — هو من أخطر التشوّهات لأنّه يحوّل ضربةً واحدة إلى حكمٍ على الذات كلّها.',
    explanationEn:
      "The second answer separates 'the event' from 'the identity.' Overgeneralisation — 'I'm a failure' — is among the most dangerous distortions because it turns a single blow into a verdict on the whole self.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'aaaaaaaa-0003-4003-8003-000000000003',
    testId: TEST_COG_ID,
    displayOrder: 2,
    promptAr: 'أُلقي عليك مديح في جلسةٍ عامّة. ما أوّل ردّ فعلٍ داخليّ؟',
    promptEn: 'You receive praise in a public setting. What is your first inner reaction?',
    // intentionally null to demo the "no explanation" review variant
    explanationAr: null,
    explanationEn: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'aaaaaaaa-0004-4004-8004-000000000004',
    testId: TEST_COG_ID,
    displayOrder: 3,
    promptAr: 'تأخّرتَ خمس دقائق على موعد. ما الذي تشعر به؟',
    promptEn: 'You arrive five minutes late to an appointment. What do you feel?',
    explanationAr:
      'خمس دقائق ليست كارثة. ضخامة ردّ الفعل علامة على ما نسمّيه "التضخيم" — أن نُكبّر الحدث الصغير حتى يصير مشكلةً كاملة.',
    explanationEn:
      "Five minutes is not a catastrophe. The size of the reaction is a marker of 'magnification' — enlarging a small event until it becomes a whole problem.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  // arab-family-roles — 3 questions, all single-correct
  {
    id: 'bbbbbbbb-0001-4001-8001-000000000001',
    testId: TEST_FAMILY_ID,
    displayOrder: 0,
    promptAr: 'حين يختلف ابنك مع جدّه، ما الذي تتوقّعه منهما؟',
    promptEn: 'When your child disagrees with their grandparent, what do you expect from them?',
    explanationAr:
      'الفرق بين الجيلين ليس خطأ في أحدهما، بل تحوّل في معنى السلطة نفسه. فهم هذا التحوّل أوّل خطوة نحو الحوار.',
    explanationEn:
      "The gap between generations is not an error in either — it is a shift in what authority itself means. Understanding the shift is the first step toward dialogue.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'bbbbbbbb-0002-4002-8002-000000000002',
    testId: TEST_FAMILY_ID,
    displayOrder: 1,
    promptAr: 'ما مفهومك عن "العتب" بين أفراد العائلة؟',
    promptEn: 'What does "reproach" between family members mean to you?',
    explanationAr: null,
    explanationEn: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'bbbbbbbb-0003-4003-8003-000000000003',
    testId: TEST_FAMILY_ID,
    displayOrder: 2,
    promptAr: 'عند اتّخاذ قرار عائليّ مهم، إلى رأي مَن تنحاز؟',
    promptEn: 'When the family makes a major decision, whose view do you lean toward?',
    explanationAr:
      'الحوار العائلي السليم لا يُلغي الاختلاف، بل يُنظّمه — كلّ صوتٍ يُسمَع وكلّ موقعٍ يُحترم.',
    explanationEn:
      'Healthy family dialogue does not erase disagreement; it orchestrates it — every voice heard, every position respected.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  // attachment-patterns
  {
    id: 'cccccccc-0001-4001-8001-000000000001',
    testId: TEST_ATTACH_ID,
    displayOrder: 0,
    promptAr: 'حين يتأخّر شريكك في الردّ على رسالتك، ما أوّل ما يدور في ذهنك؟',
    promptEn: 'When your partner is slow to respond to a message, what comes to mind first?',
    explanationAr:
      'الإجابة الأولى تشير إلى نمط الأمان — افتراض حسن النيّة دون قراءة الذهن. هذا النمط يُحفّز التهدئة الذاتية.',
    explanationEn:
      'The first answer reflects a secure pattern — assuming goodwill without mind-reading. It activates self-soothing.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'cccccccc-0002-4002-8002-000000000002',
    testId: TEST_ATTACH_ID,
    displayOrder: 1,
    promptAr: 'بعد جدالٍ مع من تحبّ، ما الذي تحتاجه قبل الحوار؟',
    promptEn: 'After an argument with someone you love, what do you need before reconciling?',
    explanationAr: null,
    explanationEn: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'cccccccc-0003-4003-8003-000000000003',
    testId: TEST_ATTACH_ID,
    displayOrder: 2,
    promptAr: 'حين تشعر بالحاجة، إلى مَن تذهب أوّلاً؟',
    promptEn: 'When you feel a need rise, who do you turn to first?',
    explanationAr:
      'لا توجد إجابة "صحيحة" مطلقة هنا — لكنّ النمط الذي اخترتَه يكشف ما اعتدتَ أن تجده مكانًا للراحة.',
    explanationEn:
      "There isn't an absolute 'correct' here — but the pattern you chose reveals where you have learned to find rest.",
    createdAt: NOW,
    updatedAt: NOW,
  },
]

const opt = (
  id: string,
  questionId: string,
  displayOrder: number,
  labelAr: string,
  labelEn: string,
  isCorrect: boolean,
): TestOption => ({
  id,
  questionId,
  displayOrder,
  labelAr,
  labelEn,
  isCorrect,
  createdAt: NOW,
})

export const placeholderTestOptions: TestOption[] = [
  // q1 — cognitive-distortions
  opt('aaaaaaaa-0001-4001-8001-0000000000a1', 'aaaaaaaa-0001-4001-8001-000000000001', 0, 'هو منشغل، سيردّ حين يستطيع.', "He's busy and will reply when he can.", true),
  opt('aaaaaaaa-0001-4001-8001-0000000000a2', 'aaaaaaaa-0001-4001-8001-000000000001', 1, 'لا بدّ أنّ شيئاً قلتُه أزعجه.', 'Something I said must have upset him.', false),
  opt('aaaaaaaa-0001-4001-8001-0000000000a3', 'aaaaaaaa-0001-4001-8001-000000000001', 2, 'بات لا يُبالي بي كما في السابق.', 'He no longer cares about me the way he used to.', false),
  opt('aaaaaaaa-0001-4001-8001-0000000000a4', 'aaaaaaaa-0001-4001-8001-000000000001', 3, 'ربّما حدث له شيء — أتمنّى أن يكون بخير.', "Maybe something happened to him — I hope he's well.", false),
  // q2
  opt('aaaaaaaa-0002-4002-8002-0000000000a1', 'aaaaaaaa-0002-4002-8002-000000000002', 0, 'أنا فاشل في كلّ شيء.', "I'm a failure at everything.", false),
  opt('aaaaaaaa-0002-4002-8002-0000000000a2', 'aaaaaaaa-0002-4002-8002-000000000002', 1, 'هذا العرض لم ينجح، وسأرى ما الذي أتعلّمه منه.', "This pitch didn't land, and I'll see what I can learn.", true),
  opt('aaaaaaaa-0002-4002-8002-0000000000a3', 'aaaaaaaa-0002-4002-8002-000000000002', 2, 'لا أصلح لهذه المهنة، يجب أن أتركها.', "I'm not cut out for this work, I should quit.", false),
  opt('aaaaaaaa-0002-4002-8002-0000000000a4', 'aaaaaaaa-0002-4002-8002-000000000002', 3, 'كلّ شيء على ما يرام، لا تستحقّ التفكير.', "Everything's fine, it's not worth thinking about.", false),
  // q3
  opt('aaaaaaaa-0003-4003-8003-0000000000a1', 'aaaaaaaa-0003-4003-8003-000000000003', 0, 'أشكر وأقبل المديح.', 'I thank them and accept it.', true),
  opt('aaaaaaaa-0003-4003-8003-0000000000a2', 'aaaaaaaa-0003-4003-8003-000000000003', 1, 'يقولون هذا من باب اللياقة فقط.', "They're just being polite.", false),
  opt('aaaaaaaa-0003-4003-8003-0000000000a3', 'aaaaaaaa-0003-4003-8003-000000000003', 2, 'أُغيّر الموضوع بسرعة.', 'I change the subject quickly.', false),
  opt('aaaaaaaa-0003-4003-8003-0000000000a4', 'aaaaaaaa-0003-4003-8003-000000000003', 3, 'لو كانوا يعرفونني حقّاً لما قالوا ذلك.', "If they really knew me they wouldn't say that.", false),
  // q4
  opt('aaaaaaaa-0004-4004-8004-0000000000a1', 'aaaaaaaa-0004-4004-8004-000000000004', 0, 'أعتذر وأكمل الجلسة بشكلٍ طبيعي.', 'I apologise and continue normally.', true),
  opt('aaaaaaaa-0004-4004-8004-0000000000a2', 'aaaaaaaa-0004-4004-8004-000000000004', 1, 'يجب أن أعوّض هذا التأخّر طوال الجلسة.', 'I must compensate for this lateness all session.', false),
  opt('aaaaaaaa-0004-4004-8004-0000000000a3', 'aaaaaaaa-0004-4004-8004-000000000004', 2, 'الناس سيظنّون أنّي شخصٌ غير محترم.', "People will think I'm disrespectful.", false),
  opt('aaaaaaaa-0004-4004-8004-0000000000a4', 'aaaaaaaa-0004-4004-8004-000000000004', 3, 'أنا دائماً أتأخّر، لا أمل لي.', "I'm always late, there's no hope for me.", false),
  // arab-family-roles q1
  opt('bbbbbbbb-0001-4001-8001-0000000000b1', 'bbbbbbbb-0001-4001-8001-000000000001', 0, 'أن يحترم رأي الجدّ ويصمت.', 'They should respect the grandparent and stay silent.', false),
  opt('bbbbbbbb-0001-4001-8001-0000000000b2', 'bbbbbbbb-0001-4001-8001-000000000001', 1, 'أن يُعبّر عن رأيه بأدب، وأن يُصغي الجدّ بصبر.', 'They should express their view politely, and the grandparent should listen patiently.', true),
  opt('bbbbbbbb-0001-4001-8001-0000000000b3', 'bbbbbbbb-0001-4001-8001-000000000001', 2, 'أن يُجادل بحرّية، فلا قيمة للأكبر سنّاً وحده.', "They should argue freely — age alone doesn't grant authority.", false),
  // q2
  opt('bbbbbbbb-0002-4002-8002-0000000000b1', 'bbbbbbbb-0002-4002-8002-000000000002', 0, 'لغة مشاعر مشروعة، تستحقّ الإصغاء.', 'A legitimate language of feeling that deserves listening.', true),
  opt('bbbbbbbb-0002-4002-8002-0000000000b2', 'bbbbbbbb-0002-4002-8002-000000000002', 1, 'عبء عاطفيّ يُرهق العلاقات.', 'An emotional burden that strains relationships.', false),
  opt('bbbbbbbb-0002-4002-8002-0000000000b3', 'bbbbbbbb-0002-4002-8002-000000000002', 2, 'مفهوم قديم، لم يعد له مكان.', 'An old notion with no place anymore.', false),
  // q3
  opt('bbbbbbbb-0003-4003-8003-0000000000b1', 'bbbbbbbb-0003-4003-8003-000000000003', 0, 'إلى رأي الأكبر سنّاً.', "Toward the elder's view.", false),
  opt('bbbbbbbb-0003-4003-8003-0000000000b2', 'bbbbbbbb-0003-4003-8003-000000000003', 1, 'إلى رأي مَن سيتأثّر بالقرار أكثر.', 'Toward the one most affected by the decision.', true),
  opt('bbbbbbbb-0003-4003-8003-0000000000b3', 'bbbbbbbb-0003-4003-8003-000000000003', 2, 'إلى رأي مَن يدفع التكلفة المالية.', 'Toward the one paying for it.', false),
  // attachment-patterns q1
  opt('cccccccc-0001-4001-8001-0000000000c1', 'cccccccc-0001-4001-8001-000000000001', 0, 'هو منشغل، سيردّ متى استطاع.', "They're busy and will reply when they can.", true),
  opt('cccccccc-0001-4001-8001-0000000000c2', 'cccccccc-0001-4001-8001-000000000001', 1, 'بدأ يبتعد عنّي.', "They're starting to drift away.", false),
  opt('cccccccc-0001-4001-8001-0000000000c3', 'cccccccc-0001-4001-8001-000000000001', 2, 'لا أُبالي، سأصمت أنا أيضاً.', "I don't mind — I'll go quiet too.", false),
  // q2
  opt('cccccccc-0002-4002-8002-0000000000c1', 'cccccccc-0002-4002-8002-000000000002', 0, 'وقت قصير وحدي قبل الحوار.', 'A short while alone before talking.', true),
  opt('cccccccc-0002-4002-8002-0000000000c2', 'cccccccc-0002-4002-8002-000000000002', 1, 'حوار فوريّ لإغلاق الموضوع.', 'An immediate conversation to close it.', false),
  opt('cccccccc-0002-4002-8002-0000000000c3', 'cccccccc-0002-4002-8002-000000000002', 2, 'صمت طويل حتى يبادر هو.', 'Long silence until they reach out first.', false),
  // q3
  opt('cccccccc-0003-4003-8003-0000000000c1', 'cccccccc-0003-4003-8003-000000000003', 0, 'إلى نفسي. أحتاج صمتاً قبل أن أسمع.', 'To myself. I need silence before I can hear.', true),
  opt('cccccccc-0003-4003-8003-0000000000c2', 'cccccccc-0003-4003-8003-000000000003', 1, 'إلى شخصٍ ثقة. أحتاج أن أُقال الكلام.', 'To someone I trust. I need to say it out loud.', false),
  opt('cccccccc-0003-4003-8003-0000000000c3', 'cccccccc-0003-4003-8003-000000000003', 2, 'لا أحدّد. أنتظر أن يهدأ الشعور.', "I don't pick. I wait for the feeling to settle.", false),
]
