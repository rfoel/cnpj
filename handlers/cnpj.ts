import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import chromium from 'chrome-aws-lambda'
import type { Browser, Page } from 'puppeteer-core'

import { defaultBody, userAgents } from './utils'

let browser: Browser
let page: Page

const launch = async () => {
  if (!page || page.isClosed()) {
    if (!browser) {
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      })
    }
    page = await browser.newPage()
    await page.setUserAgent(
      userAgents[Math.floor(Math.random() * userAgents.length)],
    )
  }
}

const close = async () => {
  if (page && !page.isClosed()) {
    await page.close()
  }
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('REQUEST', JSON.stringify(event, null, 2))

  let data
  let response

  try {
    await launch()

    await page.goto(
      'https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada',
    )

    await page.evaluate((body) => {
      // @ts-expect-error for some reason, typescript won't pick up the fetch function from puppeteer
      void fetch('https://api.casadosdados.com.br/v2/public/cnpj/search', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8,de;q=0.7',
          'content-type': 'application/json;charset=UTF-8',
          'sec-ch-ua':
            '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
        referrer: 'https://casadosdados.com.br/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: typeof body === 'object' ? JSON.stringify(body) : body,
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
      })
    }, event?.body || defaultBody)

    data = await page.waitForResponse(
      (response) =>
        response.url().includes('/cnpj/search') && response.status() === 200,
    )
    const parsedData = await data.json()

    await close()

    response = {
      statusCode: 200,
      body: JSON.stringify(parsedData),
    }
  } catch (error) {
    console.log('ERROR', error)
    await close()
    response = { statusCode: 500, body: 'See cloudwatch for the error' }
  }

  console.log('RESPONSE', JSON.stringify(response, null, 2))

  return response
}
