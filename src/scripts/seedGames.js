import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from '../models/Game.js';
import { games } from './seedData.js';

dotenv.config();

async function seedGames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[seedGames] Connected to MongoDB');

    // Clear existing games
    await Game.deleteMany();
    console.log('Cleared existing games');

    // Insert new games
    const result = await Game.insertMany(games);
    console.log(`Inserted ${result.length} games`);

    console.log('\nHome games seeded:');
    result.forEach(game => {
      console.log(`  ${game.date.toLocaleDateString()} - vs ${game.opponent} (${game.venue})`);
    });

  } catch (error) {
    console.error('Error seeding games:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedGames();
