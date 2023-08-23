// OpenSearch Service CDK app
//
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { aws_opensearchservice as opensearch } from 'aws-cdk-lib';

export class Uc3OpsOpensearchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'PublicVpc', 
        {tags: {'Name': "cdl-uc3-dev-vpc"}});

    //const subnet = cdk.Fn.importValue('defaultsubnet2b');
    //const subnets = vpc.selectSubnets({
    //  availabilityZones: ['us-west-2b'],
    //});
    
    //const selection : ec2.SubnetSelection =   {
    //  subnetType: ec2.SubnetType.PUBLIC,
    //};

    const domain = new opensearch.Domain(this, 'Domain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_7,
      enableVersionUpgrade: true,
      enableAutoSoftwareUpdate: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      vpc: vpc,
      //vpcSubnets: subnets,
      //vpcSubnets: selection,
      //vpcSubnets: {
      //  //availabilityZones: ['us-west-2b'],
      //  //subnets: {
      //  //  availabiltyZone: 'us-west-2b',
      //  //  stack: 'cdl-uc3-dev-defaultsubnet-stack',
      //  //},
      //  subnetType: ec2.SubnetType.PUBLIC,
      //},
      capacity: {
        dataNodes: 3,
        dataNodeInstanceType: 't3.small.search',
        multiAzWithStandbyEnabled: false,
      },
      ebs: {
        volumeSize: 10,
        volumeType: ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
      },
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
      },
      enforceHttps: true,
      fineGrainedAccessControl: {
        masterUserName: 'domain-admin',
        masterUserPassword: cdk.SecretValue.secretsManager('uc3-ops-opensearch-dev-admin-password'),
      },
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: 3,
      },


    });

    new cdk.CfnOutput(this, 'domainName', {
      value: domain.domainName,
    });

  }
}

