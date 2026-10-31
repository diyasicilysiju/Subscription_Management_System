import * as quotationService from '../services/quotation.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

const respond = (res, quotation, message, statusCode = 200) =>
  sendSuccess(res, { statusCode, message, data: plain({ quotation }) });

export const listQuotations = asyncHandler(async (req, res) => {
  const { quotations, meta } = await quotationService.listQuotations(req.user, req.query);
  return sendSuccess(res, { message: 'Quotations retrieved successfully', data: plain({ quotations, total: meta.total }), meta });
});

export const getQuotation = asyncHandler(async (req, res) =>
  respond(res, await quotationService.getQuotation(req.user, req.params.id), 'Quotation retrieved successfully'));

export const createQuotation = asyncHandler(async (req, res) =>
  respond(res, await quotationService.createQuotation(req.user, req.body), 'Quotation created successfully', 201));

export const sendQuotation = asyncHandler(async (req, res) =>
  respond(res, await quotationService.sendQuotation(req.user, req.params.id), 'Quotation marked as sent'));

export const acceptQuotation = asyncHandler(async (req, res) =>
  respond(res, await quotationService.acceptQuotation(req.user, req.params.id), 'Quotation accepted'));

export const rejectQuotation = asyncHandler(async (req, res) =>
  respond(res, await quotationService.rejectQuotation(req.user, req.params.id), 'Quotation rejected'));

export const convertQuotation = asyncHandler(async (req, res) => {
  const { quotation, subscription } = await quotationService.convertQuotation(req.user, req.params.id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Quotation successfully converted to a subscription',
    data: plain({ quotation, subscription }),
  });
});
