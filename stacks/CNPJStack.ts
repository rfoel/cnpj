import * as sst from '@serverless-stack/resources'
import { LayerVersion } from 'aws-cdk-lib/aws-lambda'

const layerArn =
  'arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:25'

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props)

    const prefix = scope.stage === 'prod' ? '' : `${scope.stage}.`
    const domainName = `${prefix}cnpj.rfoel.dev`

    const layer = LayerVersion.fromLayerVersionArn(this, 'Layer', layerArn)

    const api = new sst.Api(this, 'Api', {
      customDomain: {
        domainName,
        hostedZone: 'rfoel.dev',
      },
      routes: {
        'GET /': {
          function: {
            handler: 'src/index.handler',
            timeout: 30,
            layers: [layer],
            bundle: { externalModules: ['chrome-aws-lambda'] },
          },
        },
      },
    })

    this.addOutputs({
      ApiEndpoint: api.url,
    })
  }
}
