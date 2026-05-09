/**
 * Reconsider course — static editorial content.
 *
 * The Reconsider course is a single product with rich, slow-changing content
 * (curriculum, schedule, FAQ, instructor note, outcomes) that doesn't belong
 * in messages/{ar,en}.json (those stay focused on UI strings) or in the DB
 * (one row would still leave the curriculum array stuck somewhere).
 *
 * This module exports typed bilingual objects that the ReconsiderSection
 * component imports directly. When Dr. Khaled wants to revise the curriculum
 * or shift the schedule, this is the file to edit — followed by an admin
 * tooling pass in Phase A2 once that ships.
 *
 * The cohort schedule dates here are the Spring 2026 cohort placeholders;
 * they should be kept in sync with the `bookings` row's `nextCohortDate` and
 * `cohortLabel{Ar,En}` columns. (Truth source for the displayed cohort label
 * in the reserve panel is the DB row; the schedule list below is the
 * detail-block treatment that pairs Arabic + English week-by-week.)
 */

export type ReconsiderCurriculumModule = {
  titleAr: string
  titleEn: string
}

export type ReconsiderScheduleEntry = {
  weekAr: string
  weekEn: string
  titleAr: string
  titleEn: string
  dateAr: string
  dateEn: string
}

export type ReconsiderFaqEntry = {
  questionAr: string
  questionEn: string
  answerAr: string
  answerEn: string
}

export type ReconsiderFormatItem = {
  labelAr: string
  labelEn: string
  valueAr: string
  valueEn: string
}

export const reconsiderCurriculum: ReconsiderCurriculumModule[] = [
  {
    titleAr: 'القراءة كممارسة: أن تقرأ بقلم في يدك',
    titleEn: 'Reading as practice: with pen in hand',
  },
  {
    titleAr: 'البنية الداخلية للنصّ: الفقرة، الجملة، اللحن',
    titleEn: 'The inner architecture of a text: paragraph, sentence, cadence',
  },
  {
    titleAr: 'الحجّة: متى تُقنع، ومتى تُربك',
    titleEn: 'Argument: when to persuade, when to disorient',
  },
  {
    titleAr: 'السرد والمعنى: ما الذي يجعل الفكرة تبقى',
    titleEn: 'Narrative and meaning: what makes an idea stay',
  },
  {
    titleAr: 'الصمت في الكتابة: ما لا يُقال',
    titleEn: 'Silence in writing: what is left unsaid',
  },
  {
    titleAr: 'المراجعة: أن تعيد كتابة ما كتبتَه',
    titleEn: 'Revision: rewriting what you have written',
  },
  {
    titleAr: 'النشر والمسؤولية: ما بعد الكلمة',
    titleEn: 'Publication and responsibility: beyond the word',
  },
]

export const reconsiderSchedule: ReconsiderScheduleEntry[] = [
  {
    weekAr: 'الأسبوع ١',
    weekEn: 'Week 01',
    titleAr: 'مدخل: القراءة الفاعلة',
    titleEn: 'Opening: active reading',
    dateAr: 'الأحد ١٥ مارس · ١٩:٠٠',
    dateEn: 'Sun Mar 15 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٢',
    weekEn: 'Week 02',
    titleAr: 'الجملة كوحدة معنى',
    titleEn: 'The sentence as a unit of meaning',
    dateAr: 'الأحد ٢٢ مارس · ١٩:٠٠',
    dateEn: 'Sun Mar 22 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٣',
    weekEn: 'Week 03',
    titleAr: 'البناء الحجاجي',
    titleEn: 'Building an argument',
    dateAr: 'الأحد ٢٩ مارس · ١٩:٠٠',
    dateEn: 'Sun Mar 29 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٤',
    weekEn: 'Week 04',
    titleAr: 'السرد والمسافة',
    titleEn: 'Narrative and distance',
    dateAr: 'الأحد ٥ أبريل · ١٩:٠٠',
    dateEn: 'Sun Apr 5 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٥',
    weekEn: 'Week 05',
    titleAr: 'الإيقاع والصمت',
    titleEn: 'Rhythm and silence',
    dateAr: 'الأحد ١٢ أبريل · ١٩:٠٠',
    dateEn: 'Sun Apr 12 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٦',
    weekEn: 'Week 06',
    titleAr: 'المراجعة الذاتية',
    titleEn: 'Self-revision',
    dateAr: 'الأحد ١٩ أبريل · ١٩:٠٠',
    dateEn: 'Sun Apr 19 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٧',
    weekEn: 'Week 07',
    titleAr: 'الكتابة العلنية',
    titleEn: 'Public writing',
    dateAr: 'الأحد ٢٦ أبريل · ١٩:٠٠',
    dateEn: 'Sun Apr 26 · 19:00',
  },
  {
    weekAr: 'الأسبوع ٨',
    weekEn: 'Week 08',
    titleAr: 'ختام: نصّك في يدك',
    titleEn: 'Closing: your text in hand',
    dateAr: 'الأحد ١٠ مايو · ١٩:٠٠',
    dateEn: 'Sun May 10 · 19:00',
  },
]

