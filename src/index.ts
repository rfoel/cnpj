import { PuppeteerBlocker } from '@cliqz/adblocker-puppeteer'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import chromium from 'chrome-aws-lambda'
import fetch from 'cross-fetch'
import * as puppeteer from 'puppeteer-core'

let browserPage: puppeteer.Page

const root = 'https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada/'

const launch = async () => {
  if (!browserPage || browserPage.isClosed()) {
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })
    browserPage = await browser.newPage()
    await browserPage.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36',
    )
    await browserPage.setViewport({
      width: 1000,
      height: 600,
    })
    const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch)
    await blocker.enableBlockingInPage(browserPage)
  }
}

const getCurrentPage = (): Promise<string> =>
  browserPage
    .$('.pagination-link.is-current')
    .then((element) => element?.getInnerText() as unknown as string)

const delay = (ms?: 500) => new Promise((resolve) => setTimeout(resolve, ms))

let result: APIGatewayProxyResult

const waitForResult = async (): Promise<APIGatewayProxyResult> => {
  if (!result) {
    await delay()
    return waitForResult()
  }
  await browserPage.close()
  return result
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    await launch()
    const { excluir_mei, municipio, page, somente_mei } =
      event.queryStringParameters || {}

    await browserPage.goto(root)

    let currentPage = '1'

    browserPage.on('response', async (response) => {
      if (
        response.request().method() === 'POST' &&
        response.url().includes('/search') &&
        (!page || (page && currentPage === page))
      ) {
        const json = await response.json()
        console.log(`Got response with ${json?.data?.count} results`)
        result = {
          statusCode: 200,
          body: JSON.stringify(json, null, 2),
        }
      }
    })

    console.log('Selecting state...')
    await browserPage.type('[placeholder="Selecione o estado"]', 'Minas Gerais')

    await browserPage
      .waitForText('MG - Minas Gerais')
      .then((element) => element.click())

    await browserPage.click('h1')
    console.log('State selected')
    console.log('Selection city...')
    await browserPage.click('[placeholder="Selecione um município"]')
    const options = await browserPage.$$(
      '.dropdown-menu.is-opened-top .dropdown-item',
    )

    if (typeof municipio === 'string') {
      await browserPage.type(
        '[placeholder="Selecione um município"]',
        municipio,
      )
      await browserPage
        .$('.dropdown-menu.is-opened-top .dropdown-item')
        .then((element) => element?.click())
    } else {
      await options[Math.floor(Math.random() * options.length)].click()
    }
    await browserPage.click('h1')
    console.log('City selected')

    if (excluir_mei === 'true') {
      console.log('Excluding MEI')
      await browserPage
        .waitForText('Excluir MEI')
        .then((element) => element.click())
    }
    if (somente_mei === 'true') {
      console.log('Only MEI')
      await browserPage
        .waitForText('Somente MEI')
        .then((element) => element.click())
    }

    console.log('Hitting search...')
    await browserPage.click('button.is-medium.is-success')
    await browserPage.waitForResponse((response) =>
      response.url().includes('/search'),
    )
    console.log('Search complete')

    currentPage = await getCurrentPage()

    if (page && currentPage !== page) {
      await browserPage.evaluate(
        () =>
          new Promise((resolve) => {
            const element = document.querySelector(
              '.pagination-link.is-current',
            )
            element?.scrollIntoView()
            resolve(1)
          }),
      )

      console.log(`Will navigate to page ${page}`)

      while (currentPage !== page) {
        const selector = `.pagination-link.pagination-${
          page && Number(page) < Number(currentPage) ? 'previous' : 'next'
        }`
        await browserPage.click(selector)
        currentPage = await getCurrentPage()
        console.log(`Navigated to page ${currentPage}`)
      }
    }

    return waitForResult()
  } catch (error) {
    console.log(error)
    return { statusCode: 500, body: JSON.stringify(error, null, 2) }
  }
}
