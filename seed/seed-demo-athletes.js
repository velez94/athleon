#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment variables
const TABLES = {
  ATHLETES: process.env.ATHLETES_TABLE,
  ATHLETE_EVENTS: process.env.ATHLETE_EVENTS_TABLE || 'Athleon-development-AthletesAthleteEventsTable1485A78C-M3ZVGERDEKES',
  EVENTS: process.env.EVENTS_TABLE
};

async function seedDemoAthletes() {
  console.log('🏃 Creating demo athletes...\n');

  try {
    // Get the demo event ID
    const eventsResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.EVENTS,
      FilterExpression: 'contains(#name, :demo)',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':demo': 'Demo' }
    }));

    const demoEvent = eventsResponse.Items?.[0];
    if (!demoEvent) {
      console.log('❌ No demo event found. Run seed-complete-data.js first.');
      return;
    }

    console.log(`📅 Found demo event: ${demoEvent.eventId}`);

    // Create demo athletes
    const athletes = [
      {
        userId: 'athlete1@test.com',
        firstName: 'John',
        lastName: 'Doe',
        email: 'athlete1@test.com',
        dateOfBirth: '1990-05-15',
        gender: 'Male',
        country: 'USA',
        categoryId: 'rx-male',
        createdAt: new Date().toISOString()
      },
      {
        userId: 'athlete2@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'athlete2@test.com',
        dateOfBirth: '1992-08-22',
        gender: 'Female',
        country: 'USA',
        categoryId: 'rx-female',
        createdAt: new Date().toISOString()
      },
      {
        userId: 'athlete3@test.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'athlete3@test.com',
        dateOfBirth: '1988-12-10',
        gender: 'Male',
        country: 'Canada',
        categoryId: 'rx-male',
        createdAt: new Date().toISOString()
      }
    ];

    console.log('👥 Creating athlete profiles...');
    for (const athlete of athletes) {
      await ddb.send(new PutCommand({
        TableName: TABLES.ATHLETES,
        Item: athlete
      }));
    }
    console.log('✅ Created 3 athlete profiles');

    // Register athletes for demo event
    console.log('📝 Registering athletes for demo event...');
    const registrations = [
      {
        userId: 'athlete1@test.com',
        eventId: demoEvent.eventId,
        categoryId: 'rx-male',
        registeredAt: new Date().toISOString(),
        status: 'registered'
      },
      {
        userId: 'athlete2@test.com',
        eventId: demoEvent.eventId,
        categoryId: 'rx-female',
        registeredAt: new Date().toISOString(),
        status: 'registered'
      },
      {
        userId: 'athlete3@test.com',
        eventId: demoEvent.eventId,
        categoryId: 'rx-male',
        registeredAt: new Date().toISOString(),
        status: 'registered'
      }
    ];

    for (const registration of registrations) {
      await ddb.send(new PutCommand({
        TableName: TABLES.ATHLETE_EVENTS,
        Item: registration
      }));
    }
    console.log('✅ Registered 3 athletes for demo event');

    console.log('\n✨ Demo athletes created and registered successfully!');
    console.log('👥 Athletes: John Doe, Jane Smith, Mike Johnson');
    console.log(`📅 Event: ${demoEvent.name}`);
    console.log('🌐 Frontend: https://dev.athleon.fitness');

  } catch (error) {
    console.error('❌ Error creating demo athletes:', error.message);
    process.exit(1);
  }
}

seedDemoAthletes();
