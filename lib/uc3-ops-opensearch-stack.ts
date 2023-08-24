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

    const domainSecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: vpc,
      securityGroupName: 'opensearchClusterSecurityGroup',
      allowAllOutbound: true,
      disableInlineRules: true,
    });
    domainSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(domainSecurityGroup.securityGroupId), ec2.Port.allTraffic(), 'group members can talk to eachother on any port');
    domainSecurityGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    const domainSecurityGroupObject = ec2.SecurityGroup.fromSecurityGroupId(this, 'sgid', domainSecurityGroup.securityGroupId);
 

    const domain = new opensearch.Domain(this, 'Domain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_7,
      enableVersionUpgrade: true,
      enableAutoSoftwareUpdate: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      vpc: vpc,
      //securityGroups: [ec2.SecurityGroup.fromSecurityGroupId(this, 'sgid', domainSecurityGroup.securityGroupId)],
      securityGroups: [domainSecurityGroupObject],
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



    const jumphost = new ec2.BastionHostLinux(this, 'Jumphost', {
      vpc: vpc,
      instanceName: 'opensearch-jumphost',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
      securityGroup: domainSecurityGroupObject,
    });

    const resource = jumphost.node.defaultChild as cdk.CfnResource;
    resource.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);


    new cdk.CfnOutput(this, 'domainName', {
      value: domain.domainName,
    });

    new cdk.CfnOutput(this, 'jumphostId', {
      value: jumphost.instanceId,
    });

  }
}

