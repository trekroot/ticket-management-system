import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/database.js';
import ticketRequestRoutes from './src/routes/ticketRequestRoutes.js';
import gameRoutes from './src/routes/gameRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import matchmakerRoutes from './src/routes/matchmakerRoutes.js';
import healthStatusRoutes from './src/routes/healthStatusRoutes.js';
import feedbackRoutes from './src/routes/feedbackRoutes.js';
import adminAuditRoutes from './src/routes/adminAuditRoutes.js';
import adminAuthRoutes from './src/routes/adminAuthRoutes.js';
import wixAuthRoutes from './src/routes/wixAuthRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,  // CRITICAL - allows cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/tickets', ticketRequestRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matchmaker', matchmakerRoutes);
app.use('/api/version', healthStatusRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/audit', adminAuditRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/auth', wixAuthRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Ticket Management API' });
});

const PORT = process.env.PORT || 3000;

// Connect to database and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });
