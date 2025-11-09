#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment variables
const TABLES = {
  ORGANIZATIONS: process.env.ORGANIZATIONS_TABLE,
  ORGANIZATION_MEMBERS: process.env.ORGANIZATION_MEMBERS_TABLE,
  ORGANIZATION_EVENTS: process.env.ORGANIZATION_EVENTS_TABLE,
  EVENTS: process.env.EVENTS_TABLE,
  CATEGORIES: process.env.CATEGORIES_TABLE,
  WODS: process.env.WODS_TABLE
};

async function seedCompleteData() {
  console.log('🌱 Seeding complete Athleon data...\n');

  try {
    // 1. Create demo organization
    const orgId = 'org-' + Date.now();
    console.log('📋 Creating demo organization...');
    await ddb.send(new PutCommand({
      TableName: TABLES.ORGANIZATIONS,
      Item: {
        organizationId: orgId,
        name: 'Demo Athleon CC',
        description: 'Demo organization for testing Athleon platform',
        createdAt: new Date().toISOString(),
        createdBy: 'admin@athleon.fitness'
      }
    }));
    console.log(`✅ Created organization: ${orgId}`);

    // 2. Add super admin as owner
    console.log('👤 Adding super admin as owner...');
    await ddb.send(new PutCommand({
      TableName: TABLES.ORGANIZATION_MEMBERS,
      Item: {
        organizationId: orgId,
        userId: 'admin@athleon.fitness',
        role: 'owner',
        joinedAt: new Date().toISOString(),
        invitedBy: 'system'
      }
    }));

    // 3. Create demo event
    const eventId = 'evt-' + Date.now();
    console.log('📅 Creating demo event...');
    await ddb.send(new PutCommand({
      TableName: TABLES.EVENTS,
      Item: {
        eventId: eventId,
        name: 'Demo Competition 2025',
        description: 'Complete demo competition with all features',
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

    // 4. Link event to organization
    console.log('🔗 Linking event to organization...');
    await ddb.send(new PutCommand({
      TableName: TABLES.ORGANIZATION_EVENTS,
      Item: {
        organizationId: orgId,
        eventId: eventId,
        createdAt: new Date().toISOString(),
        createdBy: 'admin@athleon.fitness'
      }
    }));

    // 5. Create event categories
    console.log('📊 Creating event categories...');
    const eventCategories = [
      {
        eventId: eventId,
        categoryId: 'rx-male',
        name: 'RX Male',
        description: 'Elite male division',
        minAge: 18,
        maxAge: 100,
        gender: 'Male'
      },
      {
        eventId: eventId,
        categoryId: 'rx-female',
        name: 'RX Female',
        description: 'Elite female division',
        minAge: 18,
        maxAge: 100,
        gender: 'Female'
      }
    ];

    for (const category of eventCategories) {
      await ddb.send(new PutCommand({
        TableName: TABLES.CATEGORIES,
        Item: category
      }));
    }
    console.log('✅ Created 2 event categories');

    // 6. Create template WODs
    console.log('💪 Creating template WODs...');
    const templateWods = [
      {
        eventId: 'template',
        wodId: 'template-fran',
        name: 'Fran',
        description: '21-15-9 Thrusters (95/65) and Pull-ups',
        format: 'time',
        timeLimit: '5:00',
        movements: [
          { exercise: 'Thrusters', reps: '21-15-9', weight: '95/65 lbs' },
          { exercise: 'Pull-ups', reps: '21-15-9', weight: 'Bodyweight' }
        ],
        isShared: false,
        isTransversal: false
      },
      {
        eventId: 'template',
        wodId: 'template-grace',
        name: 'Grace',
        description: '30 Clean and Jerks for time',
        format: 'time',
        timeLimit: '3:00',
        movements: [
          { exercise: 'Clean and Jerk', reps: '30', weight: '135/95 lbs' }
        ],
        isShared: false,
        isTransversal: false
      }
    ];

    for (const wod of templateWods) {
      await ddb.send(new PutCommand({
        TableName: TABLES.WODS,
        Item: wod
      }));
    }
    console.log('✅ Created 2 template WODs');

    // 7. Create event-specific WODs
    console.log('🏋️ Creating event WODs...');
    const eventWods = [
      {
        eventId: eventId,
        wodId: 'event-wod-1',
        name: 'Demo WOD 1',
        description: 'AMRAP 12 minutes',
        format: 'amrap',
        timeLimit: '12:00',
        movements: [
          { exercise: 'Burpees', reps: '5', weight: '' },
          { exercise: 'Pull-ups', reps: '10', weight: '' },
          { exercise: 'Push-ups', reps: '15', weight: '' }
        ],
        organizationId: orgId,
        isShared: false,
        isTransversal: false
      }
    ];

    for (const wod of eventWods) {
      await ddb.send(new PutCommand({
        TableName: TABLES.WODS,
        Item: wod
      }));
    }
    console.log('✅ Created 1 event WOD');

    console.log('\n✨ Complete demo data created successfully!');
    console.log(`📋 Organization: ${orgId}`);
    console.log(`📅 Event: ${eventId}`);
    console.log('🌐 Frontend: https://dev.athleon.fitness');
    console.log('🔑 Login: admin@athleon.fitness / SuperAdmin123!');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

seedCompleteData();
