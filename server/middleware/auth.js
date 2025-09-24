const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const blacklisted = await db.query(
      'SELECT id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }
    
    // Get user data
    const result = await db.query(
      'SELECT id, username, email, full_name, avatar_url, is_admin, is_moderator, is_banned, reputation FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    
    const user = result.rows[0];
    
    if (user.is_banned) {
      return res.status(403).json({ error: 'Account has been banned.' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

const moderatorOrAdmin = (req, res, next) => {
  if (!req.user.is_admin && !req.user.is_moderator) {
    return res.status(403).json({ error: 'Moderator or admin access required.' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await db.query(
        'SELECT id, username, email, full_name, avatar_url, is_admin, is_moderator, is_banned, reputation FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length > 0 && !result.rows[0].is_banned) {
        req.user = result.rows[0];
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  auth,
  adminOnly,
  moderatorOrAdmin,
  optionalAuth
};


