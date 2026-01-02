# Ticket Management System

A RESTful ticket management system built with Node.js, Express, and MongoDB.

Designed for the Dirigo Union, supporter's group of the Hearts of Pine.

## Features

- Firebase Auth and devmode skip auth option for local development
- Create, read, update, and delete tickets
- Match with other ticket requests, exchange tickets with other users (mutual consent based)
- Allow trading of tickets for other tickets
- Scoring of accuracy of a match
- Ability to match with a ticket buy/sale without creating a request
- Admin feature support
- RESTful API architecture
- MongoDB database integration

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your MongoDB connection string

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Project Structure

```
ticket-management-system/
├── src/
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── models/       # Mongoose models
│   └── routes/       # Express routes
├── server.js         # Application entry point
├── package.json
└── .env.example
```

## Ticket/Exchange Match Workflow:
  State mapping:
  | Action      | Ticket A  | Ticket B  | Match     |
  |-------------|-----------|-----------|-----------|
  | Start       | open      | open      | —         |
  | A initiates | matched   | matched   | initiated |
  | B accepts   | matched   | matched   | accepted  |
  | Complete    | completed | completed | completed |

## License

ISC
