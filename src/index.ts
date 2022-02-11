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

  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch)
  await blocker.enableBlockingInPage(browserPage)

  await browserPage.goto(root)
})

const getCurrentPage = () =>
  browserPage.locator('.pagination-link.is-current').first().textContent()

app.get('/', async (req, res) => {
  try {
    const { page, excluir_mei, somente_mei } = req.query

    console.log('Reloading page...')
    await browserPage.reload()
    console.log('Page reloaded')

    console.log('Selecting state...')
    await browserPage
      .locator('[placeholder="Selecione o estado"]')
      .fill('Minas Gerais')
    await browserPage.locator('text="MG - Minas Gerais"').click()
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
      let currentPage = await getCurrentPage()
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
        currentPage = await getCurrentPage()
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
