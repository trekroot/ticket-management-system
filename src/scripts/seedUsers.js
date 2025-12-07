import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { users } from './seedData.js';

dotenv.config();

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[seedUsers] Connected to MongoDB');

        // Clear users
        await User.deleteMany();
        console.log('Cleared existing users');

        // Insert users
        const result = await User.insertMany(users);
        console.log(`Inserted ${result.length} users`);

    console.log('\nUsers seeded:');
    result.forEach(user => {
      console.log(`  ${user.username}, ${user.id}, (${user.role})`);
    });
  } catch (error) {
    console.error('Error seeding users:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedUsers();