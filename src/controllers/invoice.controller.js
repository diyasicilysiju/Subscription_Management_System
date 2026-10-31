import * as invoiceService from '../services/invoice.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

const respond = (res, invoice, message) => sendSuccess(res, { message, data: plain({ invoice }) });

export const listInvoices = asyncHandler(async (req, res) => {
  const { invoices, meta } = await invoiceService.listInvoices(req.user, req.query);
  return sendSuccess(res, { message: 'Invoices retrieved successfully', data: plain({ invoices, total: meta.total }), meta });
});

export const getInvoice = asyncHandler(async (req, res) =>
  respond(res, await invoiceService.getInvoice(req.user, req.params.id), 'Invoice retrieved successfully'));

export const confirmInvoice = asyncHandler(async (req, res) =>
  respond(res, await invoiceService.confirmInvoice(req.user, req.params.id), 'Invoice confirmed and issued to customer'));

export const cancelInvoice = asyncHandler(async (req, res) =>
  respond(res, await invoiceService.cancelInvoice(req.user, req.params.id), 'Invoice cancelled'));

export const sendInvoice = asyncHandler(async (req, res) => {
  const { invoice, emailSent } = await invoiceService.sendInvoice(req.user, req.params.id);
  return sendSuccess(res, {
    message: 'Send request recorded. No email provider is configured, so nothing was emailed; print or download the invoice instead.',
    data: plain({ invoice, emailSent }),
  });
});
