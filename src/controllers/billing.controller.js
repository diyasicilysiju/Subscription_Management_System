import * as billingService from '../services/billing.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

export const runBilling = asyncHandler(async (req, res) => {
  const result = await billingService.runBilling({ ...req.body, user: req.user });
  return sendSuccess(res, {
    statusCode: 201,
    message: `Billing run ${result.summary.status.toLowerCase()}: ${result.summary.invoicesGenerated} invoice(s) generated`,
    data: plain(result),
  });
});

export const listBillingRuns = asyncHandler(async (req, res) => {
  const { billingRuns, meta } = await billingService.listBillingRuns(req.query);
  return sendSuccess(res, { message: 'Billing runs retrieved successfully', data: plain({ billingRuns, total: meta.total }), meta });
});

export const getBillingRun = asyncHandler(async (req, res) => {
  const billingRun = await billingService.getBillingRun(req.params.id);
  return sendSuccess(res, { message: 'Billing run retrieved successfully', data: plain({ billingRun }) });
});
