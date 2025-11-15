import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import basicAuth from 'express-basic-auth';
import uploadRoutes from './routes/upload.routes';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// ⭐ SECURITY: Rate Limiting - Prevent abuse and attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// ⭐ SECURITY: Basic Authentication - Require login
// Only apply to API routes (exclude health check for monitoring)
const authMiddleware = basicAuth({
  users: {
    [process.env.API_USERNAME || 'admin']: process.env.API_PASSWORD || 'changeme123'
  },
  challenge: true,
  realm: 'Universal Checker API',
});

// Apply auth to all API routes except health check
app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return next(); // Skip auth for health check
  }
  return authMiddleware(req, res, next);
});

// Routes
app.use('/api', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Universal Checker API is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  console.log(`📤 Upload: http://localhost:${PORT}/api/upload`);
});
