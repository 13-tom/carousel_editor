import crypto from 'crypto';

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * HTTP Basic Auth, gated on two env vars. Disabled entirely (both requests
 * pass straight through) unless AUTH_USERNAME and AUTH_PASSWORD are both
 * set — so local single-user use stays frictionless, and setting those two
 * vars is all that's needed to lock the app down before exposing it beyond
 * localhost (e.g. on a cloud VM's public IP).
 */
export function basicAuth(req, res, next) {
  const user = process.env.AUTH_USERNAME;
  const pass = process.env.AUTH_PASSWORD;
  if (!user || !pass) return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const sep = decoded.indexOf(':');
    const reqUser = sep === -1 ? decoded : decoded.slice(0, sep);
    const reqPass = sep === -1 ? '' : decoded.slice(sep + 1);
    if (safeEqual(reqUser, user) && safeEqual(reqPass, pass)) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Carousel Editor"');
  res.status(401).send('Authentication required');
}
