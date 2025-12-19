import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/database.js';
import ticketRequestRoutes from './src/routes/ticketRequestRoutes.js';
import gameRoutes from './src/routes/gameRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import matchmakerRoutes from './src/routes/matchmakerRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://ticket-management-system.s3-website-us-east-1.amazonaws.com',
    'https://d2175tj5v07y9z.cloudfront.net',
    'http://localhost:5173'  // Keep for local dev
  ],
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
