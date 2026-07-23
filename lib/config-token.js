export function encodeConfig(config) {
  return Buffer.from(JSON.stringify(config), 'utf8').toString('base64url');
}
export function decodeConfig(token) {
  if (!token || token.length > 10000) throw new Error('Missing or invalid webhook configuration.');
  return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
}
