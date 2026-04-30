# Content needed for production launch

The site currently uses placeholder content for development. Before
launch, replace the following:

## Real interview videos (8 needed)

Currently `lib/placeholder-data.ts` ships 8 interview templates with an
empty `videoUrl`. Each interview detail page renders a "Video coming
soon" overlay until a real URL is supplied.

Required per interview:
- Real YouTube or Vimeo video URL
- Real thumbnail image (16:9, ≥ 1280×720)

Slugs needing URLs (see `INTERVIEW_TEMPLATE` in `lib/placeholder-data.ts`):
1. al-jazeera-mubasher
2. lbci-conversation
3. mtv-cultural
4. al-arabiya-youth
5. sky-arabia-wellbeing
6. france24-arabic
7. dw-arabic-education
8. podcast-dialogue
9. asharq-future

## Real article covers (6 needed)

Articles in `lib/placeholder-data.ts` use placeholder cover images at
`/placeholder/articles/*.jpg`. Replace each with a real cover (4:3 or
16:9, ≥ 1600 px wide).

## Real OpenGraph share image

`/app/opengraph-image.tsx` currently renders a dynamic placeholder.
Replace with a designed 1200×630 PNG at `/public/og.png` and remove
the dynamic generator (or keep both — the static file wins).

## Favicon

`/app/icon.tsx` and `/app/apple-icon.tsx` render a dynamic letter-K
icon. Replace with proper assets:
- `/public/favicon.ico` (16×16, 32×32, 48×48 multi-resolution)
- `/public/icon.png` (32×32)
- `/public/apple-touch-icon.png` (180×180)

## Real article body markdown

Article bodies are placeholder Lorem-ipsum-flavored text. Provide real
bilingual content per article, ideally in markdown.

## Real book PDFs

Books with `productType: 'BOOK'` need `digitalFile` URLs pointing to
real PDF files (or external store URLs in `externalUrl`). Currently
none are wired.

## New items to confirm with Dr. Khaled

- [ ] Footer brand quote signature line — currently
      placeholder: "الكلمة فعلٌ، والفكرة بذرة. ما زرعناه يبقى."
      Ask Dr. Khaled if he has a preferred personal
      editorial signature line. Add to messages/ar.json
      and messages/en.json under footer.brand_quote.
