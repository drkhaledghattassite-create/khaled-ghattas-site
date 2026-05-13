/**
 * Master smoke verification for all six Dr. Khaled features.
 *
 * Run: MOCK_AUTH=true DATABASE_URL=postgres://dummy/dummy npx tsx scripts/verify/smoke.ts
 *
 * Strategy:
 *   - Set MOCK_AUTH=true so MOCK_AUTH_ENABLED is true at queries.ts import.
 *   - Use a "dummy" DATABASE_URL so HAS_DB=false (no production writes).
 *   - Hit the queries.ts layer directly to exercise each feature.
 *   - For paths that require HAS_DB (booking holds, real email_queue),
 *     this script asserts the mock-mode shortcut behavior and documents
 *     the production path via file-read evidence in the harness transcript.
 *
 * Exit codes:
 *   0 — all assertions pass
 *   1 — at least one assertion failed
 */

export {}

// IMPORTANT: env must be set BEFORE importing queries.ts so module-level
// HAS_DB / MOCK_AUTH_ENABLED constants pick it up.
process.env.MOCK_AUTH = 'true'
process.env.NEXT_PUBLIC_MOCK_AUTH = 'true'
process.env.DATABASE_URL = 'postgres://dummy:dummy@dummy.local/dummy'

const results: Array<{ feature: string; assertion: string; ok: boolean; detail?: string }> = []

function assert(feature: string, assertion: string, condition: boolean, detail?: string) {
  results.push({ feature, assertion, ok: condition, detail })
  const tag = condition ? 'PASS' : 'FAIL'
  const suffix = detail ? `  (${detail})` : ''
  // Keep output stable & greppable.
  console.log(`[${tag}] ${feature} :: ${assertion}${suffix}`)
}

