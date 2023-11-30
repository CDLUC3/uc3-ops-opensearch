# A cdk app for building AWS OpenSearch Domain


The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `nvm use stable`  select preferred node version

* `npm install`	    installs all packages in `./packages.json` locally
* `npm update --save` updates all packages in `./packages.json` locally
* `npm audit`       show vulnerabilities in installed packages
* `npm audit fix`   update packages with vulnerabilies

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template





Global prereqs
--------------

nvm install --lts node
nvm alias iron lts/iron
nvm use iron

npm install -g cdk typescript ts-node


updating aws-cognito-idnetitypool-alpha

npm show @aws-cdk/aws-cognito-identitypool-alpha

@aws-cdk/aws-cognito-identitypool-alpha@2.110.0-alpha.0 | Apache-2.0 | deps: none | versions: 142
The CDK Construct Library for AWS::Cognito Identity Pools
https://github.com/aws/aws-cdk

npm install @aws-cdk/aws-cognito-identitypool-alpha@2.110.0-alpha.0


Using CDK
---------

to launch an app not specified in cdk.json:
```
cdk --app "npx ts-node bin/hello-cdk.ts" ls
```






