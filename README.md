# Ticket Management System

A RESTful ticket management system built with Node.js, Express, and MongoDB.

## Features

- Create, read, update, and delete tickets
- RESTful API architecture
- MongoDB database integration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB

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

## Tikcet/Exchange Match Workflow:
  State mapping:
  | Action      | Ticket A  | Ticket B  | Match     |
  |-------------|-----------|-----------|-----------|
  | Start       | open      | open      | —         |
  | A initiates | pending   | pending   | initiated |
  | B accepts   | matched   | matched   | accepted  |
  | Complete    | completed | completed | completed |

## License

ISC
