#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

const ddbClient = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-2' });

const TABLES = {
  ATHLETES: process.env.ATHLETES_TABLE,
  ATHLETE_EVENTS: process.env.ATHLETE_EVENTS_TABLE || 'Athleon-development-AthletesAthleteEventsTable1485A78C-M3ZVGERDEKES',
  EVENTS: process.env.EVENTS_TABLE
};

const USER_POOL_ID = process.env.USER_POOL_ID;
const PASSWORD = 'Athlete123!';

const athletes = [
  // Men (10)
  { email: 'john.doe@test.com', firstName: 'John', lastName: 'Doe', alias: 'JDoe', age: 28, gender: 'Male', country: 'USA', categoryId: 'men-elite' },
  { email: 'mike.smith@test.com', firstName: 'Mike', lastName: 'Smith', alias: 'MikeS', age: 32, gender: 'Male', country: 'Canada', categoryId: 'men-professional' },
  { email: 'alex.johnson@test.com', firstName: 'Alex', lastName: 'Johnson', alias: 'AJ', age: 26, gender: 'Male', country: 'UK', categoryId: 'men-advanced' },
  { email: 'chris.brown@test.com', firstName: 'Chris', lastName: 'Brown', alias: 'CBrown', age: 30, gender: 'Male', country: 'Australia', categoryId: 'men-elite' },
  { email: 'david.wilson@test.com', firstName: 'David', lastName: 'Wilson', alias: 'DWilson', age: 24, gender: 'Male', country: 'USA', categoryId: 'men-intermediate' },
  { email: 'ryan.garcia@test.com', firstName: 'Ryan', lastName: 'Garcia', alias: 'RGarcia', age: 27, gender: 'Male', country: 'Spain', categoryId: 'men-advanced' },
  { email: 'james.miller@test.com', firstName: 'James', lastName: 'Miller', alias: 'JMiller', age: 31, gender: 'Male', country: 'Germany', categoryId: 'men-professional' },
  { email: 'kevin.davis@test.com', firstName: 'Kevin', lastName: 'Davis', alias: 'KDavis', age: 29, gender: 'Male', country: 'France', categoryId: 'men-elite' },
  { email: 'tyler.martinez@test.com', firstName: 'Tyler', lastName: 'Martinez', alias: 'TMartinez', age: 23, gender: 'Male', country: 'Mexico', categoryId: 'men-intermediate' },
  { email: 'brandon.lopez@test.com', firstName: 'Brandon', lastName: 'Lopez', alias: 'BLopez', age: 25, gender: 'Male', country: 'Brazil', categoryId: 'men-advanced' },
  
  // Women (10)
  { email: 'sarah.jones@test.com', firstName: 'Sarah', lastName: 'Jones', alias: 'SJones', age: 27, gender: 'Female', country: 'USA', categoryId: 'women-elite' },
  { email: 'emma.williams@test.com', firstName: 'Emma', lastName: 'Williams', alias: 'EmmaW', age: 30, gender: 'Female', country: 'Canada', categoryId: 'women-professional' },
  { email: 'olivia.taylor@test.com', firstName: 'Olivia', lastName: 'Taylor', alias: 'OTaylor', age: 25, gender: 'Female', country: 'UK', categoryId: 'women-advanced' },
  { email: 'sophia.anderson@test.com', firstName: 'Sophia', lastName: 'Anderson', alias: 'SophiaA', age: 28, gender: 'Female', country: 'Australia', categoryId: 'women-elite' },
  { email: 'isabella.thomas@test.com', firstName: 'Isabella', lastName: 'Thomas', alias: 'IsabellaT', age: 22, gender: 'Female', country: 'USA', categoryId: 'women-intermediate' },
  { email: 'mia.jackson@test.com', firstName: 'Mia', lastName: 'Jackson', alias: 'MiaJ', age: 26, gender: 'Female', country: 'Spain', categoryId: 'women-advanced' },
  { email: 'charlotte.white@test.com', firstName: 'Charlotte', lastName: 'White', alias: 'CharlotteW', age: 31, gender: 'Female', country: 'Germany', categoryId: 'women-professional' },
  { email: 'amelia.harris@test.com', firstName: 'Amelia', lastName: 'Harris', alias: 'AmeliaH', age: 29, gender: 'Female', country: 'France', categoryId: 'women-elite' },
  { email: 'harper.martin@test.com', firstName: 'Harper', lastName: 'Martin', alias: 'HarperM', age: 23, gender: 'Female', country: 'Mexico', categoryId: 'women-intermediate' },
  { email: 'evelyn.garcia@test.com', firstName: 'Evelyn', lastName: 'Garcia', alias: 'EvelynG', age: 24, gender: 'Female', country: 'Brazil', categoryId: 'women-advanced' }
];

async function createCognitoUser(athlete) {
  try {
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: athlete.email,
      UserAttributes: [
        { Name: 'email', Value: athlete.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: athlete.firstName },
        { Name: 'family_name', Value: athlete.lastName }
      ],
      TemporaryPassword: 'TempPass123!',
      MessageAction: 'SUPPRESS'
    }));

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: athlete.email,
      Password: PASSWORD,
      Permanent: true
    }));

    return true;
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log(`⚠️  User already exists: ${athlete.email}`);
      return true;
    }
    console.error(`❌ Error creating ${athlete.email}:`, error.message);
    return false;
  }
}

async function seed20Athletes() {
  console.log('🏃 Creating 20 athletes (10 men, 10 women)...\n');

  try {
    // Get demo event
    const eventsResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.EVENTS,
      FilterExpression: 'contains(#name, :demo)',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':demo': 'Demo' }
    }));

    const demoEvent = eventsResponse.Items?.[0];
    if (!demoEvent) {
      console.log('❌ No demo event found.');
      return;
    }

    console.log(`📅 Found demo event: ${demoEvent.name}`);

    // Create Cognito users
    console.log('👥 Creating Cognito users...');
    let cognitoSuccess = 0;
    for (const athlete of athletes) {
      const success = await createCognitoUser(athlete);
      if (success) cognitoSuccess++;
    }
    console.log(`✅ Created ${cognitoSuccess}/20 Cognito users`);

    // Create athlete profiles
    console.log('📝 Creating athlete profiles...');
    for (const athlete of athletes) {
      const profile = {
        userId: athlete.email,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        alias: athlete.alias,
        age: athlete.age,
        email: athlete.email,
        dateOfBirth: '1990-01-01',
        gender: athlete.gender,
        country: athlete.country,
        categoryId: athlete.categoryId,
        createdAt: new Date().toISOString()
      };

      await ddb.send(new PutCommand({
        TableName: TABLES.ATHLETES,
        Item: profile
      }));
    }
    console.log('✅ Created 20 athlete profiles');

    // Register for demo event
    console.log('📋 Registering athletes for demo event...');
    for (const athlete of athletes) {
      const registration = {
        userId: athlete.email,
        eventId: demoEvent.eventId,
        categoryId: athlete.categoryId,
        registeredAt: new Date().toISOString(),
        status: 'registered'
      };

      await ddb.send(new PutCommand({
        TableName: TABLES.ATHLETE_EVENTS,
        Item: registration
      }));
    }
    console.log('✅ Registered 20 athletes for demo event');

    console.log('\n✨ 20 athletes created successfully!');
    console.log('👨 Men: 10 athletes');
    console.log('👩 Women: 10 athletes');
    console.log(`🔑 Password for all: ${PASSWORD}`);
    console.log('🌐 Frontend: https://dev.athleon.fitness');

  } catch (error) {
    console.error('❌ Error creating athletes:', error.message);
    process.exit(1);
  }
}

seed20Athletes();
