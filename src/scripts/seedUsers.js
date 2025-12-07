import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const users = [
    {
        _id: '693453ccd189f5e4bc1cb238',
        username: 'admin_1765036990',
        firstName: 'adminFirst',
        lastName: 'adminLast',
        email: 'a1765036999@g.a',
        discordHandle: 'adminny',
        authProvider: 'email',
        role: 'admin',
        createdAt: new Date('2025-12-06T16:03:24.575Z'),
        updatedAt: new Date('2025-12-06T16:03:24.575Z')
    },
    {
        _id: '693453ccd189f5e4bc1cb230',
        username: 'user_1765036990',
        firstName: 'userFirst',
        lastName: 'userLast',
        email: 'u1765036990@b.c',
        discordHandle: 'newUser',
        authProvider: 'email',
        role: 'user',
        createdAt: new Date('2025-12-06T16:03:24.575Z'),
        updatedAt: new Date('2025-12-06T16:03:24.575Z')
    },
    {
        _id: '693453ccd189f5e4bc1cb231',
        username: 'user_1765036991',
        firstName: 'userSecond',
        lastName: 'userLast II',
        email: 'u1765036991@b.d',
        discordHandle: 'HOPfannumber1',
        authProvider: 'email',
        role: 'user',
        createdAt: new Date('2025-12-06T17:03:24.575Z'),
        updatedAt: new Date('2025-12-06T17:03:24.575Z')
    }
];

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

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