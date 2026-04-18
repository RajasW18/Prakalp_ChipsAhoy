'use strict';

const { PrismaClient } = require('@prisma/client');

/**
 * Singleton Prisma Client instance.
 * Reusing a single instance across the app prevents "max clients reached"
 * errors in database poolers like Supabase.
 */

const prisma = new PrismaClient({
  // Optional: log queries in development
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Tuning for connection pooling
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

module.exports = prisma;
