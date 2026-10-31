import * as taxService from '../services/tax.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

export const listTaxes = asyncHandler(async (req, res) => {
  const { taxes, meta } = await taxService.listTaxes(req.query);
  return sendSuccess(res, { message: 'Taxes retrieved successfully', data: plain({ taxes, total: meta.total }), meta });
});

export const getTax = asyncHandler(async (req, res) => {
  const tax = await taxService.getTax(req.params.id);
  return sendSuccess(res, { message: 'Tax retrieved successfully', data: plain({ tax }) });
});

export const createTax = asyncHandler(async (req, res) => {
  const tax = await taxService.createTax(req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Tax created successfully', data: plain({ tax }) });
});

export const updateTax = asyncHandler(async (req, res) => {
  const tax = await taxService.updateTax(req.params.id, req.body);
  return sendSuccess(res, { message: 'Tax updated successfully', data: plain({ tax }) });
});
