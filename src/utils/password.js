import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

/**
 * Hash a plain text password with salt
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, config.bcrypt.saltRounds);
};

/**
 * Compare plain text password against hashed password
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
