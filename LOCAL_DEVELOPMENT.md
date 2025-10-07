# Local Development Setup

This guide helps you set up PostgreSQL locally using Docker for NewsCast Debate development.

## Quick Start

### 1. Setup Local Development Environment

```bash
# Run the setup script (creates .env.local and starts PostgreSQL)
npm run db:setup
```

### 2. Run Database Migrations

```bash
# Generate Prisma client and run migrations
npm run db:migrate
```

### 3. Start Development Server

```bash
# Start the Next.js development server
npm run dev
```

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Complete setup (creates .env.local + starts PostgreSQL) |
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL container |
| `npm run db:logs` | View PostgreSQL logs |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:reset` | Reset database (⚠️ deletes all data) |

## Database Connection Details

- **Host:** localhost
- **Port:** 5432
- **Database:** newscast_debate
- **Username:** postgres
- **Password:** postgres123
- **Connection String:** `postgresql://postgres:postgres123@localhost:5432/newscast_debate?sslmode=disable`

## Environment Variables

The setup script creates `.env.local` with local development settings:

- `DATABASE_URL` - Points to local PostgreSQL
- `BATTLE_DURATION_HOURS=0.05` - 3 minutes for faster testing
- `NEWS_SOURCE=serper` - Uses Serper API by default

## Troubleshooting

### PostgreSQL Won't Start
```bash
# Check Docker is running
docker info

# View container logs
npm run db:logs

# Restart container
npm run db:stop
npm run db:start
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Test connection
psql postgresql://postgres:postgres123@localhost:5432/newscast_debate
```

### Reset Everything
```bash
# Stop and remove containers/volumes
docker-compose down -v

# Restart setup
npm run db:setup
npm run db:migrate
```

## Production vs Local

| Environment | Database | Duration | Purpose |
|-------------|----------|----------|---------|
| **Local** | PostgreSQL (Docker) | 3 minutes | Development & Testing |
| **Production** | Neon PostgreSQL | 4 hours | Live Application |

## Prisma Studio

Access the database GUI at: http://localhost:5555

```bash
npm run db:studio
```

This provides a visual interface to view and edit your database data.
