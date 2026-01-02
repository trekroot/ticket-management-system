import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BuyRequest, SellRequest } from '../models/TicketRequest.js';
import Game from '../models/Game.js';
import { users } from './seedData.js';

dotenv.config();

// Build user references with snapshots for ticket requests
const withSnapshot = (user) => ({
  _id: user._id,
  snapshot: { username: user.username, firstName: user.firstName, lastName: user.lastName }
});

export const ADMIN_USER = withSnapshot(users[0]);
export const USER_1 = withSnapshot(users[1]);
export const USER_2 = withSnapshot(users[2]);

// Hardcoded IDs for testing
const BUY_REQUEST_IDS = {
  FIRST_TIME_SUPPORTER: '783453ccd189f5e4bc1cb001',
  FAMILY_OUTING: '783453ccd189f5e4bc1cb002',
  BAND_MEMBER: '783453ccd189f5e4bc1cb003',
  FREE_REQUEST: '783453ccd189f5e4bc1cb004',
  BUY_ANYTHING: '783453ccd189f5e4bc1cb005'
};

const SELL_REQUEST_IDS = {
  SEASON_TICKET_HOLDER: '783453ccd189f5e4bc1cb101',
  WORK_CONFLICT: '783453ccd189f5e4bc1cb102',
  FREE_DONATION: '783453ccd189f5e4bc1cb103',
  PREMIUM_SEATS: '783453ccd189f5e4bc1cb104',
  SELL_ANYTHING: '783453ccd189f5e4bc1cb105'
};

