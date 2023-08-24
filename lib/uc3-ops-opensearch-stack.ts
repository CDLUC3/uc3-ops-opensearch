// OpenSearch Service CDK app
//
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { aws_opensearchservice as opensearch } from 'aws-cdk-lib';
import { IdentityPool, UserPoolAuthenticationProvider } from '@aws-cdk/aws-cognito-identitypool-alpha';

export class Uc3OpsOpensearchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //declare const cognitoConfigurationRole: iam.Role;

    const domain = new opensearch.Domain(this, 'Domain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_7,
      enableVersionUpgrade: true,
      enableAutoSoftwareUpdate: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

    new cdk.CfnOutput(this, 'domainEndpoint', {
      value: domain.domainEndpoint,
    });


    const userPool = new cognito.UserPool(this, 'openSearchDomainUserPool', {
      userPoolName: 'uc3opsOpenSearch-userpool',
      signInAliases: {
        email: true,
      },
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: 'You need to verify your email',
        emailBody: 'Thanks for signing up Your verification code is {####}', // # This placeholder is a must if code is selected as preferred verification method
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      //standardAttributes: {
      //  familyName: {
      //    mutable: false,
      //    required: true,
      //  },
      //  address: {
      //    mutable: true,
      //    required: false,
      //  },
      //},
      customAttributes: {
        'isAdmin': new cognito.BooleanAttribute({
          mutable: false,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userPool.addClient('openSearchDomainAppClient', {
      userPoolClientName: 'Uc3OpsOpenSearch-appclient',
      authFlows: {
        userPassword: true,
      },
    });

    new IdentityPool(this, 'openSearchDomainIdentityPool');

  }
}



