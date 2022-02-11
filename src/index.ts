import { PlaywrightBlocker } from '@cliqz/adblocker-playwright'
import fetch from 'cross-fetch'
import * as express from 'express'
import { BrowserContext, chromium, Page } from 'playwright'

const app = express()
const port = 3000
let browserContext: BrowserContext

const root = 'https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada/'

const launch = async () => {
  if (!browserContext) {
    const browser = await chromium.launch({ headless: false })
    browserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36',
    })
    // keep the browser open
    await browserContext.newPage()
  }
}

const getCurrentPage = (browserPage: Page) =>
  browserPage.locator('.pagination-link.is-current').first().textContent()

app.get('/', async (req, res) => {
  try {
    await launch()
    const { page, excluir_mei, somente_mei } = req.query

    const browserPage = await browserContext.newPage()
    const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch)
    await blocker.enableBlockingInPage(browserPage)
    await browserPage.goto(root)

    console.log('Selecting state...')
    await browserPage
      .locator('[placeholder="Selecione o estado"]')
      .fill('Minas Gerais')
    await browserPage.locator('text="MG - Minas Gerais"').click()
    await browserPage.locator('text="Estado (UF)"').click()
    console.log('State selected')

    if (excluir_mei === 'true') {
      console.log('Excluding MEI')
      await browserPage.locator('text="Excluir MEI"').click()
    }
    if (somente_mei === 'true') {
      console.log('Only MEI')
      await browserPage.locator('text="Somente MEI"').click()
    }

    console.log('Hitting search...')
    await browserPage.locator('text="Pesquisar"').click()
    console.log('Search complete')

    if (page) {
      let currentPage = await getCurrentPage(browserPage)
      console.log(`Navigating to page ${page}`)
      while (currentPage !== page) {
        await browserPage
          .locator(
            `.pagination-link.pagination-${
              Number(currentPage) > Number(page) ? 'previous' : 'next'
            }`,
          )
          .first()
          .click()
        currentPage = await getCurrentPage(browserPage)
        console.log(`Navigated to page ${currentPage}`)
      }
    }

    browserPage.on('response', async (response) => {
      if (
        response.request().method() === 'POST' &&
        response.url().includes('/search')
      ) {
        const json = await response.json()
        console.log(`Got response with ${json?.data?.count} results`)
        await browserPage.close()
        return res.send(json)
      }
    })
  } catch (error) {
    console.log(error)
    return res.send(error)
  }
})

app.listen(port, () => {
  console.log(`CNPJ app listening on port http://localhost:${port}`)
})
