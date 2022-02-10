import { PlaywrightBlocker } from '@cliqz/adblocker-playwright'
import fetch from 'cross-fetch'
import * as express from 'express'
import { chromium, Page } from 'playwright'

const app = express()
const port = 3000
let browserPage: Page

const root = 'https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada/'

void chromium.launch({ headless: true }).then(async (browser) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36',
  })
  browserPage = await context.newPage()

  PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInPage(browserPage)
  })

  await browserPage.goto(root)
})

const getCurrentPage = () =>
  browserPage.locator('.pagination-link.is-current').first().textContent()

app.get('/', async (req, res) => {
  const { page } = req.query
  await browserPage
    .locator('[placeholder="Selecione o estado"]')
    .fill('Minas Gerais')
  await browserPage.locator('text="MG - Minas Gerais"').click()
  await browserPage.locator('text="Somente MEI"').click()
  await browserPage.locator('text="Pesquisar"').click()

  let currentPage = await getCurrentPage()

  if (page) {
    while (currentPage !== page) {
      await browserPage
        .locator(
          `.pagination-link.pagination-${
            Number(currentPage) > Number(page) ? 'previous' : 'next'
          }`,
        )
        .first()
        .click()
      currentPage = await getCurrentPage()
    }
  }

  browserPage.on('response', async (response) => {
    if (
      response.request().method() === 'POST' &&
      response.url().includes('/search')
    ) {
      const json = await response.json()
      res.send(json)
    }
  })
})

app.listen(port, () => {
  console.log(`CNPJ app listening on port http://localhost:${port}`)
})
