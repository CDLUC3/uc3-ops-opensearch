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
    }); 

    domainUserPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'uc3-ops-opensearch',
      },
    });



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




    // Cognito UserPool groups and roles
    //
    const identityPoolFederatedPrinical =  new iam.FederatedPrincipal(
      'cognito-identity.amazonaws.com',
      {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": domainIdentityPool.identityPoolId
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        },
      },
      'sts:AssumeRoleWithWebIdentity'
    );

    // Role for members of domainAdminGroup
    const domainAdminGroupRole = new iam.Role(this, 'uc3OpsOpenSearchAdminGroupRole', {
      assumedBy: identityPoolFederatedPrinical,
      roleName: 'OpenSearchDomainAdminGroupRole',
      description: 'OpenSearch administrator access for domainAdminGroup',
      //managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceFullAccess')],
    });

    // Role for members of domainDeveloperGroup
    const domainDeveloperGroupRole = new iam.Role(this, 'uc3OpsOpenSearchDeveloperGroupRole', {
      assumedBy: identityPoolFederatedPrinical,
      roleName: 'OpenSearchDomainDeveloperGroupRole',
      description: 'OpenSearch developer access for domainDeveloperGroup',
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceReadOnlyAccess')],
    });

    const domainAdminGroup = new cognito.CfnUserPoolGroup(this, 'domainAdminGroup', {
      userPoolId: domainUserPool.userPoolId ,
      description: 'OpenSearch Administrators',
      groupName: 'admin',
      precedence: 1,
      roleArn: domainAdminGroupRole.roleArn,
    });

    const domainDeveloperGroup = new cognito.CfnUserPoolGroup(this, 'domainDeveloperGroup', {
      userPoolId: domainUserPool.userPoolId ,
      description: 'Uc3 Developers',
      groupName: 'developer',
      precedence: 10,
      roleArn: domainDeveloperGroupRole.roleArn,
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
        //masterUserName: 'domain-admin',
        masterUserArn: domainAdminGroupRole.roleArn,
        //masterUserPassword: cdk.SecretValue.secretsManager('uc3-ops-opensearch-dev-admin-password'),
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

    
    domainAdminGroupRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["es:ESHttp*"],
        //principals: [new iam.AnyPrincipal()],
        resources: [domain.domainArn, `${domain.domainArn}/*`],
      })
    );
    
    //domainAdminGroupRole.addToPolicy(
    //  new iam.Policy(this, 'openSearchAdminPoliciy', {
    //      statements: [new iam.PolicyStatement({
    //        effect: iam.Effect.ALLOW,
    //        actions: ["es:ESHttp*"],
    //        resources: [domain.domainArn, `${domain.domainArn}/*`],
    //        principals: [new iam.AnyPrincipal()],
    //      })
    //    ],
    //  })
    //);


    new cdk.CfnOutput(this, 'domainName', {
      value: domain.domainName,
    });

    new cdk.CfnOutput(this, 'domainEndpoint', {
      value: domain.domainEndpoint,
    });

  }
}



