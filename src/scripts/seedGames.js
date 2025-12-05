import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from '../models/Game.js';

dotenv.config();

const games2025 = [
  // Friendlies & Cup (Lewiston High School)
  { opponent: 'CD Faialense', date: new Date('2025-03-20T18:30:00-04:00'), time: '6:30 PM', venue: 'Lewiston High School', season: 2025, matchType: 'Friendly' },
  { opponent: 'Hartford Athletic', date: new Date('2025-04-02T18:30:00-04:00'), time: '6:30 PM', venue: 'Lewiston High School', season: 2025, matchType: 'U.S. Open Cup' },
  { opponent: 'Rhode Island FC', date: new Date('2025-04-15T19:00:00-04:00'), time: '7:00 PM', venue: 'Lewiston High School', season: 2025, matchType: 'Cup' },

  // Home games at Fitzpatrick Stadium
  { opponent: 'One Knoxville SC', date: new Date('2025-05-04T18:00:00-04:00'), time: '6:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'FC Naples', date: new Date('2025-05-17T17:30:00-04:00'), time: '5:30 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Detroit City FC', date: new Date('2025-05-31T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Union Omaha', date: new Date('2025-06-15T18:00:00-04:00'), time: '6:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'AV Alta FC', date: new Date('2025-07-02T18:30:00-04:00'), time: '6:30 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'South Georgia Tormenta FC', date: new Date('2025-07-06T18:30:00-04:00'), time: '6:30 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Greenville Triumph SC', date: new Date('2025-07-16T18:30:00-04:00'), time: '6:30 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Pittsburgh Riverhounds SC', date: new Date('2025-07-25T18:30:00-04:00'), time: '6:30 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Halifax Wanderers', date: new Date('2025-08-06T18:30:00-04:00'), time: '6:30 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'Friendly' },
  { opponent: 'Richmond Kickers', date: new Date('2025-08-09T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Spokane Velocity FC', date: new Date('2025-08-17T18:00:00-04:00'), time: '6:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Charlotte Independence', date: new Date('2025-08-30T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Chattanooga Red Wolves SC', date: new Date('2025-09-13T18:00:00-04:00'), time: '6:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'FC Naples', date: new Date('2025-09-21T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Texoma FC', date: new Date('2025-09-27T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Forward Madison FC', date: new Date('2025-10-04T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Westchester SC', date: new Date('2025-10-18T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
  { opponent: 'Spokane Velocity', date: new Date('2025-10-21T18:00:00-04:00'), time: '6:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One (Rescheduled)' },
  { opponent: 'AV Alta FC', date: new Date('2025-10-25T17:00:00-04:00'), time: '5:00 PM', venue: 'Fitzpatrick Stadium', season: 2025, matchType: 'USL League One' },
];

async function seedGames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing games for 2025
    await Game.deleteMany({ season: 2025 });
    console.log('Cleared existing 2025 games');

    // Insert new games
    const result = await Game.insertMany(games2025);
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
