import * as reportService from '../services/report.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

export const getSummary = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'Summary report generated', data: plain(await reportService.getSummary(req.query)) }));

export const getMetrics = asyncHandler(async (_req, res) =>
  sendSuccess(res, { message: 'Dashboard metrics generated', data: plain(await reportService.getMetrics()) }));

export const getRevenueReport = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'Revenue report generated', data: plain(await reportService.getRevenueReport(req.query)) }));
