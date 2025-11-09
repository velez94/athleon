#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment variables (set by get-table-names.sh)
const TABLES = {
  EVENTS: process.env.EVENTS_TABLE,
  ATHLETES: process.env.ATHLETES_TABLE,
  CATEGORIES: process.env.CATEGORIES_TABLE,
  USER_POOL_ID: process.env.USER_POOL_ID
};

async function seedData() {
  console.log('🌱 Seeding Athleon data with dynamic table names...\n');

  try {
    // Check if we have the required tables
    if (!TABLES.EVENTS) {
      console.log('❌ Events table not found. Skipping event creation.');
      return;
    }

    // 1. Create demo event
    const eventId = 'evt-' + Date.now();
    console.log('📋 Creating demo event...');
    await ddb.send(new PutCommand({
      TableName: TABLES.EVENTS,
      Item: {
        eventId: eventId,
        name: 'Demo Competition 2025',
        description: 'Demo competition for testing Athleon platform',
        startDate: '2025-12-01',
        endDate: '2025-12-03',
        location: 'Demo Gym, Demo City',
        published: true,
        maxParticipants: 100,
        createdAt: new Date().toISOString(),
        createdBy: 'admin@athleon.fitness'
      }
    }));
    console.log(`✅ Created event: ${eventId}`);

    // 2. Create event-specific categories
    if (TABLES.CATEGORIES) {
      console.log('📊 Creating event categories...');
      const eventCategories = [
        {
          eventId: eventId,
          categoryId: 'rx-male',
          name: 'RX Male',
          description: 'Elite male division',
          minAge: 18,
          maxAge: 100,
          gender: 'Male',
          createdAt: new Date().toISOString()
        },
        {
          eventId: eventId,
          categoryId: 'rx-female',
          name: 'RX Female',
          description: 'Elite female division',
          minAge: 18,
          maxAge: 100,
          gender: 'Female',
          createdAt: new Date().toISOString()
        },
        {
          eventId: eventId,
          categoryId: 'scaled-male',
          name: 'Scaled Male',
          description: 'Intermediate male division',
          minAge: 18,
          maxAge: 100,
          gender: 'Male',
          createdAt: new Date().toISOString()
        },
        {
          eventId: eventId,
          categoryId: 'scaled-female',
          name: 'Scaled Female',
          description: 'Intermediate female division',
          minAge: 18,
          maxAge: 100,
          gender: 'Female',
          createdAt: new Date().toISOString()
        }
      ];

      for (const category of eventCategories) {
        await ddb.send(new PutCommand({
          TableName: TABLES.CATEGORIES,
          Item: category
        }));
      }
      console.log('✅ Created 4 event categories');
    }

    console.log('\n✨ Demo data created successfully!');
    console.log(`📋 Event ID: ${eventId}`);
    console.log('🌐 Frontend: https://dev.athleon.fitness');
    console.log('🔑 Login: admin@athleon.fitness / SuperAdmin123!');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

seedData();
