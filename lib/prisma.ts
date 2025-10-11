import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client configuration for production
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL
  
  // Add connection pooling parameters if not already present
  const urlWithPooling = databaseUrl?.includes('?') 
    ? `${databaseUrl}&connection_limit=20&pool_timeout=20`
    : `${databaseUrl}?connection_limit=20&pool_timeout=20`

  return new PrismaClient({
    log: ['error', 'warn'], // Only log errors and warnings, no queries
    datasources: {
      db: {
        url: urlWithPooling,
      },
    },
    // Additional configuration for production stability
    ...(process.env.NODE_ENV === 'production' && {
      // Disable query engine logging in production
      log: ['error'],
      // Add error formatting
      errorFormat: 'minimal',
    }),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
