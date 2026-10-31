import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Sign and generate a JWT token
 * @param {Object} payload - User data to embed in token (id, email, role)
 * @param {Object} [options={}] - Custom jwt sign options (e.g. expiresIn)
 * @returns {string} - Signed JWT string
 */
export const generateToken = (payload, options = {}) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: options.expiresIn || config.jwt.expiresIn,
    ...options,
  });
};

/**
 * Verify a JWT token
 * Throws JsonWebTokenError or TokenExpiredError if invalid
 * @param {string} token - Bearer JWT token string
 * @returns {Object} - Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Decode token without verification (useful for inspecting headers/payload)
 * @param {string} token 
 * @returns {Object|null}
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};
