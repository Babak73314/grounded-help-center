import { App } from 'aws-cdk-lib';
import { HelpCenterStack } from '../lib/help-center-stack';
import { settingsFromContext } from './settings';

const app = new App();

const context = (key: string): string | undefined => {
  const value = app.node.tryGetContext(key) as string | number | boolean | undefined;
  return value === undefined || value === '' ? undefined : String(value);
};

new HelpCenterStack(app, context('stackName') ?? 'GroundedHelpCenter', {
  // The account and region of the credentials in use, when there are any; without them the
  // stack is synthesised environment-agnostic, which is how CI synthesises it.
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  description: 'Grounded help center: static site on S3 and CloudFront, assistant on Lambda and Aurora PostgreSQL with pgvector.',
  ...settingsFromContext(context),
});
