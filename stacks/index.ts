import * as sst from '@serverless-stack/resources'

import CNPJStack from './CNPJStack'

export default function main(app: sst.App): void {
  app.setDefaultFunctionProps({
    runtime: 'nodejs14.x',
  })

  new CNPJStack(app, 'cnpj-stack')
}
