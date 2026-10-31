import * as planService from '../services/plan.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getPlans = async (req, res, next) => {
  try {
    const plans = await planService.getAllPlans(req.query);
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

export const deletePlan = async (req, res, next) => {
  try {
    const plan = await planService.deletePlan(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Subscription plan deactivated successfully',
      data: { plan },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Validate Plan Minimum Quantity Endpoint
 * Used by Member 1 Frontend and Member 4 Subscription lifecycle
 */
export const validateQuantity = async (req, res, next) => {
  try {
    const result = await planService.validatePlanQuantity(req.params.id, req.body.quantity);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Quantity ${req.body.quantity} satisfies plan '${result.plan.name}' minimum requirements`,
      data: {
        isValid: true,
        planId: result.plan.id,
        planCode: result.plan.code,
        minQuantity: result.plan.minQuantity,
        requestedQuantity: result.requestedQuantity,
      },
    });
  } catch (error) {
    return next(error);
  }
};
