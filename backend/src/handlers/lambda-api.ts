import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import { handleApi, type ApiRequest } from '../api';
import { loadAllowedOrigins, loadAssistantConfig, loadDataApiTarget } from '../config';
import { DataApiClient } from '../db/data-api';
import { buildEmbedder, buildModel, type Services } from '../services';

/**
 * The API as a Lambda function URL. CloudFront reaches it with Origin Access
 * Control, so it cannot be called directly from the internet, and
 * `CloudFront-Viewer-Address` — set by CloudFront, not by the caller —
 * identifies the visitor for the rate limits.
 */
let services: Services | undefined;

function lambdaServices(): Services {
  if (services) return services;
  const config = loadAssistantConfig();
  services = {
    db: new DataApiClient(loadDataApiTarget()),
    embedder: buildEmbedder(config),
    model: buildModel(config),
    limits: config.limits,
    allowedOrigins: loadAllowedOrigins(),
  };
  return services;
}

/** The visitor's address as CloudFront saw it: `203.0.113.7:46532` or `2001:db8::1:46532`, without the port. */
export function viewerAddress(event: LambdaFunctionURLEvent): string {
  const viaCloudFront = Object.entries(event.headers ?? {}).find(([name]) => name.toLowerCase() === 'cloudfront-viewer-address')?.[1];
  if (viaCloudFront) return viaCloudFront.replace(/:\d+$/, '');
  return event.requestContext.http.sourceIp;
}

export function toApiRequest(event: LambdaFunctionURLEvent): ApiRequest {
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]));
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
  return { method: event.requestContext.http.method, path: event.rawPath, headers, body, clientAddress: viewerAddress(event) };
}

export async function handler(event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> {
  const result = await handleApi(toApiRequest(event), lambdaServices());
  return { statusCode: result.status, headers: result.headers, body: result.body };
}
