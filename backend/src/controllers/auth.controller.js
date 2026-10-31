import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Handle user registration (Customer by default)
 */
export const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle user login
 */
export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get profile of currently authenticated user
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Current user profile fetched successfully',
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin action: create a new staff account
 */
export const createStaff = async (req, res, next) => {
  try {
    const result = await authService.createStaffUser(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Staff account created successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
