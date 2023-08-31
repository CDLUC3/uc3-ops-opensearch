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


    // Cognito UserPool
    const domainUserPool = new cognito.UserPool(this, 'DomainUserPool', {
      userPoolName: 'uc3OpsOpenSearch-userpool',
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
      accountRecovery: cognito.AccountRecovery.NONE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const domainIdentityPool = new IdentityPool(this, 'IdentityPool', {
      identityPoolName: 'uc3OpsOpenSearch-identitypool',
      // this generates an appClient, not sure how to access it in cdk though
      //authenticationProviders: {
      //  userPools: [new UserPoolAuthenticationProvider({ userPool: domainUserPool })],
      //},
    }); 

    domainUserPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'uc3-ops-opensearch',
      },
    });

    //const domainUserPoolAppClient = domainIdentityPool.addUserPoolAuthentication(new UserPoolAuthenticationProvider({
    //  userPool: domainUserPool,
    //}));

    //const DomainUserPoolAppClient = domainUserPool.addClient('AppClient', {
    //  userPoolClientName: 'uc3OpsOpenSearch-appclient',
    //  authFlows: {
    //    userPassword: true,
    //  },
    //});


    // OpenSearch service role for Cognito
    const domainSearchRole = new iam.Role(this, 'uc3OpsOpenSearchRole', {
      assumedBy: new iam.ServicePrincipal('opensearchservice.amazonaws.com'),
      roleName: 'CognitoAccessForAmazonOpenSearch',
      description: 'Service role for OpenSearch to configure Cognito user and identity pools and use them for authentication',
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceCognitoAccess')],
    });

    new cdk.CfnOutput(this, 'domainSearchRoleArn', {
      value: domainSearchRole.roleArn,
    });

    new cdk.CfnOutput(this, 'domainSearchRoleName', {
      value: domainSearchRole.roleName,
    });


    // OpenSearch Domain
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

      //customEndpoint: {
      //  domainName: 'uc3-ops-opensearch.uc3dev.cdlib.org',
      //},

      cognitoDashboardsAuth: {
        role: domainSearchRole,
        identityPoolId: domainIdentityPool.identityPoolId,
        userPoolId: domainUserPool.userPoolId,
      },

      logging: {
        auditLogEnabled: false,
        slowSearchLogEnabled: false,
        appLogEnabled: true,
        slowIndexLogEnabled: false,
      },

    });


    domain.addAccessPolicies(
      new iam.PolicyStatement({
        actions: ['es:ESHttp*'],
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal(domainIdentityPool.authenticatedRole.roleArn)],
        resources: [domain.domainArn, `${domain.domainArn}/*`],
      })
    );

    new cdk.CfnOutput(this, 'domainName', {
      value: domain.domainName,
    });

    new cdk.CfnOutput(this, 'domainEndpoint', {
      value: domain.domainEndpoint,
    });

  }
}



