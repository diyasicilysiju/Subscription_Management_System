import { Router } from 'express';
import { sendSuccess } from '../utils/apiResponse.js';
import { config } from '../config/env.js';
import prisma from '../config/db.js';

const router = Router();

/**
 * Health Check Endpoint
 * GET /api/v1/health or GET /health
 */
router.get('/', async (_req, res) => {
  const healthData = {
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    service: 'Brightloop Core API',
    database: {
      status: prisma?.user ? 'connected' : 'awaiting_schema_from_member_3',
    },
  };

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Brightloop API is healthy and operational',
    data: healthData,
  });
});

export default router;
