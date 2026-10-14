import { isStaticPreview } from './environment.js';
import { createPreviewTransport } from '../preview/transport.js';

export function createRequest(scope, { portal, fetch: transport = globalThis.fetch } = {}) {
  const request = isStaticPreview ? createPreviewTransport(portal) : transport;
  return (url, options = {}) => request(url, { ...options, signal: scope.signal });
}
