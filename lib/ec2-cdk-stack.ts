import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import { KeyPair } from 'cdk-ec2-key-pair'
import { Construct } from 'constructs'

export class Ec2CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const key = new KeyPair(this, 'KeyPair', {
      name: 'cdk-keypair',
      description: 'Key Pair created with CDK Deployment',
    })

    const defaultVpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
    })

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: defaultVpc,
      allowAllOutbound: true,
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22))
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'httpIpv4',
    )
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'httpIpv4',
    )
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000))

    const role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    })

    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonSSMManagedInstanceCore',
      ),
    )

    const userData = ec2.UserData.forLinux()
    userData.addCommands(
      'apt-get update -y',
      'apt-get install -y git awscli ec2-instance-connect',
      'until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done',
      'cd /quickstart-linux-utilities',
      'source quickstart-cfn-tools.source',
      'qs_update-os || qs_err',
      'qs_bootstrap_pip || qs_err',
      'qs_aws-cfn-bootstrap || qs_err',
      'mkdir -p /opt/aws/bin',
      'ln -s /usr/local/bin/cfn-* /opt/aws/bin/',
    )

    const machineImage = ec2.MachineImage.fromSsmParameter(
      '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
      {
        os: ec2.OperatingSystemType.LINUX,
        userData,
      },
    )

    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc: defaultVpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: machineImage,
      securityGroup: securityGroup,
      keyName: key.keyPairName,
      role: role,
      init: ec2.CloudFormationInit.fromElements(
        ec2.InitCommand.shellCommand('sudo apt update'),
        ec2.InitCommand.shellCommand('sudo apt install make nginx -y'),
        ec2.InitCommand.shellCommand(
          'sudo snap install core; sudo snap refresh core',
        ),
        ec2.InitCommand.shellCommand('sudo snap install --classic certbot'),
        ec2.InitCommand.shellCommand(
          'sudo ln -s /snap/bin/certbot /usr/bin/certbot',
        ),
        ec2.InitCommand.shellCommand(
          'curl -L https://git.io/n-install | bash -s -- -y',
        ),
        ec2.InitCommand.shellCommand('. ~/.bashrc'),
        ec2.InitCommand.shellCommand('npm i -g pm2'),
        ec2.InitCommand.shellCommand(
          'yes | npx playwright install-deps chromium',
        ),
      ),
    })

    new cdk.CfnOutput(this, 'IP Address', {
      value: ec2Instance.instancePublicIp,
    })
    new cdk.CfnOutput(this, 'Key Name', { value: key.keyPairName })
    new cdk.CfnOutput(this, 'Download Key Command', {
      value:
        'aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem',
    })
    new cdk.CfnOutput(this, 'ssh command', {
      value:
        'ssh -i cdk-key.pem -o IdentitiesOnly=yes ubuntu@' +
        ec2Instance.instancePublicIp,
    })
  }
}
