const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  const { httpMethod, queryStringParameters } = event;
  
  console.log('Public categories request:', { httpMethod, queryStringParameters });

  try {
    // Handle preflight OPTIONS
    if (httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // GET /public/categories?eventId={eventId}
    if (httpMethod === 'GET') {
      const eventId = queryStringParameters?.eventId;
      
      if (!eventId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'eventId query parameter is required' })
        };
      }

      console.log('Querying categories for eventId:', eventId);
      
      const { Items } = await dynamodb.send(new QueryCommand({
        TableName: CATEGORIES_TABLE,
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: {
          ':eventId': eventId
        }
      }));

      console.log('Found categories:', Items?.length || 0);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(Items || [])
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