async function seedTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[seedTickets] Connected to MongoDB');

    // Get existing games to reference
    const manyGames = await Game.find().sort({ date: 1 }).limit(15);

    if (manyGames.length === 0) {
      console.log('No games found. Please seed games first.');
      return;
    }

    const games = manyGames.slice(6,9);

    console.log(`Found ${games.length} games to use for ticket requests`);

    // Clear existing ticket requests
    await BuyRequest.deleteMany();
    await SellRequest.deleteMany();
    console.log('Cleared existing ticket requests');

    const buyRequests = [
      {
        _id: BUY_REQUEST_IDS.FIRST_TIME_SUPPORTER,
        userId: USER_1._id,
        userSnapshot: USER_1.snapshot,
        gameId: games[0]._id,
        sectionTypeDesired: 'supporters',
        numTickets: 2,
        ticketsTogether: true,
        maxPrice: 25,
        bandMember: false,
        firstTimeAttending: true,
        requestingFree: false,
        anySectionDesired: false,
        notes: 'First game, excited to be in the supporters section!',
        status: 'open'
      },
      {
        _id: BUY_REQUEST_IDS.BUY_ANYTHING,
        userId: ADMIN_USER._id,
        userSnapshot: ADMIN_USER.snapshot,
        gameId: games[1]._id,
        sectionTypeDesired: 'supporters',
        numTickets: 1,
        ticketsTogether: true,
        maxPrice: 100,
        bandMember: false,
        firstTimeAttending: false,
        requestingFree: false,
        anySectionDesired: true,
        notes: 'Just me!',
        status: 'open'
      },
      {
        _id: BUY_REQUEST_IDS.BAND_MEMBER,
        userId: ADMIN_USER._id,
        userSnapshot: ADMIN_USER.snapshot,
        gameId: games[0]._id,
        sectionTypeDesired: 'supporters',
        numTickets: 1,
        ticketsTogether: false,
        maxPrice: 20,
        bandMember: true,
        firstTimeAttending: false,
        requestingFree: false,
        anySectionDesired: true,
        notes: 'Band member looking for a ticket',
        status: 'open'
      },
      {
        _id: BUY_REQUEST_IDS.FREE_REQUEST,
        userId: USER_2._id,
        userSnapshot: USER_2.snapshot,
        gameId: null, // Any game
        sectionTypeDesired: 'supporters',
        numTickets: 2,
        ticketsTogether: true,
        maxPrice: 0,
        bandMember: false,
        firstTimeAttending: true,
        requestingFree: true,
        anySectionDesired: false,
        notes: 'Looking for donated tickets to any upcoming game',
        status: 'open'
      }
    ];

    const sellRequests = [
      {
        _id: SELL_REQUEST_IDS.SEASON_TICKET_HOLDER,
        userId: ADMIN_USER._id,
        userSnapshot: ADMIN_USER.snapshot,
        gameId: games[0]._id,
        sectionTypeOffered: 'supporters',
        sectionNumber: 118,
        row: 'D',
        seats: [5, 9],
        numTickets: 2,
        ticketsTogether: false,
        minPrice: 20,
        donatingFree: false,
        notes: 'Season ticket holder, can\'t make this game',
        status: 'open'
      },
      {
        _id: SELL_REQUEST_IDS.WORK_CONFLICT,
        userId: USER_2._id,
        userSnapshot: USER_2.snapshot,
        gameId: games.length > 1 ? games[1]._id : games[0]._id,
        sectionTypeOffered: 'standard',
        sectionNumber: 105,
        row: 'B',
        seats: [10, 11, 12],
        numTickets: 3,
        ticketsTogether: true,
        minPrice: 25,
        donatingFree: false,
        notes: 'Work conflict, need to sell these',
        status: 'open'
      },
      {
        _id: SELL_REQUEST_IDS.FREE_DONATION,
        userId: ADMIN_USER._id,
        userSnapshot: ADMIN_USER.snapshot,
        gameId: games[0]._id,
        sectionTypeOffered: 'supporters',
        sectionNumber: 119, // GA section
        numTickets: 1,
        ticketsTogether: false,
        minPrice: 0,
        donatingFree: true,
        notes: 'Free ticket for a first-time fan!',
        status: 'open'
      },
      {
        _id: SELL_REQUEST_IDS.PREMIUM_SEATS,
        userId: USER_1._id,
        userSnapshot: USER_1.snapshot,
        gameId: games.length > 2 ? games[2]._id : games[0]._id,
        sectionTypeOffered: 'highroller',
        sectionNumber: 'FC-3',
        seats: [8, 9],
        numTickets: 2,
        ticketsTogether: true,
        minPrice: 40,
        donatingFree: false,
        notes: 'Highroller seats, great view',
        status: 'open'
      },
      {
        _id: SELL_REQUEST_IDS.SELL_ANYTHING,
        userId: USER_1._id,
        userSnapshot: USER_1.snapshot,
        gameId: games[1]._id,
        sectionTypeOffered: 'deweys',
        sectionNumber: 4,
        ticketNumbers: [22],
        numTickets: 1,
        ticketsTogether: true,
        minPrice: 3,
        donatingFree: false,
        notes: '$3 Deweys section',
        status: 'open'
      }
    ];

    // Insert buy requests
    const insertedBuys = await BuyRequest.insertMany(buyRequests);
    console.log(`Inserted ${insertedBuys.length} buy requests`);

    // Insert sell requests
    const insertedSells = await SellRequest.insertMany(sellRequests);
    console.log(`Inserted ${insertedSells.length} sell requests`);

    console.log('\nBuy requests seeded:');
    for (const buy of insertedBuys) {
      const game = games.find(g => g._id.equals(buy.gameId));
      const gameName = game ? `vs ${game.opponent}` : 'Any game';
      console.log(`  ${buy._id} - ${buy.numTickets} ticket(s) for ${gameName} (${buy.sectionType})`);
    }

    console.log('\nSell requests seeded:');
    for (const sell of insertedSells) {
      const game = games.find(g => g._id.equals(sell.gameId));
      const gameName = game ? `vs ${game.opponent}` : 'Any game';
      const priceInfo = sell.donatingFree ? 'FREE' : `$${sell.minPrice}`;
      console.log(`  ${sell._id} - ${sell.numTickets} ticket(s) for ${gameName} (${priceInfo})`);
    }

  } catch (error) {
    console.error('Error seeding tickets:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedTickets();