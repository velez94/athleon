#!/usr/bin/env node

/**
 * Athleon - Seed Current Data Script
 * 
 * Seeds the database with current production-like data for development and testing.
 * 
 * Note: Table names below are from the old Athleon deployment.
 * When redeployed with Athleon stack name, these will change to Athleon-* prefixes.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment or use current deployment names
const TABLES = {
  ORGANIZATIONS: 'Athleon-development-OrganizationsOrganizationsTableECC8F9CE-J35ALRAB5IO6',
  ORGANIZATION_MEMBERS: 'Athleon-development-OrganizationsOrganizationMembersTable46313781-QUHZA4F6TI61',
  ORGANIZATION_EVENTS: 'Athleon-development-OrganizationsOrganizationEventsTable7597D5EB-1XX00AKSXEU0J',
  EVENTS: 'Athleon-development-CompetitionsEventsTable5FF68F4B-1KYM40V6NU4IB',
  ATHLETES: 'Athleon-development-AthletesAthletesTable83BA454D-2AJSCGKR07IB',
  CATEGORIES: 'Athleon-development-CategoriesCategoriesTable6441F570-LT9OMJZDY1ZG',
  WODS: 'Athleon-development-WodsWodsTableC84CB78B-ZVG9JE0QE3CK',
  EXERCISES: 'Athleon-development-ScoringExerciseLibraryTable4BA87342-XHHEA1QX03IF'
};

async function seedData() {
  console.log('🌱 Seeding Athleon data...\n');

  try {
    // 1. Check if demo organization exists
    const orgId = 'demo-org';
    console.log('📋 Checking for existing organization...');
    
    let orgExists = false;
    try {
      const existingOrgs = await ddb.send(new ScanCommand({
        TableName: TABLES.ORGANIZATIONS,
        FilterExpression: 'organizationId = :orgId',
        ExpressionAttributeValues: { ':orgId': orgId }
      }));
      orgExists = existingOrgs.Items && existingOrgs.Items.length > 0;
    } catch (e) {
      // Table might not exist yet
    }

    if (!orgExists) {
      console.log('📋 Creating demo organization...');
      await ddb.send(new PutCommand({
        TableName: TABLES.ORGANIZATIONS,
        Item: {
          organizationId: orgId,
          name: 'Demo Athleon CC',
          description: 'Demo organization for testing',
          createdAt: new Date().toISOString(),
          createdBy: 'admin@athleon.fitness'
        }
      }));
    } else {
      console.log('✅ Demo organization already exists');
    }

    // 2. Check if super admin is already a member
    console.log('👤 Checking super admin membership...');
    let memberExists = false;
    try {
      const existingMembers = await ddb.send(new ScanCommand({
        TableName: TABLES.ORGANIZATION_MEMBERS,
        FilterExpression: 'organizationId = :orgId AND userId = :userId',
        ExpressionAttributeValues: { 
          ':orgId': orgId,
          ':userId': 'admin@athleon.fitness'
        }
      }));
      memberExists = existingMembers.Items && existingMembers.Items.length > 0;
    } catch (e) {
      // Table might not exist yet
    }

    if (!memberExists) {
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
    } else {
      console.log('✅ Super admin already a member');
    }

    // 3. Check if demo event exists
    const eventId = 'demo-event';
    console.log('🏆 Checking for existing event...');
    
    let eventExists = false;
    try {
      const existingEvents = await ddb.send(new ScanCommand({
        TableName: TABLES.EVENTS,
        FilterExpression: 'eventId = :eventId',
        ExpressionAttributeValues: { ':eventId': eventId }
      }));
      eventExists = existingEvents.Items && existingEvents.Items.length > 0;
    } catch (e) {
      // Table might not exist yet
    }

    if (!eventExists) {
      console.log('🏆 Creating demo event...');
      await ddb.send(new PutCommand({
        TableName: TABLES.EVENTS,
        Item: {
          eventId: eventId,
          name: 'Demo Competition 2025',
          description: 'Demo competition for testing the platform',
          startDate: '2025-12-01',
          endDate: '2025-12-01',
          location: 'Demo Athleon CC',
          published: true,
          createdAt: new Date().toISOString(),
          createdBy: 'admin@athleon.fitness'
        }
      }));
    } else {
      console.log('✅ Demo event already exists');
    }

    // 4. Check if event is linked to organization
    console.log('🔗 Checking event-organization link...');
    let linkExists = false;
    try {
      const existingLinks = await ddb.send(new ScanCommand({
        TableName: TABLES.ORGANIZATION_EVENTS,
        FilterExpression: 'organizationId = :orgId AND eventId = :eventId',
        ExpressionAttributeValues: { 
          ':orgId': orgId,
          ':eventId': eventId
        }
      }));
      linkExists = existingLinks.Items && existingLinks.Items.length > 0;
    } catch (e) {
      // Table might not exist yet
    }

    if (!linkExists) {
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
    } else {
      console.log('✅ Event already linked to organization');
    }

    // 5. Use global categories (created by seed-categories.js)
    console.log('📊 Using global categories (run seed-categories.js first)...');

    // 6. Create sample WODs (idempotent)
    const wods = [
      {
        wodId: 'wod-fran',
        name: 'Fran',
        description: '21-15-9 Thrusters (95/65) and Pull-ups',
        format: 'time',
        timeCap: 300
      },
      {
        wodId: 'wod-grace',
        name: 'Grace',
        description: '30 Clean and Jerks (135/95) for time',
        format: 'time',
        timeCap: 600
      }
    ];

    console.log('💪 Creating WODs...');
    for (const wod of wods) {
      try {
        const existingWods = await ddb.send(new ScanCommand({
          TableName: TABLES.WODS,
          FilterExpression: 'eventId = :eventId AND wodId = :wodId',
          ExpressionAttributeValues: { 
            ':eventId': eventId,
            ':wodId': wod.wodId
          }
        }));
        
        if (!existingWods.Items || existingWods.Items.length === 0) {
          await ddb.send(new PutCommand({
            TableName: TABLES.WODS,
            Item: {
              eventId: eventId,
              wodId: wod.wodId,
              name: wod.name,
              description: wod.description,
              format: wod.format,
              timeCap: wod.timeCap,
              organizationId: orgId,
              createdAt: new Date().toISOString()
            }
          }));
          console.log(`  ✅ Created WOD: ${wod.name}`);
        } else {
          console.log(`  ⚠️  WOD already exists: ${wod.name}`);
        }
      } catch (e) {
        console.log(`  ❌ Error with WOD ${wod.name}:`, e.message);
      }
    }

    // 7. Create sample exercises (idempotent)
    const exercises = [
      { exerciseId: 'ex-thruster', name: 'Thruster', category: 'strength', baseScore: 2 },
      { exerciseId: 'ex-pullup', name: 'Pull-up', category: 'strength', baseScore: 1 },
      { exerciseId: 'ex-clean-jerk', name: 'Clean and Jerk', category: 'strength', baseScore: 3 }
    ];

    console.log('🏋️ Creating exercises...');
    for (const ex of exercises) {
      try {
        const existingExercises = await ddb.send(new ScanCommand({
          TableName: TABLES.EXERCISES,
          FilterExpression: 'exerciseId = :exerciseId',
          ExpressionAttributeValues: { ':exerciseId': ex.exerciseId }
        }));
        
        if (!existingExercises.Items || existingExercises.Items.length === 0) {
          await ddb.send(new PutCommand({
            TableName: TABLES.EXERCISES,
            Item: {
              exerciseId: ex.exerciseId,
              name: ex.name,
              category: ex.category,
              baseScore: ex.baseScore,
              isGlobal: true,
              createdAt: new Date().toISOString()
            }
          }));
          console.log(`  ✅ Created exercise: ${ex.name}`);
        } else {
          console.log(`  ⚠️  Exercise already exists: ${ex.name}`);
        }
      } catch (e) {
        console.log(`  ❌ Error with exercise ${ex.name}:`, e.message);
      }
    }

    console.log('\n✨ Seed data created successfully!');
    console.log(`📋 Organization ID: ${orgId}`);
    console.log(`🏆 Event ID: ${eventId}`);
    console.log(`🌐 Frontend URL: https://dev.athleon.fitness`);

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

seedData();
