import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/database.js';
import ticketRequestRoutes from './src/routes/ticketRequestRoutes.js';
import gameRoutes from './src/routes/gameRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tickets', ticketRequestRoutes);
app.use('/api/games', gameRoutes);

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
