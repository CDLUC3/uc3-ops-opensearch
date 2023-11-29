// OpenSearch Service CDK app
//
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { aws_opensearchservice as opensearch } from 'aws-cdk-lib';
import { IdentityPool, IdentityPoolRoleMapping, IdentityPoolProviderUrl } from '@aws-cdk/aws-cognito-identitypool-alpha';


export class Uc3OpsOpensearchDebugStack extends cdk.Stack {
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

    new cdk.CfnOutput(this, 'userPoolArn', {
      value: domainUserPool.userPoolArn,
    });

    new cdk.CfnOutput(this, 'userPoolId', {
      value: domainUserPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'userPoolProviderUrl', {
      value: domainUserPool.userPoolProviderUrl,
    });

    new cdk.CfnOutput(this, 'userPoolProviderName', {
      value: domainUserPool.userPoolProviderName,
    });


    const OSDomainClient = new cognito.UserPoolClient(this, 'UserPoolClieint', {
      userPool: domainUserPool 
    });

    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: OSDomainClient.userPoolClientId,
    });

    const userPoolProviderUrl = domainUserPool.userPoolProviderUrl;
    const userPoolClientId = OSDomainClient.userPoolClientId;
    const providerUrl = `${userPoolProviderUrl}:${userPoolClientId}`;
    //const providerUrl = `${userPoolProviderUrl}:app_client_id`;
    //const providerUrl = `${domainUserPool.userPoolProviderName}:app_client_id`;
    //const providerUrl = `${domainUserPool.userPoolProviderName}:${userPoolClientId}`;

    new cdk.CfnOutput(this, 'providerUrl', {
      value: providerUrl,
    });

    //const domainIdentityPool = new IdentityPool(this, 'IdentityPool', {
    //  identityPoolName: 'uc3OpsOpenSearch-identitypool',
    //  // https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-cognito-identitypool-alpha.IdentityPoolProviderUrl.html
    //  roleMappings: [{
    //    mappingKey: 'DomainUserPool',
    //    //providerUrl: IdentityPoolProviderUrl.userPool(domainUserPool.userPoolProviderUrl),
    //    providerUrl: IdentityPoolProviderUrl.userPool(providerUrl),
    //    useToken: true,
    //  }],
    //}); 



// Uc3OpsOpensearchStack: creating CloudFormation changeset...
//6:47:45 PM | UPDATE_FAILED        | AWS::Cognito::IdentityPoolRoleAttachment | IdentityPoolDefaul...AttachmentD81AFC39
//(https://cognito-idp.us-west-2.amazonaws.com/us-west-2_s0hFURHmp) is not a valid RoleMapping ProviderName or is not a configured provider. (Service: AmazonCognitoIdentity; Status Code: 400; Error Code: Invalid




    //domainUserPool.addDomain('CognitoDomain', {
    //  cognitoDomain: {
    //    domainPrefix: 'uc3-ops-opensearch',
    //  },
    //});



//    // OpenSearch service role for Cognito
//    const domainSearchRole = new iam.Role(this, 'uc3OpsOpenSearchRole', {
//      assumedBy: new iam.ServicePrincipal('opensearchservice.amazonaws.com'),
//      roleName: 'CognitoAccessForAmazonOpenSearch',
//      description: 'Service role for OpenSearch to configure Cognito user and identity pools and use them for authentication',
//      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceCognitoAccess')],
//    });
//
//    new cdk.CfnOutput(this, 'domainSearchRoleArn', {
//      value: domainSearchRole.roleArn,
//    });
//
//    new cdk.CfnOutput(this, 'domainSearchRoleName', {
//      value: domainSearchRole.roleName,
//    });
//
//
//
//






    const domainIdentityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      identityPoolName: 'uc3OpsOpenSearch-identitypool',
    });

    new cdk.CfnOutput(this, 'identityPool', {
      value: domainIdentityPool.ref,
    });


    const identityPoolFederatedPrinical =  new iam.FederatedPrincipal(
      'cognito-identity.amazonaws.com',
      {
        "StringEquals": {
          //"cognito-identity.amazonaws.com:aud": domainIdentityPool.identityPoolId
          "cognito-identity.amazonaws.com:aud": domainIdentityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        },
      },
      'sts:AssumeRoleWithWebIdentity'
    );

    const identityPoolAuthenticatedRole = new iam.Role(this, 'identityPoolAuthenticatedRole', {
      assumedBy: identityPoolFederatedPrinical,
      roleName: 'identityPoolAuthenticatedRole',
      description: 'Cognito IdentityPool authenticated role',
    });

    const identityPoolUnauthenticatedRole = new iam.Role(this, 'identityPoolUnauthenticatedRole', {
      assumedBy: identityPoolFederatedPrinical,
      roleName: 'identityPoolUnauthenticatedRole',
      description: 'Cognito IdentityPool unauthenticated role',
    });

    // from https://github.com/aws/aws-cdk/issues/7670
    const roleMapping : cognito.CfnIdentityPoolRoleAttachment.RoleMappingProperty = {
        type: 'Token',
        ambiguousRoleResolution: 'Deny', // AuthenticatedRole or Deny
        identityProvider: `${domainUserPool.userPoolProviderName}`
       //identityProvider: `${domainUserPool.userPoolProviderName}:${OSDomainClient.userPoolClientId}`
        //identityProvider: `${domainUserPool.userPoolProviderName}:app_client_id`
    };

    const domainIdentityPoolRoleAttachment = new cognito.CfnIdentityPoolRoleAttachment(this, "roleAttachment", {
      identityPoolId: domainIdentityPool.ref,
      roleMappings: {
        'cognito': roleMapping
      },
      //roleMappings: {
      //  cognito: { // 👈 manually specified key of "cognito"
      //    type: "Token",
      //    ambiguousRoleResolution: "Deny",
      //    identityProvider: `${domainUserPool.userPoolProviderName}:${OSDomainClient.userPoolClientId}`
      //    //identityProvider: domainUserPool.userPoolProviderUrl
      //  }
      //},
      roles: { 
        authenticated: identityPoolAuthenticatedRole.roleArn,
        unauthenticated: identityPoolUnauthenticatedRole.roleArn,
      }
    }).node.addDependency(domainIdentityPool)






    //const domainAdminGroup = new cognito.CfnUserPoolGroup(this, 'domainAdminGroup', {
    //  userPoolId: domainUserPool.userPoolId ,
    //  description: 'OpenSearch Administrators',
    //  groupName: 'admin',
    //  precedence: 1,
    //  roleArn: domainAdminGroupRole.roleArn,
    //});

    //const domainDeveloperGroup = new cognito.CfnUserPoolGroup(this, 'domainDeveloperGroup', {
    //  userPoolId: domainUserPool.userPoolId ,
    //  description: 'Uc3 Developers',
    //  groupName: 'developer',
    //  precedence: 10,
    //  roleArn: domainDeveloperGroupRole.roleArn,
    //});




