#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Uc3OpsOpensearchStack } from '../lib/uc3-ops-opensearch-stack';

const app = new cdk.App();

new Uc3OpsOpensearchStack(app, 'Uc3OpsOpensearchStack', {
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  env: {
    account: '671846987296',
    region: 'us-west-2',
  },
});

