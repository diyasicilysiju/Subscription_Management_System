import * as planService from '../services/plan.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getPlans = async (req, res, next) => {
  try {
    const plans = await planService.getAllPlans();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Subscription plans retrieved successfully',
      data: { plans },
    });
  } catch (error) {
    return next(error);
  }
};

export const getPlan = async (req, res, next) => {
  try {
    const plan = await planService.getPlanById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Subscription plan retrieved successfully',
      data: { plan },
    });
  } catch (error) {
    return next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const plan = await planService.createPlan(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Subscription plan created successfully',
      data: { plan },
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Subscription plan updated successfully',
      data: { plan },
    });
  } catch (error) {
    return next(error);
  }
};
