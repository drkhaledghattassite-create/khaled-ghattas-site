import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), '.visual-check')
mkdirSync(OUT, { recursive: true })

const PAGES = [
  { url: 'http://localhost:3002/', name: 'home-ar' },
  { url: 'http://localhost:3002/about', name: 'about-ar' },
  { url: 'http://localhost:3002/en', name: 'home-en' },
  { url: 'http://localhost:3002/en/about', name: 'about-en' },
]

const SCROLL_STEPS = [0, 600, 1400, 2400, 3400, 4400, 5400]

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const errors = []
  page.on('pageerror', (e) => errors.push(`${page.url()} | ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console] ${page.url()} | ${m.text()}`)
  })

  // Skip the PageLoader intro splash via sessionStorage seeding.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('kg_intro_seen', '1') } catch {}
  })

  for (const p of PAGES) {
    console.log(`>> ${p.url}`)
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 60000 })
    // Wait for entrance animations
    await page.waitForTimeout(1800)

    for (const y of SCROLL_STEPS) {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y)
      await page.waitForTimeout(450)
      const file = join(OUT, `${p.name}-y${y}.png`)
      await page.screenshot({ path: file, fullPage: false })
    }

    const ssFull = join(OUT, `${p.name}-full.png`)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForTimeout(400)
    await page.screenshot({ path: ssFull, fullPage: true })
  }

  writeFileSync(join(OUT, 'errors.txt'), errors.join('\n'))
  console.log(`Errors: ${errors.length}`)

  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
