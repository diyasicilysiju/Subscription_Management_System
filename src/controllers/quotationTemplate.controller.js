import * as templateService from '../services/quotationTemplate.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

const respond = (res, template, message, statusCode = 200) =>
  sendSuccess(res, { statusCode, message, data: plain({ template }) });

export const listTemplates = asyncHandler(async (req, res) => {
  const { templates, meta } = await templateService.listTemplates(req.query);
  return sendSuccess(res, { message: 'Quotation templates retrieved successfully', data: plain({ templates, total: meta.total }), meta });
});

export const getTemplate = asyncHandler(async (req, res) =>
  respond(res, await templateService.getTemplate(req.params.id), 'Quotation template retrieved successfully'));

export const createTemplate = asyncHandler(async (req, res) =>
  respond(res, await templateService.createTemplate(req.body, req.user.id), 'Quotation template created successfully', 201));

export const updateTemplate = asyncHandler(async (req, res) =>
  respond(res, await templateService.updateTemplate(req.params.id, req.body, req.user.id), 'Quotation template updated successfully'));

export const deactivateTemplate = asyncHandler(async (req, res) =>
  respond(res, await templateService.updateTemplate(req.params.id, { isActive: false }, req.user.id), 'Quotation template deactivated'));
