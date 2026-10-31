import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

// 1. HTTP Security Headers
app.use(helmet());

// 2. CORS Configuration for Member 1 Frontend
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by Access-Control-Allow-Origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rate Limiting for all API endpoints
app.use('/api', apiLimiter);

// 5. Direct Root Health Check
app.use('/health', healthRoutes);

// 6. Master API v1 Route Registration
app.use('/api/v1', apiRouter);

// 7. 404 Catch-All Middleware
app.use(notFoundHandler);

// 8. Centralized Global Error Handler
app.use(errorHandler);

export default app;
