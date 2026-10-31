import * as discountService from '../services/discount.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

export const listDiscounts = asyncHandler(async (req, res) => {
  const { discounts, meta } = await discountService.listDiscounts(req.query);
  return sendSuccess(res, { message: 'Discounts retrieved successfully', data: plain({ discounts, total: meta.total }), meta });
});

export const getDiscount = asyncHandler(async (req, res) => {
  const discount = await discountService.getDiscount(req.params.id);
  return sendSuccess(res, { message: 'Discount retrieved successfully', data: plain({ discount }) });
});

export const createDiscount = asyncHandler(async (req, res) => {
  const discount = await discountService.createDiscount(req.body, req.user.id);
  return sendSuccess(res, { statusCode: 201, message: 'Discount rule created successfully', data: plain({ discount }) });
});

export const updateDiscount = asyncHandler(async (req, res) => {
  const discount = await discountService.updateDiscount(req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Discount updated successfully', data: plain({ discount }) });
});

export const deactivateDiscount = asyncHandler(async (req, res) => {
  const discount = await discountService.updateDiscount(req.params.id, { isActive: false }, req.user.id);
  return sendSuccess(res, { message: 'Discount deactivated successfully', data: plain({ discount }) });
});
