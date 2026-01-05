const jwt = require('jsonwebtoken');

function getTokenFromHeader(headerValue = '') {
  if (!headerValue.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return headerValue.slice(7).trim();
}

function requireAdmin(req, res, next) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET is not configured.');
    return res.status(500).json({ error: 'Authentication not configured.' });
  }

  const token = getTokenFromHeader(req.headers.authorization || '');

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.admin = payload;
    return next();
  } catch (error) {
    console.warn('Invalid token', error.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = {
  requireAdmin,
};