//    // OpenSearch Domain
//    const domain = new opensearch.Domain(this, 'Domain', {
//      version: opensearch.EngineVersion.OPENSEARCH_2_7,
//      enableVersionUpgrade: true,
//      enableAutoSoftwareUpdate: true,
//      removalPolicy: cdk.RemovalPolicy.DESTROY,
//      capacity: {
//        dataNodes: 3,
//        dataNodeInstanceType: 't3.small.search',
//        multiAzWithStandbyEnabled: false,
//      },
//      ebs: {
//        volumeSize: 10,
//        volumeType: ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
//      },
//      nodeToNodeEncryption: true,
//      encryptionAtRest: {
//        enabled: true,
//      },
//      enforceHttps: true,
//      fineGrainedAccessControl: {
//        //masterUserName: 'domain-admin',
//        //masterUserArn: domainAdminGroupRole.roleArn,
//        masterUserArn: domainIdentityPool.authenticatedRole.roleArn
//        //masterUserPassword: cdk.SecretValue.secretsManager('uc3-ops-opensearch-dev-admin-password'),
//      },
//      zoneAwareness: {
//        enabled: true,
//        availabilityZoneCount: 3,
//      },
//
//      //customEndpoint: {
//      //  domainName: 'uc3-ops-opensearch.uc3dev.cdlib.org',
//      //},
//
//      cognitoDashboardsAuth: {
//        role: domainSearchRole,
//        identityPoolId: domainIdentityPool.identityPoolId,
//        userPoolId: domainUserPool.userPoolId,
//      },
//
//      logging: {
//        auditLogEnabled: true,
//        slowSearchLogEnabled: false,
//        appLogEnabled: true,
//        slowIndexLogEnabled: false,
//      },
//
//    });
//
//    domain.addAccessPolicies(
//      new iam.PolicyStatement({
//        actions: ['es:ESHttp*'],
//        effect: iam.Effect.ALLOW,
//        //principals: [new iam.ArnPrincipal(domainIdentityPool.authenticatedRole.roleArn)],
//        principals: [new iam.ArnPrincipal('*')],
//        resources: [domain.domainArn, `${domain.domainArn}/*`],
//      })
//    );
//
//    
//    domainAdminGroupRole.addToPolicy(
//      new iam.PolicyStatement({
//        effect: iam.Effect.ALLOW,
//        actions: ["es:ESHttp*"],
//        //principals: [new iam.AnyPrincipal()],
//        resources: [domain.domainArn, `${domain.domainArn}/*`],
//      })
//    );
//    
//    //domainAdminGroupRole.addToPolicy(
//    //  new iam.Policy(this, 'openSearchAdminPoliciy', {
//    //      statements: [new iam.PolicyStatement({
//    //        effect: iam.Effect.ALLOW,
//    //        actions: ["es:ESHttp*"],
//    //        resources: [domain.domainArn, `${domain.domainArn}/*`],
//    //        principals: [new iam.AnyPrincipal()],
//    //      })
//    //    ],
//    //  })
//    //);
//
//
//    new cdk.CfnOutput(this, 'domainName', {
//      value: domain.domainName,
//    });
//
//    new cdk.CfnOutput(this, 'domainEndpoint', {
//      value: domain.domainEndpoint,
//    });

  }
}



