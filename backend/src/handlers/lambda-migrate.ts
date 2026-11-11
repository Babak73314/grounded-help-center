import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { loadDataApiTarget } from '../config';
import { DataApiClient } from '../db/data-api';
import { migrate } from '../db/migrate';
import { migrations } from '../db/migrations';
import type { SqlClient } from '../db/sql';
import { log } from '../services';

/**
 * Applies the database migrations during `cdk deploy`, as a CloudFormation
 * custom resource that changes whenever a migration does. A failure fails the
 * deployment, so code that expects a newer schema is never left running
 * against an older one. Deleting the stack deletes nothing here: the data
 * outlives the resource.
 */
export async function runWithRetries(db: SqlClient, attempts = 5, delayMs = 10_000): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await migrate(db, migrations);
    } catch (error) {
      // A brand-new cluster can refuse the first statements for a short while; the schema checks are not retried.
      const message = error instanceof Error ? error.message : '';
      const permanent = /changed after it was applied|does not know|share an id|not in id order/.test(message);
      if (permanent || attempt >= attempts) throw error;
      log('migrate-retry', { attempt, error: error instanceof Error ? error.name : 'unknown' });
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

export async function handler(event: CloudFormationCustomResourceEvent): Promise<{ PhysicalResourceId: string; Data?: Record<string, string> }> {
  const physicalResourceId = 'help-center-schema';
  if (event.RequestType === 'Delete') return { PhysicalResourceId: physicalResourceId };
  const applied = await runWithRetries(new DataApiClient(loadDataApiTarget()));
  log('migrate', { applied });
  return { PhysicalResourceId: physicalResourceId, Data: { Applied: applied.join(',') || 'none' } };
}