export const reconsiderOutcomes: { ar: string; en: string }[] = [
  {
    ar: 'مجموعة نصوص قصيرة من تأليفك، مراجعةً وتعليقاً',
    en: 'A small body of short texts, written and revised',
  },
  {
    ar: 'منهج عمليّ في القراءة الواعية تحمله بعد الدورة',
    en: 'A practical method for conscious reading you can carry forward',
  },
  {
    ar: 'مفردات نقدية للحديث عن الكتابة بدقة',
    en: 'Critical vocabulary to talk about writing precisely',
  },
  {
    ar: 'علاقة عمل مع مجموعة صغيرة من القرّاء الجادّين',
    en: 'A working relationship with a small group of serious readers',
  },
  {
    ar: 'وضوح حول الموضوع الذي تريد الكتابة عنه فعلاً',
    en: 'Clarity on what you actually want to write about',
  },
]

export const reconsiderFormat: ReconsiderFormatItem[] = [
  {
    labelAr: 'المدة',
    labelEn: 'Duration',
    valueAr: 'ثمانية أسابيع',
    valueEn: 'Eight weeks',
  },
  {
    labelAr: 'الجلسات',
    labelEn: 'Sessions',
    valueAr: 'أسبوعياً، ٩٠ دقيقة',
    valueEn: 'Weekly, 90 minutes',
  },
  {
    labelAr: 'الالتزام',
    labelEn: 'Commitment',
    valueAr: '٤–٥ ساعات في الأسبوع',
    valueEn: '4–5 hours per week',
  },
  {
    labelAr: 'التقديم',
    labelEn: 'Delivery',
    valueAr: 'مباشر عبر الإنترنت',
    valueEn: 'Live online',
  },
]

export const reconsiderWhoFor = {
  ar: 'كاتبٌ في مرحلة، طالب علوم إنسانية، قارئ جاد، أو مهنيٌّ يبحث عن وقفة مع أفكاره. لا تُشترط خلفية أكاديمية، لكن يُتوقع التزام أسبوعي حقيقي بالقراءة والكتابة.',
  en: 'Writers mid-project, humanities students, serious readers, or professionals seeking a pause with their own thinking. No academic background required — but a real weekly commitment of reading and writing is.',
}

export const reconsiderInstructorNote = {
  ar: '"أبدأ كل دورة بسؤال واحد: ماذا تكتب حقاً حين تكتب؟ خلال ثمانية أسابيع، نحاول أن نجيب — لا نظرياً، بل في النصوص التي تكتبها أنت كل أسبوع. أقرأها، ونناقشها، ونعيد كتابتها معاً. إن جاءك هذا النداء، فأنا أنتظرك."',
  en: '"I begin every cohort with one question: what are you actually writing when you write? Over eight weeks we try to answer — not theoretically, but in the pages you bring each week. I read them. We discuss. We rewrite together. If this calls to you, I\'ll be here."',
  by: {
    ar: '— د. خالد غطاس',
    en: '— Dr. Khaled Ghattass',
  },
}

export const reconsiderFaq: ReconsiderFaqEntry[] = [
  {
    questionAr: 'ما اللغة المُعتمدة في الدورة؟',
    questionEn: 'What language is the course taught in?',
    answerAr:
      'العربية الفصحى، مع نصوص مختارة بالعربية والإنجليزية. لا يُشترط إتقان الإنجليزية، لكنّ الاستئناس بها مفيد.',
    answerEn:
      'Modern Standard Arabic, with selected texts in Arabic and English. English fluency is not required but a working familiarity helps.',
  },
  {
    questionAr: 'ماذا لو فاتتني جلسة؟',
    questionEn: 'What if I miss a session?',
    answerAr:
      'تُسجَّل كلّ الجلسات وتتوفر للمشاركين خلال الدورة. لكنّ المشاركة الحيّة هي الأساس، ونوصي بحضور سبع من ثماني جلسات على الأقل.',
    answerEn:
      'All sessions are recorded and available to participants for the course duration. But live attendance is the heart of it — we recommend attending at least seven of eight.',
  },
  {
    questionAr: 'هل توجد منح أو خصومات؟',
    questionEn: 'Are scholarships or discounts available?',
    answerAr:
      'نخصّص في كلّ دفعة عدداً محدوداً من المنح للطلبة. تواصل معنا قبل الحجز إن كنت مهتماً.',
    answerEn:
      'Each cohort reserves a small number of student scholarships. Reach out before booking if interested.',
  },
  {
    questionAr: 'هل أحصل على شهادة؟',
    questionEn: 'Do I get a certificate?',
    answerAr:
      'نُصدر شهادة حضور لمن يُكمل سبع جلسات على الأقل ويُسلّم النصوص الأسبوعية.',
    answerEn:
      'A certificate of completion is issued for those who attend at least seven sessions and submit the weekly writing.',
  },
  {
    questionAr: 'هل يمكن استرداد المبلغ؟',
    questionEn: 'Is the fee refundable?',
    answerAr:
      'نعم، خلال الأسبوع الأول من بدء الدورة، بشرط ألا تكون قد حضرت أكثر من جلستين.',
    answerEn:
      'Yes — within the first week of the course, provided no more than two sessions have been attended.',
  },
]
