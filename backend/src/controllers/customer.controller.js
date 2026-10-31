import * as customerService from '../services/customer.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { customers, meta } = await customerService.getAllCustomers(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customers retrieved successfully',
      data: { customers },
      meta,
    });
  } catch (error) {
    return next(error);
  }
};

export const getCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer retrieved successfully',
      data: { customer },
    });
  } catch (error) {
    return next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Customer created successfully',
      data: { customer },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer updated successfully',
      data: { customer },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.deleteCustomer(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer deactivated successfully',
      data: { customer },
    });
  } catch (error) {
    return next(error);
  }
};
