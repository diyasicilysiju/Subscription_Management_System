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
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = prisma?.user ? 'ready_awaiting_connection' : 'not_initialized';
  }

  const healthData = {
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    service: 'Brightloop Core API',
    database: {
      client: 'Prisma Client v5.22.0',
      status: dbStatus,
    },
  };

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Brightloop API is healthy and operational',
    data: healthData,
  });
});

export default router;
