import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { signLanguageRouter } from './routes/signLanguage.js';
import { voiceRouter } from './routes/voice.js';
import { RealisticWebSocketHandler } from './websocket/RealisticWebSocketHandler.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 10e6 // 10MB for video data
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173"
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-realistic',
    features: ['realistic-hand-tracking', '3d-avatar', 'auto-voice-output']
  });
});

// API Routes
app.use('/api/sign-language', signLanguageRouter);
app.use('/api/voice', voiceRouter);

// Initialize Realistic WebSocket handler
const realisticWsHandler = new RealisticWebSocketHandler(io);

async function initializeServer() {
  try {
    await realisticWsHandler.initialize();
    logger.info('Realistic WebSocket handler initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize realistic services:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Start server with realistic features
async function startServer() {
  await initializeServer();
  
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Realistic GestureVoice backend server running on port ${PORT}`);
    logger.info(`🤖 Features: TensorFlow hand tracking, 3D Avatar, Auto voice output`);
    logger.info(`📡 WebSocket ready for real-time sign language communication`);
    logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await realisticWsHandler.dispose();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await realisticWsHandler.dispose();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };