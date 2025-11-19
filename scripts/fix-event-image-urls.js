#!/usr/bin/env node

/**
 * Fix event image URLs to use CloudFront instead of S3 direct URLs
 * Usage: AWS_PROFILE=labvel-dev node scripts/fix-event-image-urls.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const EVENTS_TABLE = 'Athleon-development-CompetitionsEventsTable5FF68F4B-1KYM40V6NU4IB';
const CLOUDFRONT_DOMAIN = 'https://dev.athleon.fitness';
const S3_BUCKET = 'athleon-event-images-development';

const client = new DynamoDBClient({ region: 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);

async function fixImageUrls() {
  console.log('Scanning events table for S3 image URLs...\n');
  
  try {
    // Scan for all events
    const scanResult = await docClient.send(new ScanCommand({
      TableName: EVENTS_TABLE,
    }));
    
    const events = scanResult.Items || [];
    console.log(`Found ${events.length} events\n`);
    
    let updatedCount = 0;
    
    for (const event of events) {
      if (event.imageUrl && event.imageUrl.includes(S3_BUCKET)) {
        console.log(`Event: ${event.eventId} (${event.name})`);
        console.log(`  Old URL: ${event.imageUrl}`);
        
        // Extract the key from S3 URL
        // Format: https://athleon-event-images-development.s3.amazonaws.com/events/demo-event/filename.png
        const match = event.imageUrl.match(/amazonaws\.com\/(.+)$/);
        if (match) {
          const key = match[1];
          const newUrl = `${CLOUDFRONT_DOMAIN}/images/${key}`;
          
          console.log(`  New URL: ${newUrl}`);
          
          // Update the event
          await docClient.send(new UpdateCommand({
            TableName: EVENTS_TABLE,
            Key: { eventId: event.eventId },
            UpdateExpression: 'SET imageUrl = :imageUrl, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':imageUrl': newUrl,
              ':updatedAt': new Date().toISOString(),
            },
          }));
          
          console.log(`  ✅ Updated\n`);
          updatedCount++;
        } else {
          console.log(`  ⚠️  Could not parse S3 URL\n`);
        }
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} event(s)`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixImageUrls();
