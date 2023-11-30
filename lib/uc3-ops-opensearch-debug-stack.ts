// OpenSearch Service CDK app
//
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cognito_identitypool from '@aws-cdk/aws-cognito-identitypool-alpha';
import { aws_opensearchservice as opensearch } from 'aws-cdk-lib';

//import { IdentityPool, IdentityPoolRoleMapping, IdentityPoolProviderUrl, UserPoolAuthenticationProvider} from '@aws-cdk/aws-cognito-identitypool-alpha';

//function capitalize(string) {
//    return string.charAt(0).toUpperCase() + string.slice(1);
//};
//const environment = 'dev';
//const resource_prefix = `uc3OpsOpensearch${environment.capitalize}`;

const resource_prefix = 'uc3OpsOpensearchDev';


export class Uc3OpsOpensearchDebugStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //
    // Cognito UserPool
    //

    const opensearchUserPool = new cognito.UserPool(this, 'UserPool', {
      //userPoolName: `uc3OpsOpenSearch${environment.capitalize()}-userPool`,
      userPoolName: `${resource_prefix}-userPool`,
      //userPoolName: 'uc3OpsOpenSearch-userpool',
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

    const opensearhUserPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: opensearchUserPool, 
      userPoolClientName: `${resource_prefix}-userPoolClient`
    });
    //const opensearhUserPoolClient = opensearchUserPool.addClient('UserPoolClient', {
    //  userPoolClientName: `${resource_prefix}-userPoolClient`
    //});

    const opensearchUserPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: opensearchUserPool,
      cognitoDomain: {
        domainPrefix: 'uc3-ops-opensearch-dev',
        //domainPrefix: `uc3-ops-opensearch-${environment}`,
      },
    });
    //const opensearchUserPoolDomain = opensearchUserPool.addDomain('UserPoolDomain', {
    //  cognitoDomain: {
    //    domainPrefix: 'uc3-ops-opensearch-dev',
    //    //domainPrefix: `uc3-ops-opensearch-${environment}`,
    //  },
    //});

    new cdk.CfnOutput(this, 'userPoolArn', {
      value: opensearchUserPool.userPoolArn,
    });
    new cdk.CfnOutput(this, 'userPoolId', {
      value: opensearchUserPool.userPoolId,
    });
    //new cdk.CfnOutput(this, 'userPoolProviderUrl', {
    //  value: opensearchUserPool.userPoolProviderUrl,
    //});
    //new cdk.CfnOutput(this, 'userPoolProviderName', {
    //  value: opensearchUserPool.userPoolProviderName,
    //});
    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: opensearhUserPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'userPoolClientName', {
      value: opensearhUserPoolClient.userPoolClientName,
    });
    new cdk.CfnOutput(this, 'userPoolDomain', {
      value: opensearchUserPoolDomain.domainName,
    });





    //
    // Cognito IdentityPool
    //

    const providerUrlString = `${opensearchUserPool.userPoolProviderName}:${opensearhUserPoolClient.userPoolClientId}`

    const opensearchUserPoolProvider = new cognito_identitypool.UserPoolAuthenticationProvider({
      userPool: opensearchUserPool,
      userPoolClient: opensearhUserPoolClient
    });

    const opensearchIdentityPool = new cognito_identitypool.IdentityPool(this, 'IdentityPool', {
      identityPoolName: `${resource_prefix}-identityPool`,
      authenticationProviders: {
        userPools: [opensearchUserPoolProvider]
      },
      roleMappings: [{
        mappingKey: 'cognitoUserPool',
        providerUrl: cognito_identitypool.IdentityPoolProviderUrl.userPool(providerUrlString),
        useToken: true,
      }],
    }); 

    new cdk.CfnOutput(this, 'identityPoolName', {
      value: opensearchIdentityPool.identityPoolName,
    });
    new cdk.CfnOutput(this, 'identityPoolArn', {
      value: opensearchIdentityPool.identityPoolArn,
    });
    new cdk.CfnOutput(this, 'identityPoolId', {
      value: opensearchIdentityPool.identityPoolId,
    });





    //
    // IAM Resources
    //

    // OpenSearch service role for Cognito
    const opensearchServiceRole = new iam.Role(this, 'iamServiceRole', {
      assumedBy: new iam.ServicePrincipal('opensearchservice.amazonaws.com'),
      roleName: `${resource_prefix}-opensearchServiceRoleForCognito`,
      description: 'Service role for OpenSearch to configure Cognito user and identity pools and use them for authentication',
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceCognitoAccess')],
    });

    // Federated trust policy for roles attached to Cognito UserPoolGroups
    const identityPoolFederatedPrinical =  new iam.FederatedPrincipal(
      'cognito-identity.amazonaws.com',
      {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": opensearchIdentityPool.identityPoolId
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        },
      },
      'sts:AssumeRoleWithWebIdentity'
    );

    // Role for the Admin UserPoolGroup
    const userPoolGroupAdminRole = new iam.Role(this, 'userPoolGroupAdminRole', {
      assumedBy: identityPoolFederatedPrinical,
      roleName: `${resource_prefix}-AdminUserPoolGroupRole`,
      description: 'OpenSearch administrator access',
    });

    // Role for the Developer UserPoolGroup
    const userPoolGroupDeveloperRole = new iam.Role(this, 'userPoolGroupDeveloperRole', {
      assumedBy: identityPoolFederatedPrinical,
      roleName: `${resource_prefix}-DeveloperUserPoolGroupRole`,
      description: 'OpenSearch developer access',
    });

    new cdk.CfnOutput(this, 'opensearchServiceRoleArn', {
      value: opensearchServiceRole.roleArn,
    });

    new cdk.CfnOutput(this, 'userPoolGroupAdminRoleArn', {
      value: userPoolGroupAdminRole.roleArn,
    });

    new cdk.CfnOutput(this, 'userPoolGroupDeveloperRoleArn', {
      value: userPoolGroupDeveloperRole.roleArn,
    });




    //
    // Cognito UserPool Groups
    //

    const userPoolGroupAdmin = new cognito.CfnUserPoolGroup(this, 'userPoolGroupAdmin', {
      userPoolId: opensearchUserPool.userPoolId ,
      description: 'OpenSearch Administrators',
      groupName: 'admin',
      precedence: 1,
      roleArn: userPoolGroupAdminRole.roleArn,
    });

    const userPoolGroupDeveloper = new cognito.CfnUserPoolGroup(this, 'userPoolGroupDeveloper', {
      userPoolId: opensearchUserPool.userPoolId ,
      description: 'Uc3 Developers',
      groupName: 'developer',
      precedence: 10,
      roleArn: userPoolGroupDeveloperRole.roleArn,
    });


    


    //
    // OpenSearch Domain
    //

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
        //masterUserArn: userPoolGroupAdminRole.roleArn,
        masterUserArn: opensearchIdentityPool.authenticatedRole.roleArn
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
        role: opensearchServiceRole,
        identityPoolId: opensearchIdentityPool.identityPoolId,
        userPoolId: opensearchUserPool.userPoolId,
      },

      logging: {
        auditLogEnabled: true,
        slowSearchLogEnabled: false,
        appLogEnabled: true,
        slowIndexLogEnabled: false,
      },
    });

    new cdk.CfnOutput(this, 'domainName', {
      value: domain.domainName,
    });

    new cdk.CfnOutput(this, 'domainEndpoint', {
      value: domain.domainEndpoint,
    });






    //domain.addAccessPolicies(
    //  new iam.PolicyStatement({
    //    actions: ['es:ESHttp*'],
    //    effect: iam.Effect.ALLOW,
    //    //principals: [new iam.ArnPrincipal(opensearchIdentityPool.authenticatedRole.roleArn)],
    //    principals: [new iam.ArnPrincipal('*')],
    //    resources: [domain.domainArn, `${domain.domainArn}/*`],
    //  })
    //);

    //
    //userPoolGroupAdminRole.addToPolicy(
    //  new iam.PolicyStatement({
    //    effect: iam.Effect.ALLOW,
    //    actions: ["es:ESHttp*"],
    //    //principals: [new iam.AnyPrincipal()],
    //    resources: [domain.domainArn, `${domain.domainArn}/*`],
    //  })
    //);
    //
    ////userPoolGroupAdminRole.addToPolicy(
    ////  new iam.Policy(this, 'openSearchAdminPoliciy', {
    ////      statements: [new iam.PolicyStatement({
    ////        effect: iam.Effect.ALLOW,
    ////        actions: ["es:ESHttp*"],
    ////        resources: [domain.domainArn, `${domain.domainArn}/*`],
    ////        principals: [new iam.AnyPrincipal()],
    ////      })
    ////    ],
    ////  })
    ////);


  }
}



