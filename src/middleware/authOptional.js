// middleware/authOptional.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = async function authOptional(req, res, next) {
  try {
    // 1) Try JWT from Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Keep it lightweight: no DB call unless you truly need it later
        req.user = { _id: decoded.id };
      } catch {
        // ignore invalid/expired token – treat as guest
      }
    }

    // 2) Guest fingerprint (only if not logged in)
    if (!req.user) {
      // Prefer req.ip (honors trust proxy), then fallbacks
      let ip =
        req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown_ip';

      // Normalize IPv6 ::ffff:127.0.0.1 → 127.0.0.1
      if (ip.startsWith('::ffff:')) ip = ip.slice(7);

      const ua = req.headers['user-agent'] || 'unknown_agent';

      // Privacy-safer stable hash → 32 hex chars
      const hash = crypto
        .createHash('sha256')
        .update(`${ip}||${ua}`)
        .digest('hex')
        .slice(0, 32);

      req.viewerId = `guest_${hash}`;
    }

    return next();
  } catch (err) {
    console.error('authOptional failed:', err.message);
    // Never block the request
    return next();
  }
};
