import * as subscriptionService from '../services/subscription.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { plain } from '../utils/money.js';

const respond = (res, subscription, message, statusCode = 200) =>
  sendSuccess(res, { statusCode, message, data: plain({ subscription }) });

export const listSubscriptions = asyncHandler(async (req, res) => {
  const { subscriptions, meta } = await subscriptionService.listSubscriptions(req.user, req.query);
  return sendSuccess(res, { message: 'Subscriptions retrieved successfully', data: plain({ subscriptions, total: meta.total }), meta });
});

export const getSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.getSubscription(req.user, req.params.id), 'Subscription retrieved successfully'));

export const createSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.createSubscription(req.user, req.body), 'Subscription created successfully', 201));

export const activateSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.activateSubscription(req.user, req.params.id), 'Subscription activated'));

export const pauseSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.pauseSubscription(req.user, req.params.id), 'Subscription has been paused'));

export const resumeSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.resumeSubscription(req.user, req.params.id), 'Subscription has been resumed'));

export const cancelSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.cancelSubscription(req.user, req.params.id, req.body?.reason ?? null), 'Subscription cancelled successfully'));

export const renewSubscription = asyncHandler(async (req, res) =>
  respond(res, await subscriptionService.renewSubscription(req.user, req.params.id), 'Subscription renewed successfully'));
