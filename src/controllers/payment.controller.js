import * as paymentService from '../services/payment.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

export const listPayments = asyncHandler(async (req, res) => {
  const { payments, meta } = await paymentService.listPayments(req.user, req.query);
  return sendSuccess(res, { message: 'Payments retrieved successfully', data: plain({ payments, total: meta.total }), meta });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPayment(req.user, req.params.id);
  return sendSuccess(res, { message: 'Payment retrieved successfully', data: plain({ payment }) });
});

export const recordPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.recordPayment(req.user, req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Payment recorded and allocated successfully', data: plain({ payment }) });
});