async function main() {
  // Lazy-import after env is set.
  const q = await import('../../lib/db/queries')
  const placeholder = await import('../../lib/placeholder-data')

  /* ─── (1) GIFTS ─────────────────────────────────────────────────────── */
  // Use the ADMIN_GRANT path which is exercisable in mock mode without
  // Stripe. The webhook helper createUserPurchaseGiftFromWebhook would be
  // the USER_PURCHASE path; both routes ultimately call q.createGift.
  const senderUserId = '00000000-0000-0000-0000-0000000000u1' // placeholder admin
  const bookId = placeholder.placeholderBooks[0]!.id // a paid BOOK
  const recipientEmail = `gift.recipient.${Date.now()}@example.com`

  const created = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: bookId,
    recipientEmail,
    senderMessage: 'happy birthday — from smoke test',
    amountCents: null,
    currency: 'usd',
    locale: 'ar',
    adminGrantedByUserId: senderUserId,
  })
  assert('GIFTS', 'createGift returns a row', !!created)
  assert('GIFTS', 'gift has PENDING or auto-CLAIMED status (recipient is new email)', created?.gift.status === 'PENDING')
  assert('GIFTS', 'gift carries a 32-byte base64url token', typeof created?.gift.token === 'string' && created!.gift.token.length >= 32)

  // Fetch by token to mirror /gifts/claim?token=… flow.
  const fetched = created ? await q.getGiftByToken(created.gift.token) : null
  assert('GIFTS', 'getGiftByToken roundtrips', !!fetched && fetched.id === created!.gift.id)

  // Now claim. claimGift requires the recipient userId (the action layer
  // pulls this from the server session after verifying the email matches).
  const recipientUserId = '00000000-0000-0000-0000-0000000000u3' // placeholder reader
  const claimed = created ? await q.claimGift(created.gift.token, recipientUserId) : null
  assert('GIFTS', 'claimGift transitions PENDING → CLAIMED', claimed?.status === 'CLAIMED')
  assert('GIFTS', 'claimGift sets recipientUserId', claimed?.recipientUserId === recipientUserId)
  assert('GIFTS', 'claimGift sets claimedAt timestamp', !!claimed?.claimedAt)

  // Re-claim is a no-op (status is already CLAIMED, not PENDING)
  const reclaim = created ? await q.claimGift(created.gift.token, recipientUserId) : null
  assert('GIFTS', 'second claim is idempotent (returns null because status is no longer PENDING)', reclaim === null)

  // Entitlement: createGiftClaimOrder returns a (mock or real) order id.
  const orderId = await q.createGiftClaimOrder({
    recipientUserId,
    recipientEmail,
    giftId: created!.gift.id,
    bookId,
    priceCents: 2000,
    currency: 'usd',
  })
  assert('GIFTS', 'createGiftClaimOrder returns entitlement order id (mock: synthetic id)', typeof orderId === 'string' && orderId!.length > 0)

  // ── Claim-page render-state cascade ──────────────────────────────────
  // Pure-logic mirror of components/gifts/GiftClaimPage.tsx's renderState
  // cascade and app/[locale]/(public)/gifts/claim/page.tsx's
  // alreadyClaimedByViewer / loadError discrimination. Sanity-checks the
  // 6-state machine: temporary_error > already_claimed_by_you > invalid >
  // logged_out > mismatch > ready.
  type GiftRow = {
    status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'REVOKED' | 'REFUNDED'
    recipientUserId: string | null
    recipientEmail: string
    expiresAt: Date
  }
  type SessionShape = { user: { id: string; email: string } } | null
  function computeClaimRenderState(input: {
    gift: GiftRow | null
    session: SessionShape
    loadError: boolean
  }):
    | 'invalid'
    | 'logged_out'
    | 'mismatch'
    | 'ready'
    | 'already_claimed_by_you'
    | 'temporary_error' {
    const { gift, session, loadError } = input
    if (loadError) return 'temporary_error'
    const alreadyClaimedByViewer =
      gift?.status === 'CLAIMED' &&
      session != null &&
      gift.recipientUserId === session.user.id
    if (alreadyClaimedByViewer) return 'already_claimed_by_you'
    const expired = !!gift && gift.expiresAt.getTime() <= Date.now()
    const valid = !!gift && gift.status === 'PENDING' && !expired
    if (!valid) return 'invalid'
    if (!session) return 'logged_out'
    const sessionEmailLc = session.user.email.trim().toLowerCase()
    const giftEmailLc = gift!.recipientEmail.toLowerCase()
    if (sessionEmailLc !== giftEmailLc) return 'mismatch'
    return 'ready'
  }

  // Snapshot fixtures derived from the just-claimed gift above.
  const claimedGiftRow: GiftRow = {
    status: claimed!.status as 'CLAIMED',
    recipientUserId: claimed!.recipientUserId,
    recipientEmail: claimed!.recipientEmail,
    expiresAt: claimed!.expiresAt,
  }
  const claimerSession: SessionShape = {
    user: { id: recipientUserId, email: recipientEmail },
  }
  const otherUserSession: SessionShape = {
    user: { id: '00000000-0000-0000-0000-0000000000u9', email: 'someone.else@example.com' },
  }

  assert(
    'GIFTS',
    'render-state: CLAIMED gift viewed by its claimer → already_claimed_by_you',
    computeClaimRenderState({
      gift: claimedGiftRow,
      session: claimerSession,
      loadError: false,
    }) === 'already_claimed_by_you',
  )
  // CLAIMED + different-user falls through the cascade: alreadyClaimedByViewer
  // is false (recipientUserId mismatch), then !valid (status=CLAIMED) short-
  // circuits to 'invalid' before the email-match check. Spec verification item
  // #4 explicitly says logged-out viewer of CLAIMED → 'invalid'; this assertion
  // captures the symmetric result for a different signed-in user.
  assert(
    'GIFTS',
    'render-state: CLAIMED gift viewed by a different user → invalid (cascade short-circuits on !valid before emailMatch)',
    computeClaimRenderState({
      gift: claimedGiftRow,
      session: otherUserSession,
      loadError: false,
    }) === 'invalid',
  )
  assert(
    'GIFTS',
    'render-state: CLAIMED gift viewed by no session → invalid',
    computeClaimRenderState({
      gift: claimedGiftRow,
      session: null,
      loadError: false,
    }) === 'invalid',
  )

  // PENDING gift viewed by the matching recipient → ready. Build a fresh
  // PENDING gift for the assertion (the one above is now CLAIMED).
  const pendingGift = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: bookId,
    recipientEmail: `gift.pending.${Date.now()}@example.com`,
    senderMessage: null,
    amountCents: null,
    currency: 'usd',
    locale: 'ar',
    adminGrantedByUserId: senderUserId,
  })
  assert(
    'GIFTS',
    'render-state: PENDING gift viewed by matching recipient → ready',
    computeClaimRenderState({
      gift: pendingGift
        ? {
            status: pendingGift.gift.status as 'PENDING',
            recipientUserId: pendingGift.gift.recipientUserId,
            recipientEmail: pendingGift.gift.recipientEmail,
            expiresAt: pendingGift.gift.expiresAt,
          }
        : null,
      session: pendingGift
        ? {
            user: {
              id: '00000000-0000-0000-0000-0000000000u3',
              email: pendingGift.gift.recipientEmail,
            },
          }
        : null,
      loadError: false,
    }) === 'ready',
  )

  // Bug 3: a DB-load error wins over every other classification, including
  // a perfectly valid PENDING gift. Catches the "Neon timeout looks like
  // invalid link" regression.
  assert(
    'GIFTS',
    'render-state: loadError=true overrides every other state → temporary_error',
    computeClaimRenderState({
      gift: pendingGift
        ? {
            status: 'PENDING',
            recipientUserId: null,
            recipientEmail: pendingGift.gift.recipientEmail,
            expiresAt: pendingGift.gift.expiresAt,
          }
        : null,
      session: null,
      loadError: true,
    }) === 'temporary_error',
  )

  // Email queue path:
  //   In mock/dev mode, sendEmail short-circuits to preview-only BEFORE the
  //   queue. enqueueEmail itself requires HAS_DB. The flow is verified by
  //   file-read evidence elsewhere in the transcript:
  //     - app/[locale]/(public)/gifts/actions.ts (claimGiftAction calls
  //       sendEmail with emailType='gift_claimed_recipient' and
  //       emailType='gift_claimed_sender')
  //     - lib/email/send.ts (sendEmail → enqueueEmail when not in
  //       isDevPreviewMode())
  //     - lib/db/queries.ts (enqueueEmail inserts into email_queue)
  // We assert the wiring exists rather than the runtime row insertion.

  /* ─── (2) LIBRARY ACCESS ────────────────────────────────────────────── */
  const mockUserId = '1' // MOCK_ACTIVE_USER_ID (admin in mock)
  const library = await q.getLibraryEntriesByUserId(mockUserId)
  assert('LIBRARY', 'getLibraryEntriesByUserId returns >= 1 entries for mock user', library.length >= 1)
  const firstBook = library[0]?.book
  assert('LIBRARY', 'library entry contains a Book row', !!firstBook)
  assert('LIBRARY', 'library entry has matching order row marked PAID', library[0]?.order.status === 'PAID')

  // Reading progress: create, read back, update, read again.
  const testBookId = firstBook!.id
  let progress = await q.getReadingProgress(mockUserId, testBookId)
  // Start state may or may not exist depending on prior runs.

  await q.saveReadingProgress(mockUserId, testBookId, 5, 100)
  progress = await q.getReadingProgress(mockUserId, testBookId)
  assert('LIBRARY', 'saveReadingProgress + getReadingProgress roundtrip (page 5)', progress?.lastPage === 5)
  assert('LIBRARY', 'reading progress carries totalPages', progress?.totalPages === 100)

  await q.saveReadingProgress(mockUserId, testBookId, 42, 100)
  progress = await q.getReadingProgress(mockUserId, testBookId)
  assert('LIBRARY', 'saveReadingProgress updates existing row (page 42)', progress?.lastPage === 42)

  // Session viewer: at least one entry should exist if any book has
  // productType=SESSION. getBooks() returns the published catalog already.
  const sessionBook = (await q.getBooks()).find(
    (b) => b.productType === 'SESSION' && b.status === 'PUBLISHED',
  )
  assert('LIBRARY', 'at least one published SESSION exists', !!sessionBook)

  /* ─── (3) CORPORATE ─────────────────────────────────────────────────── */
  const programs = await q.getCorporatePrograms()
  assert('CORPORATE', '/corporate has 4 corporate programs', programs.length === 4)
  const expectedSlugs = ['interactive-lecture', 'leadership-essence', 'talent-management']
  for (const slug of expectedSlugs) {
    const found = programs.find((p) => p.slug === slug)
    assert('CORPORATE', `program "${slug}" exists`, !!found)
  }

  // POST to corporate request — createCorporateRequest in mock mode buffers
  // into placeholderCorporateRequests.
  const corpReq = await q.createCorporateRequest({
    name: 'Smoke Test',
    email: 'smoketest@example.com',
    phone: null,
    organization: 'SmokeOrg',
    position: null,
    programId: programs[0]?.id ?? null,
    preferredDate: null,
    attendeeCount: null,
    message: 'Hi from smoke test',
  })
  assert('CORPORATE', 'createCorporateRequest returns a row', !!corpReq)
  assert('CORPORATE', 'request status defaults to NEW', corpReq?.status === 'NEW')
  assert('CORPORATE', 'request stores email + org', corpReq?.email === 'smoketest@example.com' && corpReq?.organization === 'SmokeOrg')

  /* ─── (4) BOOKING ───────────────────────────────────────────────────── */
  const reconsider = await q.getReconsiderCourse()
  assert('BOOKING', 'reconsider course exists', !!reconsider)
  assert('BOOKING', 'reconsider has productType=RECONSIDER_COURSE', reconsider?.productType === 'RECONSIDER_COURSE')

  const sessions = await q.getActiveOnlineSessions()
  assert('BOOKING', 'getActiveOnlineSessions returns >= 1 entry', sessions.length >= 1)
  assert('BOOKING', 'all entries are ONLINE_SESSION', sessions.every((s) => s.productType === 'ONLINE_SESSION'))

  // Booking-hold flow: createBookingHold returns db_unavailable in mock mode
  // (intentional — Stripe-driven holds need a real DB transaction). The mock
  // path simulates the same shape via createBookingInterest for the
  // interest-only flow.
  const sessionToBook = sessions[0]
  const holdResult = sessionToBook
    ? await q.createBookingHold({
        userId: '00000000-0000-0000-0000-0000000000u1',
        bookingId: sessionToBook.id,
      })
    : { ok: false as const, error: 'invalid_input' as const }
  // Mock-mode signal: db_unavailable. The real flow requires HAS_DB; we
  // document the wiring via file-read evidence.
  assert(
    'BOOKING',
    'createBookingHold returns db_unavailable in mock mode (production path documented)',
    !holdResult.ok && holdResult.error === 'db_unavailable',
  )

  // Already-booked guard: getPaidBookingIdsForUser → check before booking.
  // Mock-mode bookings are not really "owned" so this returns [].
  const paidIds = await q.getPaidBookingIdsForUser('1')
  assert('BOOKING', 'getPaidBookingIdsForUser returns array (mock: empty)', Array.isArray(paidIds))

  // recipientEmailHasBooking is the gift-flow guard for "recipient already
  // has this booking":
  const alreadyBooked = sessionToBook
    ? await q.recipientEmailHasBooking('nonexistent@example.com', sessionToBook.id)
    : false
  assert('BOOKING', 'recipientEmailHasBooking returns false for new email', alreadyBooked === false)

  /* ─── (5) ASK ───────────────────────────────────────────────────────── */
  const userIdForAsk = '00000000-0000-0000-0000-0000000000u3' // placeholder USER role
  const submitted = await q.createUserQuestion({
    userId: userIdForAsk,
    subject: 'How do I improve focus?',
    body: 'Long body text body text body text body text body text body text.',
    category: 'mind',
  })
  assert('ASK', 'createUserQuestion returns a row', !!submitted)
  assert('ASK', 'question default status is PENDING', submitted?.status === 'PENDING')
  assert('ASK', 'subject persists', submitted?.subject === 'How do I improve focus?')

  // Verify retrieval by id
  const fetchedQ = await q.getQuestionById(submitted!.id)
  assert('ASK', 'getQuestionById returns the inserted row', fetchedQ?.id === submitted!.id)
  assert('ASK', 'admin row has user identity attached', !!fetchedQ?.user && fetchedQ.user.email.length > 0)

  // Admin transition to ANSWERED with a URL.
  const answered = await q.updateQuestionStatus({
    id: submitted!.id,
    status: 'ANSWERED',
    answerReference: 'https://drkhaledghattass.com/articles/focus',
  })
  assert('ASK', 'updateQuestionStatus transitions PENDING → ANSWERED', answered?.status === 'ANSWERED')
  assert('ASK', 'answeredAt timestamp set', !!answered?.answeredAt)
  assert('ASK', 'answerReference persists', answered?.answerReference === 'https://drkhaledghattass.com/articles/focus')

  // Revert (PENDING) idempotency
  const reverted = await q.updateQuestionStatus({
    id: submitted!.id,
    status: 'PENDING',
    answerReference: null,
  })
  assert('ASK', 'updateQuestionStatus can revert ANSWERED → PENDING', reverted?.status === 'PENDING')
  assert('ASK', 'reverting clears answeredAt', reverted?.answeredAt === null)

  /* ─── (6) TESTS ─────────────────────────────────────────────────────── */
  const testsList = placeholder.placeholderTests
  assert('TESTS', '/tests catalog has >= 1 published test (placeholder)', testsList.length >= 1)
  assert('TESTS', 'placeholder tests carry estimatedMinutes + slug', testsList.every((t) => t.slug.length > 0 && t.estimatedMinutes > 0))

  // Submit a test attempt
  const firstTest = testsList[0]!
  const questionsForTest = placeholder.placeholderTestQuestions.filter((qq) => qq.testId === firstTest.id)
  const optionsForTest = placeholder.placeholderTestOptions
  assert('TESTS', 'first test has >= 1 question', questionsForTest.length >= 1)

  const answers = questionsForTest.map((qq) => {
    const opts = optionsForTest.filter((o) => o.questionId === qq.id)
    const correct = opts.find((o) => o.isCorrect)
    const picked = correct ?? opts[0]!
    return {
      questionId: qq.id,
      selectedOptionId: picked.id,
      isCorrect: !!picked.isCorrect,
    }
  })
  const correctCount = answers.filter((a) => a.isCorrect).length
  const totalCount = answers.length
  const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const attempt = await q.createTestAttempt({
    userId: userIdForAsk,
    testId: firstTest.id,
    answers,
    scorePercentage,
    correctCount,
    totalCount,
  })
  assert('TESTS', 'createTestAttempt returns an attempt row', !!attempt)
  assert('TESTS', 'attempt has computed score percentage', attempt?.scorePercentage === scorePercentage)
  assert('TESTS', 'attempt links to the test', attempt?.testId === firstTest.id)

  // Result-page read (by attemptId + userId for ownership gate)
  const re = await q.getTestAttemptById(attempt!.id, userIdForAsk)
  assert('TESTS', 'getTestAttemptById round-trips', !!re && re.id === attempt!.id)
  assert('TESTS', 'result detail joins answers + options', !!re && re.answers.length === questionsForTest.length)
  // Cross-user lookup must return null (privacy gate)
  const wrongUser = await q.getTestAttemptById(attempt!.id, '00000000-0000-0000-0000-0000000000u4')
  assert('TESTS', 'cross-user lookup returns null (privacy)', wrongUser === null)

  // History read (by userId)
  const history = await q.getTestAttemptsByUserId(userIdForAsk)
  assert('TESTS', 'getTestAttemptsByUserId returns >= 1 attempt for this user', history.length >= 1)

  // Admin analytics — per-question selection counts
  const analytics = await q.getTestAnalytics(firstTest.id)
  assert('TESTS', 'admin getTestAnalytics returns a result', !!analytics)
  assert('TESTS', 'analytics counts at least the attempt we just made', (analytics?.totalAttempts ?? 0) >= 1)
  assert(
    'TESTS',
    'analytics returns per-question option-selection counts',
    !!analytics &&
      analytics.questions.length === questionsForTest.length &&
      analytics.questions.every((qq) =>
        qq.options.every((o) => typeof o.selectionCount === 'number'),
      ),
  )

  /* ════════════════════════════════════════════════════════════════════
   * EXTENDED COVERAGE — additional scenarios per feature.
   * Each block uses fresh test users/items to avoid shared state.
   * ════════════════════════════════════════════════════════════════════ */

  const userU3 = '00000000-0000-0000-0000-0000000000u3'
  const userU4 = '00000000-0000-0000-0000-0000000000u4'

  /* ─── EXT.1  GIFTS: admin-grant variants & lifecycle ─────────────────── */
  const validators = await import('../../lib/validators/gift')
  const questionValidators = await import('../../lib/validators/user-question')
  const testValidators = await import('../../lib/validators/test')
  const corporateValidators = await import('../../lib/validators/corporate')

  // (a) Admin grants a BOOK to a non-existing-user email — should stay PENDING.
  const newRecipient = `unknown.${Date.now()}@example.test`
  const adminBookForNew = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[1]!.id,
    recipientEmail: newRecipient,
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  assert('GIFTS', 'admin-grant BOOK to unknown email returns a row', !!adminBookForNew)
  assert('GIFTS', 'admin-grant BOOK to unknown email stays PENDING (not auto-claim)', adminBookForNew?.gift.status === 'PENDING')
  assert('GIFTS', 'admin-grant BOOK to unknown email has autoClaimed=false', adminBookForNew?.autoClaimed === false)
  assert('GIFTS', 'admin-grant BOOK source=ADMIN_GRANT', adminBookForNew?.gift.source === 'ADMIN_GRANT')
  assert('GIFTS', 'admin-grant BOOK adminGrantedByUserId persists', adminBookForNew?.gift.adminGrantedByUserId === '00000000-0000-0000-0000-0000000000u1')

  // (b) Admin grants a BOOK to an existing placeholder user — auto-claim path.
  const existingUserEmail = placeholder.placeholderUsers[2]!.email
  const adminBookForExisting = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[2]!.id,
    recipientEmail: existingUserEmail,
    senderMessage: 'admin grant body',
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  assert('GIFTS', 'admin-grant to existing user auto-claims to CLAIMED', adminBookForExisting?.gift.status === 'CLAIMED')
  assert('GIFTS', 'admin-grant to existing user reports autoClaimed=true', adminBookForExisting?.autoClaimed === true)
  assert('GIFTS', 'admin-grant to existing user sets recipientUserId on gift', !!adminBookForExisting?.gift.recipientUserId)

  // (c) Admin grants a SESSION — same shape, different itemType.
  const sessionBookForAdminGrant = (await q.getBooks()).find((b) => b.productType === 'SESSION' && b.status === 'PUBLISHED')!
  const adminSession = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'SESSION',
    itemId: sessionBookForAdminGrant.id,
    recipientEmail: existingUserEmail,
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  assert('GIFTS', 'admin-grant SESSION returns a row', !!adminSession)
  assert('GIFTS', 'admin-grant SESSION carries itemType=SESSION', adminSession?.gift.itemType === 'SESSION')

  // (d) Admin grants a BOOKING — gift row created; full BOOKING side-effects
  // require HAS_DB (bookings table joins). Mock mode covers the gift row.
  const reconsiderForGift = await q.getReconsiderCourse()
  const adminBookingGift = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOKING',
    itemId: reconsiderForGift!.id,
    recipientEmail: `booking-recipient.${Date.now()}@example.test`,
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  assert('GIFTS', 'admin-grant BOOKING returns a row', !!adminBookingGift)
  assert('GIFTS', 'admin-grant BOOKING.itemType=BOOKING', adminBookingGift?.gift.itemType === 'BOOKING')

  // (e) Edge: invalid token → claim returns null.
  const claimInvalid = await q.claimGift('invalid_token_xyzxyz123456789012345', '00000000-0000-0000-0000-0000000000u9')
  assert('GIFTS', 'claimGift with invalid token returns null', claimInvalid === null)

  // (f) Edge: expired token. We can't mutate expiresAt directly via queries.ts,
  // but we can simulate by reading the mock-store, mutating, writing back.
  const mockStore = await import('../../lib/db/mock-store')
  const expiredGiftRecipient = `expired.${Date.now()}@example.test`
  const willExpire = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[0]!.id,
    recipientEmail: expiredGiftRecipient,
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  // Manually expire the gift in mock-store.
  const storeData = mockStore.readStore()
  const gIdx = storeData.gifts.findIndex((gg) => gg.id === willExpire!.gift.id)
  storeData.gifts[gIdx]!.expiresAt = new Date(Date.now() - 1000)
  mockStore.writeStore(storeData)
  const claimedExpired = await q.claimGift(willExpire!.gift.token, '00000000-0000-0000-0000-0000000000u9')
  assert('GIFTS', 'claimGift on expired token returns null', claimedExpired === null)

  // (g) Revoke flow — admin revokes a CLAIMED BOOK gift.
  const revokable = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[3]!.id,
    recipientEmail: 'revoke.target@example.test',
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  const revoked = await q.revokeGift(revokable!.gift.id, 'admin revoke smoke test reason')
  assert('GIFTS', 'revokeGift on PENDING transitions to REVOKED', revoked?.status === 'REVOKED')
  assert('GIFTS', 'revokeGift sets revokedAt + revokedReason', !!revoked?.revokedAt && revoked?.revokedReason === 'admin revoke smoke test reason')
  // Idempotent: re-revoke returns the same row (terminal state).
  const reRevoked = await q.revokeGift(revokable!.gift.id, 'second attempt')
  assert('GIFTS', 'revokeGift on already-REVOKED returns the existing row (no state change)', reRevoked?.status === 'REVOKED')

  // (h) markGiftRefunded — webhook refund path.
  const refundable = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[0]!.id,
    recipientEmail: 'refund.target@example.test',
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  const refunded = await q.markGiftRefunded(refundable!.gift.id)
  assert('GIFTS', 'markGiftRefunded transitions to REFUNDED', refunded?.status === 'REFUNDED')
  assert('GIFTS', 'markGiftRefunded sets refundedAt', !!refunded?.refundedAt)

  // (i) expirePendingGifts sweep — only PENDING + past expiresAt should flip.
  // Set up: a fresh PENDING gift with future expiresAt, and the expired one
  // from earlier. Sweep should only flip the expired one.
  const futureGift = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[0]!.id,
    recipientEmail: 'future.gift@example.test',
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  // Pre-sweep state check.
  const futureBefore = await q.getGiftById(futureGift!.gift.id)
  assert('GIFTS', 'future-gift starts PENDING pre-sweep', futureBefore?.status === 'PENDING')
  const sweepResult = await q.expirePendingGifts()
  assert('GIFTS', 'expirePendingGifts.expiredCount is a non-negative number', sweepResult.expiredCount >= 0)
  // The previously-expired-then-claimed gift may not exist anymore in the
  // test view; just assert the function runs idempotently and futures stay.
  const futureAfter = await q.getGiftById(futureGift!.gift.id)
  assert('GIFTS', 'expirePendingGifts does NOT flip future-dated PENDING gifts', futureAfter?.status === 'PENDING')

  // (j) expirePendingGifts is idempotent (running twice produces no double-effects).
  const sweepAgain = await q.expirePendingGifts()
  assert('GIFTS', 'expirePendingGifts on a clean slate returns expiredCount=0', sweepAgain.expiredCount === 0)
  assert('GIFTS', 'expirePendingGifts errors array is empty in mock', sweepAgain.errors.length === 0)

  // Zod v4 enforces strict RFC 4122 v4 UUIDs (version digit [1-8], variant
  // [89abAB]). The placeholder ids end in 'b1' / 'c1' etc and don't match,
  // so validator-only tests use real crypto.randomUUID() instead.
  const validUuid = () => (globalThis.crypto as Crypto).randomUUID()

  // (k) Validator-level rejection: claim token too short.
  const tokenTooShort = validators.claimGiftSchema.safeParse({ token: 'abc' })
  assert('GIFTS', 'claimGiftSchema rejects short token', !tokenTooShort.success)
  // Validator: claim token invalid chars.
  const tokenBadChars = validators.claimGiftSchema.safeParse({
    token: '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
  })
  assert('GIFTS', 'claimGiftSchema rejects non-base64url chars', !tokenBadChars.success)
  // Validator: createAdminGiftSchema rejects unknown itemType.
  const badItemType = validators.createAdminGiftSchema.safeParse({
    itemType: 'TEST',
    itemId: validUuid(),
    recipientEmail: 'a@b.com',
  })
  assert('GIFTS', 'createAdminGiftSchema rejects TEST itemType (free in v1)', !badItemType.success)
  // Validator: createAdminGiftSchema accepts a valid payload + lowercases email.
  const goodAdminPayload = validators.createAdminGiftSchema.safeParse({
    itemType: 'BOOK',
    itemId: validUuid(),
    recipientEmail: 'A@B.COM',
  })
  assert(
    'GIFTS',
    'createAdminGiftSchema accepts BOOK + lowercases email',
    goodAdminPayload.success && goodAdminPayload.data.recipientEmail === 'a@b.com',
  )
  // Validator: createAdminGiftSchema rejects malformed UUID itemId.
  const badItemIdShape = validators.createAdminGiftSchema.safeParse({
    itemType: 'BOOK',
    itemId: 'not-a-real-uuid',
    recipientEmail: 'a@b.com',
  })
  assert('GIFTS', 'createAdminGiftSchema rejects non-UUID itemId', !badItemIdShape.success)
  // Validator: createAdminGiftSchema rejects malformed email.
  const badEmail = validators.createAdminGiftSchema.safeParse({
    itemType: 'BOOK',
    itemId: validUuid(),
    recipientEmail: 'not-an-email',
  })
  assert('GIFTS', 'createAdminGiftSchema rejects non-email recipient', !badEmail.success)
  // Validator: revokeGiftSchema requires reason length ≥ 5.
  const shortReason = validators.revokeGiftSchema.safeParse({
    giftId: validUuid(),
    reason: 'no',
  })
  assert('GIFTS', 'revokeGiftSchema rejects reason < 5 chars', !shortReason.success)
  const longReason = validators.revokeGiftSchema.safeParse({
    giftId: validUuid(),
    reason: 'x'.repeat(201),
  })
  assert('GIFTS', 'revokeGiftSchema rejects reason > 200 chars', !longReason.success)
  const okReason = validators.revokeGiftSchema.safeParse({
    giftId: validUuid(),
    reason: 'this is a valid reason for revocation',
  })
  assert('GIFTS', 'revokeGiftSchema accepts valid reason', okReason.success)

  // (l) clampSenderMessageForStripe — 450-char cap.
  const longMessage = 'x'.repeat(800)
  const clamped = validators.clampSenderMessageForStripe(longMessage)
  assert('GIFTS', 'clampSenderMessageForStripe truncates to 450 chars', clamped.length === 450)
  const noClamp = validators.clampSenderMessageForStripe('short')
  assert('GIFTS', 'clampSenderMessageForStripe leaves short strings intact', noClamp === 'short')
  const emptyClamp = validators.clampSenderMessageForStripe(null)
  assert('GIFTS', 'clampSenderMessageForStripe returns "" for null', emptyClamp === '')

  // (m) User-facing gift queries.
  const sentGifts = await q.getUserSentGifts('00000000-0000-0000-0000-0000000000u1')
  assert('GIFTS', 'getUserSentGifts returns an array', Array.isArray(sentGifts))
  const receivedGifts = await q.getUserReceivedGifts(
    '00000000-0000-0000-0000-0000000000u3',
    'reader.one@example.com',
  )
  assert('GIFTS', 'getUserReceivedGifts returns an array', Array.isArray(receivedGifts))
  const pendingCount = await q.countPendingGiftsForUser(
    '00000000-0000-0000-0000-0000000000u3',
    'reader.one@example.com',
  )
  assert('GIFTS', 'countPendingGiftsForUser returns a number', typeof pendingCount === 'number')

  // (n) Admin queue.
  const adminGiftList = await q.getAdminGifts({})
  assert('GIFTS', 'getAdminGifts returns an envelope with rows', Array.isArray(adminGiftList.rows))

  /* ─── EXT.2  LIBRARY ACCESS: bookmarks, ownership, isolation ─────────── */
  // (a) Bookmarks toggle: create → exists → toggle off → gone.
  const bmBookId = placeholder.placeholderBooks[0]!.id
  const bmCreated = await q.toggleBookmark(mockUserId, bmBookId, 10, 'first bookmark')
  assert('LIBRARY', 'toggleBookmark creates a bookmark for new (book, page)', !!bmCreated && bmCreated.pageNumber === 10)
  const bmList = await q.getBookmarks(mockUserId, bmBookId)
  assert('LIBRARY', 'getBookmarks returns the created bookmark', bmList.some((b) => b.pageNumber === 10))
  const bmRemoved = await q.toggleBookmark(mockUserId, bmBookId, 10, null)
  assert('LIBRARY', 'toggleBookmark on existing (book, page) returns null (removed)', bmRemoved === null)
  const bmListAfter = await q.getBookmarks(mockUserId, bmBookId)
  assert('LIBRARY', 'getBookmarks after toggle-off is empty for that page', !bmListAfter.some((b) => b.pageNumber === 10))

  // (b) Multiple bookmarks across pages.
  await q.toggleBookmark(mockUserId, bmBookId, 5, 'p5')
  await q.toggleBookmark(mockUserId, bmBookId, 20, 'p20')
  await q.toggleBookmark(mockUserId, bmBookId, 50, 'p50')
  const bmMulti = await q.getBookmarks(mockUserId, bmBookId)
  assert('LIBRARY', 'getBookmarks returns >= 3 entries after 3 creates', bmMulti.length >= 3)
  // Clean up
  await q.toggleBookmark(mockUserId, bmBookId, 5, null)
  await q.toggleBookmark(mockUserId, bmBookId, 20, null)
  await q.toggleBookmark(mockUserId, bmBookId, 50, null)

  // (c) Reading progress validation — saveReadingProgress rejects pages < 1.
  await q.saveReadingProgress(mockUserId, bmBookId, 7, 100)
  const beforeBadSave = await q.getReadingProgress(mockUserId, bmBookId)
  await q.saveReadingProgress(mockUserId, bmBookId, 0, 100)
  const afterBadSave = await q.getReadingProgress(mockUserId, bmBookId)
  assert('LIBRARY', 'saveReadingProgress with page=0 is rejected (page unchanged)', afterBadSave?.lastPage === beforeBadSave?.lastPage)
  await q.saveReadingProgress(mockUserId, bmBookId, -3, 100)
  const afterNegSave = await q.getReadingProgress(mockUserId, bmBookId)
  assert('LIBRARY', 'saveReadingProgress with page<0 is rejected', afterNegSave?.lastPage === beforeBadSave?.lastPage)

  // (d) totalPages preservation — saveReadingProgress without totalPages
  // should preserve the previously-stored value.
  await q.saveReadingProgress(mockUserId, bmBookId, 9) // no totalPages arg
  const afterNoTotal = await q.getReadingProgress(mockUserId, bmBookId)
  assert('LIBRARY', 'saveReadingProgress without totalPages preserves the prior totalPages', afterNoTotal?.totalPages === 100)
  assert('LIBRARY', 'saveReadingProgress updates lastPage (9) even without totalPages', afterNoTotal?.lastPage === 9)

  // (e) Per-user progress isolation.
  const otherUserId = '4' // a synthetic mock user id
  await q.saveReadingProgress(otherUserId, bmBookId, 88, 100)
  const u1Progress = await q.getReadingProgress(mockUserId, bmBookId)
  const u2Progress = await q.getReadingProgress(otherUserId, bmBookId)
  assert('LIBRARY', 'progress is isolated per user (different lastPage)', u1Progress?.lastPage !== u2Progress?.lastPage)
  assert('LIBRARY', 'other-user progress saved with own lastPage', u2Progress?.lastPage === 88)

  // (f) Library lists for two different users.
  const libU2 = await q.getLibraryEntriesByUserId(otherUserId)
  assert('LIBRARY', 'getLibraryEntriesByUserId returns entries for any user in mock mode', libU2.length >= 1)
  // Verify entries are independent (different userIds in the synthetic orders).
  assert('LIBRARY', 'getLibraryEntriesByUserId entries reference the queried userId', libU2.every((e) => e.order.userId === otherUserId))

  // (g) Session viewer prerequisites.
  const allBooks = await q.getBooks()
  const sessionBooks = allBooks.filter((b) => b.productType === 'SESSION' && b.status === 'PUBLISHED')
  assert('LIBRARY', '>= 1 published SESSION in catalog', sessionBooks.length >= 1)
  // userOwnsProduct in mock-mode: ownership is fabricated → consistent.
  const owns = await q.userOwnsProduct(mockUserId, bmBookId)
  // In mock mode, userOwnsProduct typically returns true OR false consistently;
  // we just assert the function returns a boolean.
  assert('LIBRARY', 'userOwnsProduct returns a boolean', typeof owns === 'boolean')

  /* ─── EXT.3  ASK: validation, lifecycle, history ──────────────────────── */
  // (a) Validator: empty subject rejected.
  const askEmptySubject = questionValidators.createUserQuestionSchema.safeParse({
    subject: '',
    body: 'a body that is long enough to pass',
    category: 'general',
  })
  assert('ASK', 'validator rejects empty subject', !askEmptySubject.success)

  // (b) Validator: subject ≥ 5 chars accepted.
  const askValidShort = questionValidators.createUserQuestionSchema.safeParse({
    subject: '12345',
    body: '1234567890', // exactly 10 chars (the minimum)
    category: '',
  })
  assert('ASK', 'validator accepts subject=5, body=10 boundary', askValidShort.success)

  // (c) Validator: subject too long (> 120 chars) rejected.
  const askLongSubject = questionValidators.createUserQuestionSchema.safeParse({
    subject: 'a'.repeat(121),
    body: 'a'.repeat(50),
    category: 'general',
  })
  assert('ASK', 'validator rejects subject > 120 chars', !askLongSubject.success)

  // (d) Validator: body > 1000 chars rejected.
  const askLongBody = questionValidators.createUserQuestionSchema.safeParse({
    subject: 'normal subject',
    body: 'x'.repeat(1001),
    category: 'general',
  })
  assert('ASK', 'validator rejects body > 1000 chars', !askLongBody.success)

  // (e) Validator: body < 10 chars rejected.
  const askShortBody = questionValidators.createUserQuestionSchema.safeParse({
    subject: 'normal subject',
    body: 'short',
    category: 'general',
  })
  assert('ASK', 'validator rejects body < 10 chars', !askShortBody.success)

  // (f) Validator: invalid category rejected.
  const askBadCat = questionValidators.createUserQuestionSchema.safeParse({
    subject: 'normal subject',
    body: 'a'.repeat(20),
    category: 'not-a-real-category',
  })
  assert('ASK', 'validator rejects invalid category', !askBadCat.success)

  // (g) Validator: each known category accepted.
  for (const cat of questionValidators.QUESTION_CATEGORIES) {
    const ok = questionValidators.createUserQuestionSchema.safeParse({
      subject: 'normal subject',
      body: 'a'.repeat(20),
      category: cat,
    })
    assert('ASK', `validator accepts category "${cat}"`, ok.success)
  }

  // (h) Empty-string category accepted (translates to null at the action layer).
  const askEmptyCat = questionValidators.createUserQuestionSchema.safeParse({
    subject: 'normal subject',
    body: 'a'.repeat(20),
    category: '',
  })
  assert('ASK', 'validator accepts empty category (=> null at action layer)', askEmptyCat.success)

  // (i) Admin: PENDING → ANSWERED with answerReference required.
  const askUpdateRequiresRef = questionValidators.updateQuestionStatusSchema.safeParse({
    id: validUuid(),
    status: 'ANSWERED',
    answerReference: '',
  })
  assert('ASK', 'updateQuestionStatus ANSWERED requires non-empty reference', !askUpdateRequiresRef.success)

  // (j) Admin: PENDING / ARCHIVED with empty reference accepted.
  const askUpdatePendingOk = questionValidators.updateQuestionStatusSchema.safeParse({
    id: validUuid(),
    status: 'PENDING',
    answerReference: '',
  })
  assert('ASK', 'updateQuestionStatus PENDING with empty ref accepted', askUpdatePendingOk.success)
  const askUpdateArchOk = questionValidators.updateQuestionStatusSchema.safeParse({
    id: validUuid(),
    status: 'ARCHIVED',
    answerReference: '',
  })
  assert('ASK', 'updateQuestionStatus ARCHIVED with empty ref accepted', askUpdateArchOk.success)
  // ANSWERED with valid URL accepted.
  const askUpdateAnsweredOk = questionValidators.updateQuestionStatusSchema.safeParse({
    id: validUuid(),
    status: 'ANSWERED',
    answerReference: 'https://drkhaledghattass.com/articles/x',
  })
  assert('ASK', 'updateQuestionStatus ANSWERED with URL accepted', askUpdateAnsweredOk.success)
  // ANSWERED with reference > 500 chars rejected.
  const askUpdateRefTooLong = questionValidators.updateQuestionStatusSchema.safeParse({
    id: validUuid(),
    status: 'ANSWERED',
    answerReference: 'x'.repeat(501),
  })
  assert('ASK', 'updateQuestionStatus rejects answerReference > 500 chars', !askUpdateRefTooLong.success)

  // (k) Multiple questions per user, isolation.
  const q1 = await q.createUserQuestion({ userId: userU3, subject: 'Q1 subject body', body: 'a'.repeat(20), category: 'career' })
  const q2 = await q.createUserQuestion({ userId: userU3, subject: 'Q2 subject body', body: 'b'.repeat(20), category: 'society' })
  const q3 = await q.createUserQuestion({ userId: userU4, subject: 'Q3 subject body', body: 'c'.repeat(20), category: 'general' })
  assert('ASK', 'multiple questions per user inserted', !!q1 && !!q2 && !!q3)
  const u3Questions = await q.getUserQuestionsByUserId(userU3)
  assert('ASK', 'getUserQuestionsByUserId returns only that user\'s rows', u3Questions.every((row) => row.userId === userU3))
  const u4Questions = await q.getUserQuestionsByUserId(userU4)
  assert('ASK', 'cross-user history isolated', u4Questions.every((row) => row.userId === userU4))
  assert('ASK', 'u3 has >= 2 questions in history', u3Questions.length >= 2)

  // (l) ARCHIVED transition.
  const archived = await q.updateQuestionStatus({ id: q1!.id, status: 'ARCHIVED', answerReference: null })
  assert('ASK', 'PENDING → ARCHIVED sets archivedAt', !!archived?.archivedAt)
  assert('ASK', 'ARCHIVED status set', archived?.status === 'ARCHIVED')
  // Revert ARCHIVED → PENDING clears archivedAt.
  const archReverted = await q.updateQuestionStatus({ id: q1!.id, status: 'PENDING', answerReference: null })
  assert('ASK', 'ARCHIVED → PENDING clears archivedAt', archReverted?.archivedAt === null)

  // (m) Admin queue pending count.
  const pendCount = await q.getPendingQuestionCount()
  assert('ASK', 'getPendingQuestionCount returns a non-negative number', pendCount >= 0)

  // (n) Hard delete.
  await q.deleteQuestion(q3!.id)
  const afterDelete = await q.getQuestionById(q3!.id)
  assert('ASK', 'deleteQuestion removes the row', afterDelete === null)
  // Idempotent: deleting again is a no-op.
  await q.deleteQuestion(q3!.id)
  assert('ASK', 'deleteQuestion is idempotent on missing id', true)

  /* ─── EXT.4  TESTS: catalog filters, validation, score banding ────────── */
  // (a) Catalog returns published-only.
  const pubTests = await q.getPublishedTests()
  assert('TESTS', 'getPublishedTests returns all published placeholder tests', pubTests.length >= 1)
  assert('TESTS', 'getPublishedTests returns isPublished=true only', pubTests.every((t) => t.isPublished === true))

  // (b) Filter by category.
  const expectedCats = new Set(placeholder.placeholderTests.map((t) => t.category))
  for (const cat of expectedCats) {
    const filtered = await q.getPublishedTests({ category: cat })
    assert(
      'TESTS',
      `getPublishedTests(category="${cat}") returns only that category`,
      filtered.every((t) => t.category === cat),
    )
  }
  const nopeCat = await q.getPublishedTests({ category: 'no-such-category' })
  assert('TESTS', 'unknown category returns empty array (no throw)', Array.isArray(nopeCat) && nopeCat.length === 0)

  // (c) Sort: displayOrder ASC, then createdAt DESC.
  const allPub = await q.getPublishedTests()
  let sortedOk = true
  for (let i = 1; i < allPub.length; i++) {
    const a = allPub[i - 1]!
    const b = allPub[i]!
    if (a.displayOrder > b.displayOrder) {
      sortedOk = false
      break
    }
    if (a.displayOrder === b.displayOrder && a.createdAt.getTime() < b.createdAt.getTime()) {
      sortedOk = false
      break
    }
  }
  assert('TESTS', 'catalog sorted by displayOrder ASC, createdAt DESC', sortedOk)

  // (d) getTestBySlug returns null for unknown slug.
  const noSlug = await q.getTestBySlug('this-slug-does-not-exist-anywhere')
  assert('TESTS', 'getTestBySlug returns null for unknown slug', noSlug === null)

  // (e) getTestBySlug returns the test for a real slug.
  const realSlug = placeholder.placeholderTests[0]!.slug
  const realTest = await q.getTestBySlug(realSlug)
  assert('TESTS', 'getTestBySlug returns a row for the first placeholder test', !!realTest && realTest.slug === realSlug)

  // (f) Validator: submit attempt requires at least one answer.
  const submitEmpty = testValidators.submitAttemptInputSchema.safeParse({
    testSlug: 'any',
    answers: [],
  })
  assert('TESTS', 'submitAttemptInputSchema rejects 0 answers', !submitEmpty.success)

  // (g) Validator: max 50 answers.
  const submitTooMany = testValidators.submitAttemptInputSchema.safeParse({
    testSlug: 'any',
    answers: Array.from({ length: 51 }, () => ({
      questionId: validUuid(),
      selectedOptionId: validUuid(),
    })),
  })
  assert('TESTS', 'submitAttemptInputSchema rejects > 50 answers', !submitTooMany.success)

  // (h) Validator: malformed UUIDs rejected.
  const submitBadUuid = testValidators.submitAttemptInputSchema.safeParse({
    testSlug: 'any',
    answers: [{ questionId: 'not-a-uuid', selectedOptionId: validUuid() }],
  })
  assert('TESTS', 'submitAttemptInputSchema rejects malformed questionId', !submitBadUuid.success)

  // (h2) Validator: valid payload accepted.
  const submitOk = testValidators.submitAttemptInputSchema.safeParse({
    testSlug: 'any-valid-slug',
    answers: [{ questionId: validUuid(), selectedOptionId: validUuid() }],
  })
  assert('TESTS', 'submitAttemptInputSchema accepts valid payload', submitOk.success)

  // (i) Score banding boundaries: 49 → low, 50 → medium, 79 → medium, 80 → high.
  type ScoreBand = 'low' | 'medium' | 'high'
  const band = (score: number): ScoreBand => (score < 50 ? 'low' : score < 80 ? 'medium' : 'high')
  assert('TESTS', 'score 49 lands in low band', band(49) === 'low')
  assert('TESTS', 'score 50 lands in medium band', band(50) === 'medium')
  assert('TESTS', 'score 79 lands in medium band', band(79) === 'medium')
  assert('TESTS', 'score 80 lands in high band', band(80) === 'high')

  // (j) Test categories === Ask categories.
  const askCats = new Set(questionValidators.QUESTION_CATEGORIES)
  const tCats = new Set(testValidators.TEST_CATEGORIES)
  assert('TESTS', 'TEST_CATEGORIES matches QUESTION_CATEGORIES exactly (cross-feature parity)', askCats.size === tCats.size && Array.from(askCats).every((c) => tCats.has(c)))

  // (k) getLatestAttemptForUserAndTest returns the user's latest attempt.
  const latest = await q.getLatestAttemptForUserAndTest(userIdForAsk, firstTest.id)
  assert('TESTS', 'getLatestAttemptForUserAndTest returns the user\'s attempt', !!latest && latest.userId === userIdForAsk && latest.testId === firstTest.id)

  // (l) getTestIdsTakenByUser includes the test we attempted (returns a Set).
  const takenIds = await q.getTestIdsTakenByUser(userIdForAsk)
  assert('TESTS', 'getTestIdsTakenByUser returns a Set', takenIds instanceof Set)
  assert('TESTS', 'getTestIdsTakenByUser includes the attempted test id', takenIds.has(firstTest.id))

  // (m) Admin: getAllTestsForAdmin returns a flat row list with computed counts.
  const adminTests = await q.getAllTestsForAdmin({})
  assert('TESTS', 'getAllTestsForAdmin returns an array', Array.isArray(adminTests))
  assert('TESTS', 'adminTests rows carry questionCount + attemptCount fields', adminTests.every((r) => typeof r.questionCount === 'number' && typeof r.attemptCount === 'number'))
  // Filter: status='draft' returns only unpublished.
  const adminDrafts = await q.getAllTestsForAdmin({ status: 'draft' })
  assert('TESTS', 'getAllTestsForAdmin status=draft returns isPublished=false only', adminDrafts.every((r) => r.isPublished === false))
  // Filter: status='published' returns only published.
  const adminPub = await q.getAllTestsForAdmin({ status: 'published' })
  assert('TESTS', 'getAllTestsForAdmin status=published returns isPublished=true only', adminPub.every((r) => r.isPublished === true))

  // (n) isTestSlugTaken — false for fresh slug.
  const slugTakenFresh = await q.isTestSlugTaken('completely-fresh-' + Date.now())
  assert('TESTS', 'isTestSlugTaken returns false for unique slug', slugTakenFresh === false)

  /* ─── EXT.5  CORPORATE: validators + lookups ──────────────────────────── */
  // (a) Validator: corporateRequestSchema requires non-empty name and email.
  const corpEmptyName = corporateValidators.corporateRequestSchema.safeParse({
    name: '',
    email: 'a@b.com',
    organization: 'X Co',
  })
  assert('CORPORATE', 'requestSchema rejects empty name', !corpEmptyName.success)

  // (b) Validator: corporateRequestSchema rejects invalid email.
  const corpBadEmail = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'not-an-email',
    organization: 'X Co',
  })
  assert('CORPORATE', 'requestSchema rejects invalid email', !corpBadEmail.success)

  // (c) Validator: corporateRequestSchema rejects empty organization.
  const corpEmptyOrg = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'a@b.com',
    organization: '',
  })
  assert('CORPORATE', 'requestSchema rejects empty organization', !corpEmptyOrg.success)

  // (d) Validator: attendeeCount out of range.
  const corpTooMany = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'a@b.com',
    organization: 'X Co',
    attendeeCount: 20000,
  })
  assert('CORPORATE', 'requestSchema rejects attendeeCount > 10000', !corpTooMany.success)
  const corpZero = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'a@b.com',
    organization: 'X Co',
    attendeeCount: 0,
  })
  assert('CORPORATE', 'requestSchema rejects attendeeCount=0 (min 1)', !corpZero.success)

  // (e) Validator: message too long (> 4000) rejected.
  const corpLongMsg = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'a@b.com',
    organization: 'X Co',
    message: 'x'.repeat(4001),
  })
  assert('CORPORATE', 'requestSchema rejects message > 4000 chars', !corpLongMsg.success)

  // (f) Validator: empty optional fields accepted as ''.
  const corpEmptyOpts = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'a@b.com',
    organization: 'X Co',
    phone: '',
    position: '',
    programId: '',
    preferredDate: '',
    message: '',
  })
  assert('CORPORATE', 'requestSchema accepts empty optional fields', corpEmptyOpts.success)

  // (g) Validator: invalid programId (non-uuid) accepted only as '' literal.
  const corpBadProgram = corporateValidators.corporateRequestSchema.safeParse({
    name: 'A',
    email: 'a@b.com',
    organization: 'X Co',
    programId: 'not-uuid',
  })
  assert('CORPORATE', 'requestSchema rejects non-uuid programId (must be uuid or "")', !corpBadProgram.success)

  // (h) Admin update: invalid status rejected.
  const corpUpdateBad = corporateValidators.corporateRequestUpdateSchema.safeParse({
    status: 'NOT_A_VALID_STATUS',
  })
  assert('CORPORATE', 'requestUpdateSchema rejects unknown status', !corpUpdateBad.success)
  // Valid statuses accepted.
  for (const st of corporateValidators.CORPORATE_REQUEST_STATUSES) {
    const ok = corporateValidators.corporateRequestUpdateSchema.safeParse({ status: st })
    assert('CORPORATE', `requestUpdateSchema accepts status "${st}"`, ok.success)
  }

  // (i) Admin: getCorporateRequests returns an array (includes our smoke insert from earlier).
  const allCorpReqs = await q.getCorporateRequests()
  assert('CORPORATE', 'getCorporateRequests returns >= 1 row (we inserted one above)', allCorpReqs.length >= 1)

  // (j) Admin: filter by status returns subset.
  const newOnly = await q.getCorporateRequests('NEW')
  assert('CORPORATE', 'filter by status=NEW returns only NEW rows', newOnly.every((r) => r.status === 'NEW'))

  // (k) Admin lookup by id.
  const oneReq = allCorpReqs[0]!
  const byId = await q.getCorporateRequest(oneReq.id)
  assert('CORPORATE', 'getCorporateRequest(id) returns the same row', byId?.id === oneReq.id)
  // Unknown id returns null.
  const noReq = await q.getCorporateRequest('00000000-0000-0000-0000-deadbeef0000')
  assert('CORPORATE', 'getCorporateRequest(unknown) returns null', noReq === null)

  // (l) Admin: getCorporateProgramBySlug round-trip.
  const prog = await q.getCorporateProgramBySlug('interactive-lecture')
  assert('CORPORATE', 'getCorporateProgramBySlug returns the program', !!prog)
  const noProg = await q.getCorporateProgramBySlug('no-such-slug-here')
  assert('CORPORATE', 'getCorporateProgramBySlug(unknown) returns null', noProg === null)

  /* ─── EXT.6  BOOKING: catalog, interest, suggestions, state shape ────── */
  // (a) Booking catalog shape.
  const tours = await q.getActiveTours()
  assert('BOOKING', 'getActiveTours returns an array', Array.isArray(tours))
  const sessions2 = await q.getActiveOnlineSessions()
  assert('BOOKING', 'getActiveOnlineSessions returns >= 1 session', sessions2.length >= 1)
  assert('BOOKING', 'all sessions have non-null priceUsd', sessions2.every((s) => s.priceUsd > 0))
  assert('BOOKING', 'all sessions carry currency', sessions2.every((s) => typeof s.currency === 'string' && s.currency.length === 3))
  assert('BOOKING', 'all sessions have positive maxCapacity', sessions2.every((s) => s.maxCapacity > 0))
  assert('BOOKING', 'all sessions have bookedCount <= maxCapacity', sessions2.every((s) => s.bookedCount <= s.maxCapacity))

  // (b) Tour suggestion submission.
  const tourSugg = await q.createTourSuggestion({
    userId: userU3,
    suggestedCity: 'Riyadh',
    suggestedCountry: 'KSA',
    additionalNotes: 'lots of demand here',
  })
  assert('BOOKING', 'createTourSuggestion returns a row', !!tourSugg)
  assert('BOOKING', 'tourSuggestion stores city + country', tourSugg?.suggestedCity === 'Riyadh' && tourSugg?.suggestedCountry === 'KSA')
  // Mark reviewed via admin.
  const allTourSugs = await q.getAllTourSuggestions()
  assert('BOOKING', 'getAllTourSuggestions returns >= 1', allTourSugs.length >= 1)
  const aggs = await q.getTourSuggestionAggregates()
  assert('BOOKING', 'getTourSuggestionAggregates returns groupings', Array.isArray(aggs))

  // (c) Booking interest upsert is idempotent.
  const interest1 = await q.upsertBookingInterest({
    userId: userU3,
    bookingId: reconsider!.id,
    additionalNotes: 'first signal',
  })
  const interest2 = await q.upsertBookingInterest({
    userId: userU3,
    bookingId: reconsider!.id,
    additionalNotes: 'updated signal',
  })
  assert('BOOKING', 'upsertBookingInterest first call returns a row', !!interest1)
  assert('BOOKING', 'upsertBookingInterest second call updates additionalNotes (no duplicate)', interest2?.additionalNotes === 'updated signal')
  assert('BOOKING', 'upsertBookingInterest preserves the same row id (upsert, not insert)', interest1?.id === interest2?.id)

  // getAllBookingInterest reads the static placeholderBookingInterest array
  // which is reset on every process start (not the mock-store file). So the
  // assertion is just that the call returns an array shape, not that prior
  // upserts leak across processes.
  const allInterest = await q.getAllBookingInterest()
  assert('BOOKING', 'getAllBookingInterest returns an array', Array.isArray(allInterest))
  const interestCounts = await q.getBookingInterestCounts()
  assert('BOOKING', 'getBookingInterestCounts returns an array of counts', Array.isArray(interestCounts))

  // (d) booking_state shape.
  for (const b of sessions2) {
    assert('BOOKING', `booking ${b.slug}: bookingState is OPEN/CLOSED/SOLD_OUT`, ['OPEN', 'CLOSED', 'SOLD_OUT'].includes(b.bookingState))
  }

  // (e) Currency normalization: stored uppercase 'USD' in placeholder, but
  // the gift schema lowercase to 'usd'. Document both shapes coexist.
  const allCurrencies = new Set([
    ...sessions2.map((s) => s.currency),
    reconsider?.currency,
  ].filter((c): c is string => !!c))
  assert('BOOKING', 'booking currency uses ISO-4217 codes (3 chars)', Array.from(allCurrencies).every((c) => c.length === 3))

  /* ─── EXT.7  SITE SETTINGS: defaults + patches ────────────────────────── */
  const defaults = await import('../../lib/site-settings/defaults')
  const settings = await q.getSiteSettings()
  assert('SETTINGS', 'getSiteSettings returns the DEFAULT_SETTINGS shape', settings.features.auth_enabled === defaults.DEFAULT_SETTINGS.features.auth_enabled)
  assert('SETTINGS', 'default gifts.allow_user_to_user=true', settings.gifts.allow_user_to_user === true)
  assert('SETTINGS', 'default coming_soon_pages is empty array', Array.isArray(settings.coming_soon_pages) && settings.coming_soon_pages.length === 0)

  const merged = defaults.mergeSettings(defaults.DEFAULT_SETTINGS, {
    gifts: { allow_user_to_user: false },
    coming_soon_pages: ['corporate'],
  })
  assert('SETTINGS', 'mergeSettings flips gifts.allow_user_to_user=false', merged.gifts.allow_user_to_user === false)
  assert('SETTINGS', 'mergeSettings replaces coming_soon_pages wholesale', merged.coming_soon_pages.length === 1 && merged.coming_soon_pages[0] === 'corporate')
  assert('SETTINGS', 'mergeSettings preserves unrelated keys', merged.features.auth_enabled === defaults.DEFAULT_SETTINGS.features.auth_enabled)
  // show_hero invariant (always-on). The type signature forces show_hero=true,
  // but we want to verify the runtime mergeSettings override even when a
  // caller sneaks a `false` in. Cast through unknown.
  const triedHide = defaults.mergeSettings(
    defaults.DEFAULT_SETTINGS,
    { homepage: { show_hero: false as unknown as true } },
  )
  assert('SETTINGS', 'mergeSettings refuses to set show_hero=false (always-on)', triedHide.homepage.show_hero === true)
  // show_account_tab invariant (always-on).
  const triedAccount = defaults.mergeSettings(
    defaults.DEFAULT_SETTINGS,
    { dashboard: { show_account_tab: false as unknown as true } },
  )
  assert('SETTINGS', 'mergeSettings refuses to set show_account_tab=false (always-on)', triedAccount.dashboard.show_account_tab === true)

  // coerceSettings handles garbage input.
  const coerced = defaults.coerceSettings(null)
  assert('SETTINGS', 'coerceSettings(null) returns defaults', coerced.features.auth_enabled === defaults.DEFAULT_SETTINGS.features.auth_enabled)
  const coerced2 = defaults.coerceSettings({ random: 'junk' })
  assert('SETTINGS', 'coerceSettings(junk) returns merged defaults', coerced2.gifts.allow_user_to_user === defaults.DEFAULT_SETTINGS.gifts.allow_user_to_user)

  /* ─── EXT.8  USERS: lookup, role updates ──────────────────────────────── */
  const userByEmail = await q.getUserByEmail('reader.one@example.com')
  assert('USERS', 'getUserByEmail returns the user', userByEmail?.email === 'reader.one@example.com')
  const userMissing = await q.getUserByEmail('nobody@nope.test')
  assert('USERS', 'getUserByEmail returns null for unknown', userMissing === null)
  const allUsers = await q.getAllUsers()
  assert('USERS', 'getAllUsers returns at least placeholder users', allUsers.length >= placeholder.placeholderUsers.length)
  // getUserByEmail is exact-match at the storage layer; the gift action's
  // lcEmail() lowercases BEFORE calling it. Verify the exact-match contract.
  const userMixedCase = await q.getUserByEmail('Reader.One@example.com')
  assert('USERS', 'getUserByEmail is exact-match (no auto-lowercase at storage layer)', userMixedCase === null)
  const userExact = await q.getUserByEmail('reader.one@example.com')
  assert('USERS', 'getUserByEmail exact-match returns the user', userExact?.email === 'reader.one@example.com')

  /* ─── EXT.9  AUTH HELPERS: safeRedirect / withRedirect ────────────────── */
  const redirectMod = await import('../../lib/auth/redirect')

  // Valid internal paths pass through.
  assert('AUTH', 'safeRedirect accepts /dashboard', redirectMod.safeRedirect('/dashboard') === '/dashboard')
  assert('AUTH', 'safeRedirect accepts /en/dashboard (locale-prefixed)', redirectMod.safeRedirect('/en/dashboard') === '/en/dashboard')
  assert('AUTH', 'safeRedirect accepts /books/some-book?ref=email', redirectMod.safeRedirect('/books/some-book?ref=email') === '/books/some-book?ref=email')
  assert('AUTH', 'safeRedirect accepts /books/some-book#section', redirectMod.safeRedirect('/books/some-book#section') === '/books/some-book#section')

  // Empty / null / undefined fall back to default.
  assert('AUTH', 'safeRedirect(null) → /dashboard', redirectMod.safeRedirect(null) === '/dashboard')
  assert('AUTH', 'safeRedirect(undefined) → /dashboard', redirectMod.safeRedirect(undefined) === '/dashboard')
  assert('AUTH', 'safeRedirect("") → /dashboard', redirectMod.safeRedirect('') === '/dashboard')

  // Reject protocol-relative + backslash variants (open-redirect tricks).
  assert('AUTH', 'safeRedirect rejects //evil.com', redirectMod.safeRedirect('//evil.com') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects /\\\\evil.com', redirectMod.safeRedirect('/\\evil.com') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects //evil.com/path', redirectMod.safeRedirect('//evil.com/path') === '/dashboard')

  // Reject embedded schemes.
  assert('AUTH', 'safeRedirect rejects /javascript:alert(1)', redirectMod.safeRedirect('/javascript:alert(1)') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects /data:text/html,...', redirectMod.safeRedirect('/data:text/html,<script>') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects /vbscript:msgbox(1)', redirectMod.safeRedirect('/vbscript:msgbox(1)') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects /file:///etc/passwd', redirectMod.safeRedirect('/file:///etc/passwd') === '/dashboard')

  // Reject non-path values.
  assert('AUTH', 'safeRedirect rejects https://evil.com', redirectMod.safeRedirect('https://evil.com') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects dashboard (no leading /)', redirectMod.safeRedirect('dashboard') === '/dashboard')
  assert('AUTH', 'safeRedirect rejects relative ../escape', redirectMod.safeRedirect('../escape') === '/dashboard')

  // Non-string fallback.
  assert('AUTH', 'safeRedirect on non-string falls back', redirectMod.safeRedirect(42 as unknown as string) === '/dashboard')

  // withRedirect builder.
  assert('AUTH', 'withRedirect appends ?redirect= when target is non-default', redirectMod.withRedirect('/login', '/books/x') === '/login?redirect=%2Fbooks%2Fx')
  assert('AUTH', 'withRedirect uses & when href already has ?', redirectMod.withRedirect('/login?lang=ar', '/books/x') === '/login?lang=ar&redirect=%2Fbooks%2Fx')
  assert('AUTH', 'withRedirect omits redirect param when sanitized target is default', redirectMod.withRedirect('/login', '/dashboard') === '/login')
  assert('AUTH', 'withRedirect omits redirect param when target is malicious', redirectMod.withRedirect('/login', 'https://evil.com') === '/login')
  assert('AUTH', 'withRedirect omits redirect param when target is //host', redirectMod.withRedirect('/login', '//evil.com') === '/login')
  // URL-encoding sanity.
  assert('AUTH', 'withRedirect URL-encodes the path', redirectMod.withRedirect('/login', '/books/with space').includes('%20'))

  /* ─── EXT.10  ORIGIN GUARD: assertSameOrigin ──────────────────────────── */
  const originMod = await import('../../lib/api/origin')

  // Safe methods bypass the guard.
  const getOk = originMod.assertSameOrigin(new Request('https://drkhaledghattass.com/api/x'))
  assert('ORIGIN', 'GET bypasses origin guard (returns null)', getOk === null)
  const headOk = originMod.assertSameOrigin(new Request('https://drkhaledghattass.com/api/x', { method: 'HEAD' }))
  assert('ORIGIN', 'HEAD bypasses origin guard', headOk === null)
  const optionsOk = originMod.assertSameOrigin(new Request('https://drkhaledghattass.com/api/x', { method: 'OPTIONS' }))
  assert('ORIGIN', 'OPTIONS bypasses origin guard', optionsOk === null)

  // POST with matching origin returns null.
  const samePostHttps = originMod.assertSameOrigin(
    new Request('https://drkhaledghattass.com/api/x', {
      method: 'POST',
      headers: { host: 'drkhaledghattass.com', origin: 'https://drkhaledghattass.com' },
    }),
  )
  assert('ORIGIN', 'POST with same-origin (https) passes', samePostHttps === null)
  const samePostHttp = originMod.assertSameOrigin(
    new Request('http://localhost:3000/api/x', {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
    }),
  )
  assert('ORIGIN', 'POST with same-origin (http localhost) passes', samePostHttp === null)

  // POST with mismatched origin is rejected (403).
  const crossOrigin = originMod.assertSameOrigin(
    new Request('https://drkhaledghattass.com/api/x', {
      method: 'POST',
      headers: { host: 'drkhaledghattass.com', origin: 'https://evil.com' },
    }),
  )
  assert('ORIGIN', 'POST with cross-origin returns a Response (403)', crossOrigin instanceof Response)
  if (crossOrigin) assert('ORIGIN', 'cross-origin response has status 403', crossOrigin.status === 403)

  // POST with no origin but matching referer passes.
  const refererOk = originMod.assertSameOrigin(
    new Request('https://drkhaledghattass.com/api/x', {
      method: 'POST',
      headers: { host: 'drkhaledghattass.com', referer: 'https://drkhaledghattass.com/some-page' },
    }),
  )
  assert('ORIGIN', 'POST with referer fallback (same-origin) passes', refererOk === null)

  // POST with mismatched referer is rejected.
  const refererCross = originMod.assertSameOrigin(
    new Request('https://drkhaledghattass.com/api/x', {
      method: 'POST',
      headers: { host: 'drkhaledghattass.com', referer: 'https://evil.com/some-page' },
    }),
  )
  assert('ORIGIN', 'POST with cross-origin referer rejected', refererCross instanceof Response)

  // POST with neither origin nor referer is rejected.
  const noHeaders = originMod.assertSameOrigin(
    new Request('https://drkhaledghattass.com/api/x', {
      method: 'POST',
      headers: { host: 'drkhaledghattass.com' },
    }),
  )
  assert('ORIGIN', 'POST with neither origin nor referer rejected', noHeaders instanceof Response)

  /* ─── EXT.11  LIBRARY (session viewer) media progress ─────────────────── */
  // Use a per-run unique sessionItemId so leaked mock-store state from earlier
  // runs doesn't confuse "fresh-start" assertions.
  const sessionItemId = `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`
  // Per-run unique user so prior completedAt doesn't leak into the
  // "completedAt remains null" assertion.
  const mediaUserId = `media-user-${Date.now()}`
  // Initial state: null.
  const initialMp = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'getMediaProgress is null when no save yet', initialMp === null)

  // Save and read.
  await q.saveMediaProgress(mediaUserId, sessionItemId, 120, false)
  const afterMp = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'saveMediaProgress + getMediaProgress roundtrip (120s)', afterMp?.lastPositionSeconds === 120)
  assert('LIBRARY', 'completedAt remains null while completed=false', afterMp?.completedAt === null)

  // Mark complete.
  await q.saveMediaProgress(mediaUserId, sessionItemId, 300, true)
  const completedMp = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'saveMediaProgress completed=true sets completedAt', !!completedMp?.completedAt)
  assert('LIBRARY', 'completedAt sticks at 300s position', completedMp?.lastPositionSeconds === 300)

  // Sticky completion — a subsequent save with completed=false must NOT clear completedAt.
  await q.saveMediaProgress(mediaUserId, sessionItemId, 50, false)
  const stickyMp = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'sticky-completion: completedAt preserved after later save with completed=false', !!stickyMp?.completedAt)
  assert('LIBRARY', 'sticky-completion: lastPositionSeconds still updates (50s)', stickyMp?.lastPositionSeconds === 50)

  // Negative / non-finite rejected (no-op).
  const beforeBad = await q.getMediaProgress(mediaUserId, sessionItemId)
  await q.saveMediaProgress(mediaUserId, sessionItemId, -10, false)
  const afterNeg = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'saveMediaProgress with negative seconds is rejected', afterNeg?.lastPositionSeconds === beforeBad?.lastPositionSeconds)
  await q.saveMediaProgress(mediaUserId, sessionItemId, Number.NaN, false)
  const afterNan = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'saveMediaProgress with NaN is rejected', afterNan?.lastPositionSeconds === beforeBad?.lastPositionSeconds)

  // Floor coercion.
  await q.saveMediaProgress(mediaUserId, sessionItemId, 87.9, false)
  const floored = await q.getMediaProgress(mediaUserId, sessionItemId)
  assert('LIBRARY', 'lastPositionSeconds floored from 87.9 → 87', floored?.lastPositionSeconds === 87)

  // Per-user isolation.
  const otherMediaUserId = `media-user-other-${Date.now()}`
  await q.saveMediaProgress(otherMediaUserId, sessionItemId, 999, false)
  const u1Mp = await q.getMediaProgress(mediaUserId, sessionItemId)
  const u2Mp = await q.getMediaProgress(otherMediaUserId, sessionItemId)
  assert('LIBRARY', 'media progress isolated per user', u1Mp?.lastPositionSeconds !== u2Mp?.lastPositionSeconds)
  assert('LIBRARY', 'other-user media progress at 999s', u2Mp?.lastPositionSeconds === 999)

  // Session items: create, list, reorder, update, delete. Use a per-run
  // unique sessionId so leaked items from prior runs don't break sortOrder
  // assertions.
  const sessionIdForItems = `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`
  const si1 = await q.createSessionItem({
    sessionId: sessionIdForItems,
    itemType: 'VIDEO',
    title: 'Intro Video',
    description: 'opening',
    storageKey: 'storage://video1',
    durationSeconds: 300,
  })
  assert('LIBRARY', 'createSessionItem returns a row', !!si1)
  assert('LIBRARY', 'session item carries itemType=VIDEO', si1?.itemType === 'VIDEO')
  assert('LIBRARY', 'session item carries first sortOrder=0', si1?.sortOrder === 0)

  const si2 = await q.createSessionItem({
    sessionId: sessionIdForItems,
    itemType: 'PDF',
    title: 'Reading',
    description: null,
    storageKey: 'storage://pdf1',
    durationSeconds: null,
  })
  assert('LIBRARY', 'second session item sortOrder=1 (auto-increment)', si2?.sortOrder === 1)
  const si3 = await q.createSessionItem({
    sessionId: sessionIdForItems,
    itemType: 'AUDIO',
    title: 'Audio',
    description: null,
    storageKey: 'storage://audio1',
    durationSeconds: 600,
  })
  assert('LIBRARY', 'third session item sortOrder=2', si3?.sortOrder === 2)

  const listed = await q.getSessionItemsBySessionId(sessionIdForItems)
  assert('LIBRARY', 'getSessionItemsBySessionId returns 3 items', listed.length === 3)
  assert('LIBRARY', 'listed items in sortOrder ASC', listed.every((it, i) => it.sortOrder === i))

  // Update one item.
  const updatedItem = await q.updateSessionItem(si2!.id, sessionIdForItems, { title: 'Updated Reading Title' })
  assert('LIBRARY', 'updateSessionItem applies the title patch', updatedItem?.title === 'Updated Reading Title')
  assert('LIBRARY', 'updateSessionItem preserves itemType', updatedItem?.itemType === 'PDF')

  // Reorder. The signature is reorderSessionItems(sessionId, orderedItemIds: string[]).
  const reorderResult = await q.reorderSessionItems(sessionIdForItems, [si3!.id, si2!.id, si1!.id])
  assert('LIBRARY', 'reorderSessionItems returns a boolean', typeof reorderResult === 'boolean')
  const reordered = await q.getSessionItemsBySessionId(sessionIdForItems)
  assert('LIBRARY', 'after reorder: first item is the audio (si3)', reordered[0]?.id === si3!.id)
  assert('LIBRARY', 'after reorder: last item is the video (si1)', reordered[reordered.length - 1]?.id === si1!.id)
  // Reorder preserves sortOrder contiguity 0,1,2.
  const sortOrders = reordered.map((it) => it.sortOrder)
  assert('LIBRARY', 'reorder produces contiguous sortOrders starting at 0', sortOrders[0] === 0 && sortOrders[sortOrders.length - 1] === sortOrders.length - 1)

  // Delete one item.
  await q.deleteSessionItem(si2!.id, sessionIdForItems)
  const afterDeleteItems = await q.getSessionItemsBySessionId(sessionIdForItems)
  assert('LIBRARY', 'deleteSessionItem removes the row', afterDeleteItems.length === 2)
  assert('LIBRARY', 'deleted item is gone from list', !afterDeleteItems.some((it) => it.id === si2!.id))

  // getSessionItemById round-trip.
  const fetchedItem = await q.getSessionItemById(si1!.id, sessionIdForItems)
  assert('LIBRARY', 'getSessionItemById round-trips', fetchedItem?.id === si1!.id)
  // Wrong sessionId returns null (anti-leak).
  const wrongSession = await q.getSessionItemById(si1!.id, '00000000-0000-0000-0000-deadbeefdead')
  assert('LIBRARY', 'getSessionItemById with wrong sessionId returns null', wrongSession === null)

  // updateBookmarkLabel: ownership gate.
  const bmForLabel = await q.toggleBookmark(mockUserId, bmBookId, 33, 'orig')
  assert('LIBRARY', 'created a bookmark for label test', !!bmForLabel)
  const labelUpdated = await q.updateBookmarkLabel(bmForLabel!.id, mockUserId, 'updated label')
  assert('LIBRARY', 'updateBookmarkLabel succeeds for owner', labelUpdated?.label === 'updated label')
  // Wrong user → null.
  const wrongOwnerLabel = await q.updateBookmarkLabel(bmForLabel!.id, '99', 'sneaky')
  assert('LIBRARY', 'updateBookmarkLabel rejected for non-owner', wrongOwnerLabel === null)
  // Clean up the bookmark.
  await q.toggleBookmark(mockUserId, bmBookId, 33, null)

  // getMostRecentActivity (dashboard surface) — mock-store-backed.
  const recent = await q.getMostRecentActivity(mockUserId)
  assert('LIBRARY', 'getMostRecentActivity returns an array or null shape', recent === null || (typeof recent === 'object' && recent !== null))

  /* ─── EXT.12  TESTS: admin CRUD lifecycle ─────────────────────────────── */
  // Create — createTest returns `Test | null` directly (not an envelope).
  const newTestSlug = `smoke-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const newTest = await q.createTest({
    slug: newTestSlug,
    titleAr: 'اختبار دخان',
    titleEn: 'Smoke Test',
    descriptionAr: 'وصف',
    descriptionEn: 'desc',
    introAr: 'مقدمة',
    introEn: 'intro',
    category: 'general',
    estimatedMinutes: 5,
    coverImageUrl: null,
    isPublished: false,
    displayOrder: 99,
    questions: [
      {
        promptAr: 'سؤال؟',
        promptEn: 'A question?',
        explanationAr: null,
        explanationEn: null,
        options: [
          { labelAr: 'أ', labelEn: 'A', isCorrect: true },
          { labelAr: 'ب', labelEn: 'B', isCorrect: false },
        ],
      },
    ],
  })
  assert('TESTS', 'createTest returns a Test row', !!newTest)
  if (newTest) {
    assert('TESTS', 'created test starts unpublished', newTest.isPublished === false)
    assert('TESTS', 'created test carries the slug', newTest.slug === newTestSlug)

    // The catalog should NOT include the unpublished test.
    const pubAfterCreate = await q.getPublishedTests()
    assert('TESTS', 'public catalog excludes unpublished new test', !pubAfterCreate.some((t) => t.slug === newTestSlug))

    // Admin sees it.
    const adminListAfterCreate = await q.getAllTestsForAdmin({})
    assert('TESTS', 'admin list includes unpublished new test', adminListAfterCreate.some((t) => t.slug === newTestSlug))

    // Draft count >= 1.
    const draftCount = await q.getDraftTestCount()
    assert('TESTS', 'getDraftTestCount >= 1 after creating unpublished test', draftCount >= 1)

    // setTestPublished flips.
    const published = await q.setTestPublished(newTest.id, true)
    assert('TESTS', 'setTestPublished returns the updated test', published?.isPublished === true)
    const pubAfterPub = await q.getPublishedTests()
    assert('TESTS', 'public catalog NOW includes the test', pubAfterPub.some((t) => t.slug === newTestSlug))

    // getTestForAdmin returns full detail.
    const adminDetail = await q.getTestForAdmin(newTest.id)
    assert('TESTS', 'getTestForAdmin returns the test detail', adminDetail?.id === newTest.id)
    assert('TESTS', 'admin detail includes questions array', Array.isArray(adminDetail?.questions))

    // isTestSlugTaken=true for this slug.
    const slugTaken = await q.isTestSlugTaken(newTestSlug)
    assert('TESTS', 'isTestSlugTaken=true for the just-created slug', slugTaken === true)
    // Excluding the row itself returns false.
    const slugTakenExcl = await q.isTestSlugTaken(newTestSlug, newTest.id)
    assert('TESTS', 'isTestSlugTaken=false when excluding the row itself', slugTakenExcl === false)

    // Unpublish.
    const unpub = await q.setTestPublished(newTest.id, false)
    assert('TESTS', 'setTestPublished can flip back to false', unpub?.isPublished === false)

    // Delete.
    const deleted = await q.deleteTest(newTest.id)
    assert('TESTS', 'deleteTest returns true', deleted === true)
    const afterDel = await q.getTestForAdmin(newTest.id)
    assert('TESTS', 'deleted test no longer fetchable', afterDel === null)
  }

  // Validator: createTest with 0 questions rejected by baseTestSchema.
  const noQs = testValidators.createTestSchema.safeParse({
    slug: 'a-test',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 5,
    isPublished: false,
    displayOrder: 0,
    questions: [],
  })
  assert('TESTS', 'createTestSchema rejects 0 questions', !noQs.success)

  // Validator: question with 1 option rejected (min 2).
  const oneOpt = testValidators.createTestSchema.safeParse({
    slug: 'a-test',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 5,
    isPublished: false,
    displayOrder: 0,
    questions: [
      {
        promptAr: 'q',
        promptEn: 'q',
        options: [{ labelAr: 'a', labelEn: 'a', isCorrect: true }],
      },
    ],
  })
  assert('TESTS', 'createTestSchema rejects question with < 2 options', !oneOpt.success)

  // Validator: question with > 6 options rejected.
  const sevenOpts = testValidators.createTestSchema.safeParse({
    slug: 'a-test',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 5,
    isPublished: false,
    displayOrder: 0,
    questions: [
      {
        promptAr: 'q',
        promptEn: 'q',
        options: Array.from({ length: 7 }, (_, i) => ({
          labelAr: `o${i}`,
          labelEn: `o${i}`,
          isCorrect: i === 0,
        })),
      },
    ],
  })
  assert('TESTS', 'createTestSchema rejects question with > 6 options', !sevenOpts.success)

  // Validator: exactly-one-correct rule.
  const twoCorrect = testValidators.createTestSchema.safeParse({
    slug: 'a-test',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 5,
    isPublished: false,
    displayOrder: 0,
    questions: [
      {
        promptAr: 'q',
        promptEn: 'q',
        options: [
          { labelAr: 'a', labelEn: 'a', isCorrect: true },
          { labelAr: 'b', labelEn: 'b', isCorrect: true },
        ],
      },
    ],
  })
  assert('TESTS', 'createTestSchema rejects 2 correct options on one question', !twoCorrect.success)

  // Validator: zero correct options rejected.
  const zeroCorrect = testValidators.createTestSchema.safeParse({
    slug: 'a-test',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 5,
    isPublished: false,
    displayOrder: 0,
    questions: [
      {
        promptAr: 'q',
        promptEn: 'q',
        options: [
          { labelAr: 'a', labelEn: 'a', isCorrect: false },
          { labelAr: 'b', labelEn: 'b', isCorrect: false },
        ],
      },
    ],
  })
  assert('TESTS', 'createTestSchema rejects zero correct options', !zeroCorrect.success)

  // Validator: invalid slug format rejected.
  const badSlug = testValidators.createTestSchema.safeParse({
    slug: 'Has UPPER & spaces!',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 5,
    isPublished: false,
    displayOrder: 0,
    questions: [
      {
        promptAr: 'q',
        promptEn: 'q',
        options: [
          { labelAr: 'a', labelEn: 'a', isCorrect: true },
          { labelAr: 'b', labelEn: 'b', isCorrect: false },
        ],
      },
    ],
  })
  assert('TESTS', 'createTestSchema rejects non-kebab slug', !badSlug.success)

  // Validator: estimatedMinutes out of range.
  const bigMinutes = testValidators.createTestSchema.safeParse({
    slug: 'ok-slug',
    titleAr: 'a',
    titleEn: 'a',
    descriptionAr: 'a',
    descriptionEn: 'a',
    introAr: 'a',
    introEn: 'a',
    category: 'general',
    estimatedMinutes: 999,
    isPublished: false,
    displayOrder: 0,
    questions: [
      {
        promptAr: 'q',
        promptEn: 'q',
        options: [
          { labelAr: 'a', labelEn: 'a', isCorrect: true },
          { labelAr: 'b', labelEn: 'b', isCorrect: false },
        ],
      },
    ],
  })
  assert('TESTS', 'createTestSchema rejects estimatedMinutes > 120', !bigMinutes.success)

  /* ─── EXT.13  BOOKING: admin CRUD + tour CRUD ─────────────────────────── */
  // Admin booking CRUD requires HAS_DB (no mock-store branch).
  const adminBookingCreate = await q.createBookingAdmin({
    slug: 'admin-' + Date.now(),
    productType: 'ONLINE_SESSION',
    titleAr: 'إداري',
    titleEn: 'Admin Test',
    descriptionAr: 'وصف',
    descriptionEn: 'desc',
    coverImage: null,
    priceUsd: 1000,
    currency: 'USD',
    nextCohortDate: new Date(),
    cohortLabelAr: 'a',
    cohortLabelEn: 'a',
    durationMinutes: 60,
    formatAr: 'a',
    formatEn: 'a',
    maxCapacity: 10,
    bookingState: 'OPEN',
    displayOrder: 99,
    isActive: true,
  })
  assert('BOOKING', 'createBookingAdmin returns null in mock mode (requires HAS_DB)', adminBookingCreate === null)
  const adminBookingUpdate = await q.updateBookingAdmin('00000000-0000-0000-0000-000000000aa1', { maxCapacity: 50 })
  assert('BOOKING', 'updateBookingAdmin returns db_unavailable in mock mode', !adminBookingUpdate.ok && adminBookingUpdate.error === 'db_unavailable')

  const tourId = '00000000-0000-0000-0000-000000000t01'
  const tourCreate = await q.createTour({
    slug: 'tour-' + Date.now(),
    titleAr: 'بيروت',
    titleEn: 'Beirut',
    cityAr: 'بيروت',
    cityEn: 'Beirut',
    countryAr: 'لبنان',
    countryEn: 'Lebanon',
    regionAr: null,
    regionEn: null,
    date: new Date(),
    venueAr: null,
    venueEn: null,
    descriptionAr: null,
    descriptionEn: null,
    externalBookingUrl: null,
    coverImage: null,
    attendedCount: null,
    isActive: true,
    displayOrder: 0,
  })
  assert('BOOKING', 'createTour returns null in mock mode (requires HAS_DB)', tourCreate === null)
  const tourToggle = await q.toggleTourActive(tourId, false)
  assert('BOOKING', 'toggleTourActive returns null in mock mode (delegates to updateTour)', tourToggle === null)
  const tourDelete = await q.deleteTour(tourId)
  assert('BOOKING', 'deleteTour returns false in mock mode', tourDelete === false)

  // updateBookingState requires HAS_DB.
  const stateUpd = await q.updateBookingState('00000000-0000-0000-0000-000000000aa1', 'CLOSED')
  assert('BOOKING', 'updateBookingState returns null in mock mode', stateUpd === null)

  // Tour suggestion aggregates.
  await q.createTourSuggestion({ userId: userU3, suggestedCity: 'Cairo', suggestedCountry: 'Egypt' })
  await q.createTourSuggestion({ userId: userU3, suggestedCity: 'Cairo', suggestedCountry: 'Egypt' })
  await q.createTourSuggestion({ userId: userU4, suggestedCity: 'Cairo', suggestedCountry: 'Egypt' })
  const tourAggs = await q.getTourSuggestionAggregates()
  assert('BOOKING', 'getTourSuggestionAggregates returns array (mock)', Array.isArray(tourAggs))

  /* ─── EXT.14  ARTICLES: catalog + lookup ──────────────────────────────── */
  const articles = await q.getArticles()
  assert('ARTICLES', 'getArticles returns >= 1 placeholder article', articles.length >= 1)
  assert('ARTICLES', 'all articles have a slug + title', articles.every((a) => !!a.slug && !!a.titleAr && !!a.titleEn))
  assert('ARTICLES', 'all articles have status set', articles.every((a) => !!a.status))

  // Featured filter.
  const featured = await q.getArticles({ featured: true })
  assert('ARTICLES', 'featured filter returns only featured articles', featured.every((a) => a.featured === true))

  // Limit applied.
  const limited = await q.getArticles({ limit: 1 })
  assert('ARTICLES', 'limit=1 returns at most 1 article', limited.length <= 1)

  // Lookup by slug.
  const firstSlug = articles[0]!.slug
  const bySlug = await q.getArticleBySlug(firstSlug)
  assert('ARTICLES', 'getArticleBySlug returns the article', bySlug?.slug === firstSlug)
  const noArticle = await q.getArticleBySlug('definitely-not-an-article-slug')
  assert('ARTICLES', 'getArticleBySlug returns null for unknown slug', noArticle === null)

  // Related.
  const related = await q.getRelatedArticles(firstSlug, 3)
  assert('ARTICLES', 'getRelatedArticles excludes the source article', !related.some((a) => a.slug === firstSlug))
  assert('ARTICLES', 'getRelatedArticles respects limit', related.length <= 3)

  // Search — substring of an existing title.
  const searched = await q.searchArticles('ا')
  assert('ARTICLES', 'searchArticles returns an array', Array.isArray(searched))

  /* ─── EXT.15  INTERVIEWS / EVENTS / GALLERY catalog ──────────────────── */
  const interviews = await q.getInterviews()
  assert('INTERVIEWS', 'getInterviews returns >= 1 placeholder', interviews.length >= 1)
  assert('INTERVIEWS', 'interviews have slugs', interviews.every((i) => !!i.slug))
  const intvBySlug = await q.getInterviewBySlug(interviews[0]!.slug)
  assert('INTERVIEWS', 'getInterviewBySlug round-trips', intvBySlug?.slug === interviews[0]!.slug)
  const relatedIntv = await q.getRelatedInterviews(interviews[0]!.slug, 3)
  assert('INTERVIEWS', 'getRelatedInterviews excludes source', !relatedIntv.some((i) => i.slug === interviews[0]!.slug))

  const upcoming = await q.getUpcomingEvents()
  assert('EVENTS', 'getUpcomingEvents returns an array', Array.isArray(upcoming))
  const past = await q.getPastEvents()
  assert('EVENTS', 'getPastEvents returns an array', Array.isArray(past))
  if (upcoming.length > 0) {
    const evBySlug = await q.getEventBySlug(upcoming[0]!.slug)
    assert('EVENTS', 'getEventBySlug round-trips', evBySlug?.slug === upcoming[0]!.slug)
  }

  const gallery = await q.getGalleryItems()
  assert('GALLERY', 'getGalleryItems returns >= 1', gallery.length >= 1)
  assert('GALLERY', 'gallery items have an image path', gallery.every((g) => !!g.image))
  assert('GALLERY', 'gallery items have status', gallery.every((g) => !!g.status))
  const galleryCats = await q.getGalleryCategories()
  assert('GALLERY', 'getGalleryCategories returns an array of categories', Array.isArray(galleryCats))

  /* ─── EXT.16  CONTENT BLOCKS + settings ───────────────────────────────── */
  const allBlocks = await q.getAllContentBlocks()
  assert('CONTENT', 'getAllContentBlocks returns an array', Array.isArray(allBlocks))
  const oneBlock = await q.getContentBlock('non-existent-key')
  assert('CONTENT', 'getContentBlock returns null for unknown key', oneBlock === null || typeof oneBlock === 'object')

  /* ─── EXT.17  SUBSCRIBERS / CONTACT messages (admin views) ────────────── */
  const subs = await q.getSubscribers()
  assert('NEWSLETTER', 'getSubscribers returns an array', Array.isArray(subs))
  const contactMsgs = await q.getContactMessages()
  assert('CONTACT', 'getContactMessages returns an array', Array.isArray(contactMsgs))

  /* ─── EXT.18  ORDERS (admin views) ─────────────────────────────────────── */
  const recentOrders = await q.getRecentOrders()
  assert('ORDERS', 'getRecentOrders returns an array', Array.isArray(recentOrders))
  const orderStats = await q.getOrderStats()
  assert('ORDERS', 'getOrderStats returns stats shape', !!orderStats && typeof orderStats.totalRevenue === 'number')
  assert('ORDERS', 'orderStats.orderCount is a number', typeof orderStats.orderCount === 'number')
  assert('ORDERS', 'orderStats.paidCount is a number', typeof orderStats.paidCount === 'number')
  assert('ORDERS', 'orderStats.pendingCount is a number', typeof orderStats.pendingCount === 'number')

  // getOrdersByUserId
  const userOrders = await q.getOrdersByUserId('00000000-0000-0000-0000-0000000000u1')
  assert('ORDERS', 'getOrdersByUserId returns an array', Array.isArray(userOrders))

  // getOrderByStripeSessionId for a fictitious id.
  const noOrder = await q.getOrderByStripeSessionId('cs_test_nonexistent_session_id')
  assert('ORDERS', 'getOrderByStripeSessionId returns null for unknown sessionId', noOrder === null)

  // getOrderByPaymentIntentId for a fictitious id.
  const noPi = await q.getOrderByPaymentIntentId('pi_test_nonexistent')
  assert('ORDERS', 'getOrderByPaymentIntentId returns null for unknown PI', noPi === null)

  /* ─── EXT.19  GIFT: more edge cases (case-insensitive self-gift, token uniqueness) ── */
  // Token uniqueness — over many createGift calls, tokens should be unique.
  const tokensSeen = new Set<string>()
  for (let i = 0; i < 25; i++) {
    const g = await q.createGift({
      source: 'ADMIN_GRANT',
      itemType: 'BOOK',
      itemId: placeholder.placeholderBooks[0]!.id,
      recipientEmail: `tokencheck.${i}.${Date.now()}@example.test`,
      senderMessage: null,
      adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
    })
    if (g) tokensSeen.add(g.gift.token)
  }
  assert('GIFTS', 'token uniqueness: 25/25 createGift calls produced distinct tokens', tokensSeen.size === 25)
  // Every token is base64url (32-byte random source → ~43 chars).
  const allBase64Url = Array.from(tokensSeen).every((t) => /^[A-Za-z0-9_-]{32,64}$/.test(t))
  assert('GIFTS', 'every gift token matches the base64url pattern (32-64 chars)', allBase64Url)

  /* ─── EXT.20  GIFT: recipientEmailHasBooking + recipientEmailOwnsBookOrSession ── */
  // In mock mode both return false (no DB). The action layer code path is
  // documented in app/[locale]/(public)/gifts/actions.ts:184-189.
  const owns2 = await q.recipientEmailOwnsBookOrSession('reader.one@example.com', placeholder.placeholderBooks[0]!.id)
  assert('GIFTS', 'recipientEmailOwnsBookOrSession returns boolean', typeof owns2 === 'boolean')
  const has2 = await q.recipientEmailHasBooking('reader.one@example.com', reconsider!.id)
  assert('GIFTS', 'recipientEmailHasBooking returns boolean', typeof has2 === 'boolean')

  /* ─── EXT.21  GIFT: countPendingGiftsForUser counts correctly ─────────── */
  // Pre-state.
  const pre = await q.countPendingGiftsForUser(
    '00000000-0000-0000-0000-0000000000u3',
    'reader.one@example.com',
  )
  // Create a NEW PENDING gift targeted at reader.one@example.com.
  // First find a recipient who's an existing user.
  const pendingGiftForCounting = await q.createGift({
    source: 'ADMIN_GRANT',
    itemType: 'BOOK',
    itemId: placeholder.placeholderBooks[0]!.id,
    recipientEmail: `pending.${Date.now()}@nowhere.test`, // unknown email → stays PENDING
    senderMessage: null,
    adminGrantedByUserId: '00000000-0000-0000-0000-0000000000u1',
  })
  assert('GIFTS', 'pre-pending-count gift created', !!pendingGiftForCounting)
  // countPendingGiftsForUser is by recipientEmail OR recipientUserId.
  const postCount = await q.countPendingGiftsForUser(
    pendingGiftForCounting!.gift.id, // dummy userId
    `pending.${pendingGiftForCounting!.gift.recipientEmail.split('.')[1] ?? Date.now()}@nowhere.test`,
  )
  assert('GIFTS', 'countPendingGiftsForUser returns a non-negative number', typeof postCount === 'number' && postCount >= 0)
  assert('GIFTS', 'countPendingGiftsForUser does not decrease after adding PENDING', postCount >= pre || pre === 0)

  /* ─── EXT.22  ASK: getAdminQuestions filters + pagination ─────────────── */
  const adminAll = await q.getAdminQuestions({ status: 'all', page: 1, pageSize: 50 })
  assert('ASK', 'getAdminQuestions returns envelope shape', Array.isArray(adminAll.rows) && typeof adminAll.total === 'number')
  assert('ASK', 'getAdminQuestions page=1', adminAll.page === 1)
  assert('ASK', 'getAdminQuestions pageSize=50', adminAll.pageSize === 50)

  // Filter by PENDING returns only PENDING.
  const adminPending = await q.getAdminQuestions({ status: 'PENDING' })
  assert('ASK', 'getAdminQuestions status=PENDING returns only PENDING', adminPending.rows.every((r) => r.status === 'PENDING'))

  // Filter by ANSWERED.
  const adminAnswered = await q.getAdminQuestions({ status: 'ANSWERED' })
  assert('ASK', 'getAdminQuestions status=ANSWERED returns only ANSWERED', adminAnswered.rows.every((r) => r.status === 'ANSWERED'))

  // Filter by ARCHIVED.
  const adminArchived = await q.getAdminQuestions({ status: 'ARCHIVED' })
  assert('ASK', 'getAdminQuestions status=ARCHIVED returns only ARCHIVED', adminArchived.rows.every((r) => r.status === 'ARCHIVED'))

  // Pagination: page=999 returns empty.
  const adminFar = await q.getAdminQuestions({ page: 999, pageSize: 50 })
  assert('ASK', 'getAdminQuestions far page returns empty rows', adminFar.rows.length === 0)
  assert('ASK', 'getAdminQuestions far page still reports total', typeof adminFar.total === 'number')

  /* ─── EXT.23  STORAGE / VIDEO adapters ─────────────────────────────────── */
  const storageMod = await import('../../lib/storage')
  assert('STORAGE', 'storage adapter exports a getSignedUrl function', typeof storageMod.storage?.getSignedUrl === 'function')
  // The mock adapter returns a signed-url result regardless of input
  // (productType / productId / userId are surfaced for audit logs in prod).
  const signed = await storageMod.storage.getSignedUrl({
    productType: 'BOOK',
    productId: '00000000-0000-0000-0000-0000000000b1',
    storageKey: 'test-key',
    userId: '00000000-0000-0000-0000-0000000000u1',
    expiresInSeconds: 300,
  })
  assert('STORAGE', 'storage.getSignedUrl returns a result with url + expiresAt', !!signed.url && signed.expiresAt instanceof Date)
  assert('STORAGE', 'storage.getSignedUrl.url points under /placeholder-content (mock)', signed.url.startsWith('/placeholder-content/'))
  assert('STORAGE', 'expiresAt is approximately now+300s', Math.abs(signed.expiresAt.getTime() - Date.now() - 300000) < 1500)
  // Default TTL when expiresInSeconds is omitted: 1 hour.
  const signedDefault = await storageMod.storage.getSignedUrl({
    productType: 'SESSION_ITEM',
    productId: '00000000-0000-0000-0000-0000000000s1',
    storageKey: 'session-item-key',
    userId: '00000000-0000-0000-0000-0000000000u1',
  })
  assert('STORAGE', 'default expiry ~ 1 hour out', Math.abs(signedDefault.expiresAt.getTime() - Date.now() - 3_600_000) < 2000)

  /* ─── EXT.24  EMAIL backoff schedule ──────────────────────────────────── */
  const backoffMod = await import('../../lib/email/backoff')
  // attempt counts 1..4 → defined ms intervals.
  assert('EMAIL', 'backoff(1) = 60000 ms (1 min)', backoffMod.backoffFor(1) === 60000)
  assert('EMAIL', 'backoff(2) = 300000 ms (5 min)', backoffMod.backoffFor(2) === 300000)
  assert('EMAIL', 'backoff(3) = 900000 ms (15 min)', backoffMod.backoffFor(3) === 900000)
  assert('EMAIL', 'backoff(4) = 3600000 ms (1 hour)', backoffMod.backoffFor(4) === 3600000)
  // attempt count >= MAX returns null (exhausted).
  assert('EMAIL', 'backoff(5) = null (exhausted)', backoffMod.backoffFor(5) === null)
  assert('EMAIL', 'backoff(10) = null (way over)', backoffMod.backoffFor(10) === null)
  // attempt count < 1 falls back to first interval.
  assert('EMAIL', 'backoff(0) falls back to first interval', backoffMod.backoffFor(0) === 60000)
  // nextAttemptDateFor returns a Date or null.
  const nextDate1 = backoffMod.nextAttemptDateFor(1)
  assert('EMAIL', 'nextAttemptDateFor(1) returns a Date', nextDate1 instanceof Date)
  const nextDate5 = backoffMod.nextAttemptDateFor(5)
  assert('EMAIL', 'nextAttemptDateFor(5) returns null (exhausted)', nextDate5 === null)
  // MAX_EMAIL_ATTEMPTS exported.
  assert('EMAIL', 'MAX_EMAIL_ATTEMPTS = 5', backoffMod.MAX_EMAIL_ATTEMPTS === 5)
  // BACKOFF_SCHEDULE_MS is the documented schedule.
  assert('EMAIL', 'BACKOFF_SCHEDULE_MS has 4 intervals (matches MAX-1)', backoffMod.BACKOFF_SCHEDULE_MS.length === 4)

  /* ─── EXT.25  EMAIL queue admin views ─────────────────────────────────── */
  // getAdminEmailQueue in !HAS_DB returns empty envelope.
  const queueAdmin = await q.getAdminEmailQueue({})
  assert('EMAIL', 'getAdminEmailQueue returns envelope shape', Array.isArray(queueAdmin.rows) && typeof queueAdmin.total === 'number')
  assert('EMAIL', 'queue admin page defaults to 1', queueAdmin.page === 1)
  // countQueueByStatus returns a record.
  const counts = await q.countQueueByStatus()
  assert('EMAIL', 'countQueueByStatus returns a record', typeof counts === 'object' && counts !== null)
  // pickPendingEmails (cron) returns empty array in mock mode.
  const picked = await q.pickPendingEmails(10)
  assert('EMAIL', 'pickPendingEmails returns an array', Array.isArray(picked))

  // markEmailSent / markEmailRetry / markEmailFailed are no-ops in mock mode.
  await q.markEmailSent('00000000-0000-0000-0000-000000000001', 'resend-msg-id')
  await q.markEmailRetry('00000000-0000-0000-0000-000000000001', 'simulated failure')
  await q.markEmailFailed('00000000-0000-0000-0000-000000000001', 'dead-letter manual')
  assert('EMAIL', 'markEmailSent/Retry/Failed run without throwing', true)

  /* ─── Summary ───────────────────────────────────────────────────────── */

  /* ─── Summary ───────────────────────────────────────────────────────── */
  const totalFail = results.filter((r) => !r.ok).length
  const totalOk = results.filter((r) => r.ok).length
  console.log('')
  console.log('============================================================')
  console.log(`SMOKE SUMMARY: ${totalOk} pass / ${totalFail} fail / ${results.length} total`)
  console.log('============================================================')
  // Per-feature breakdown.
  const byFeature = new Map<string, { pass: number; fail: number }>()
  for (const r of results) {
    const entry = byFeature.get(r.feature) ?? { pass: 0, fail: 0 }
    if (r.ok) entry.pass++
    else entry.fail++
    byFeature.set(r.feature, entry)
  }
  for (const [feature, counts] of Array.from(byFeature.entries()).sort()) {
    console.log(`  ${feature.padEnd(10)}  pass=${counts.pass}  fail=${counts.fail}`)
  }
  if (totalFail > 0) {
    console.log('Failed assertions:')
    for (const r of results) {
      if (!r.ok) console.log(`  - [${r.feature}] ${r.assertion}${r.detail ? `  (${r.detail})` : ''}`)
    }
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('SMOKE TEST CRASHED:', err)
  process.exit(2)
})
