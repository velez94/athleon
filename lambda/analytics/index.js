const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('/opt/nodejs/utils/logger');
const { getCorsHeaders, checkOrganizationAccess, isSuperAdmin } = require('/opt/nodejs/utils/auth');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE;
const ORGANIZATION_MEMBERS_TABLE = process.env.ORGANIZATION_MEMBERS_TABLE;

exports.handler = async (event) => {
  logger.info('Analytics domain request', { 
    method: event.httpMethod, 
    source: event.source 
  });
  
  const headers = getCorsHeaders(event);

  // Handle EventBridge events (data collection)
  if (event.source) {
    return await handleDomainEvent(event);
  }

  // Handle API requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { sub: userId, email: userEmail } = event.requestContext?.authorizer?.claims || {};
    const organizationId = event.queryStringParameters?.organizationId;

    if (!organizationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'organizationId parameter required' })
      };
    }

    // Super admin can access all organizations
    const isSuper = isSuperAdmin(userEmail);
    
    if (organizationId === 'all') {
      if (!isSuper) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Access denied - super admin required for all organizations' })
        };
      }
      
      // Return all analytics data for super admin (scan all)
      const scanResult = await ddb.send(new ScanCommand({
        TableName: ANALYTICS_TABLE
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          organizationId: 'all',
          metrics: scanResult.Items || [],
          source: 'analytics-domain'
        })
      };
    }

    // Regular organization access
    if (!isSuper) {
      const access = await checkOrganizationAccess(organizationId, userId);
      if (!access.hasAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Access denied - not a member of this organization' })
        };
      }
    }

    // Get analytics for specific organization
    const { Items } = await ddb.send(new QueryCommand({
      TableName: ANALYTICS_TABLE,
      KeyConditionExpression: 'organizationId = :orgId',
      ExpressionAttributeValues: { ':orgId': organizationId }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        organizationId,
        metrics: Items || [],
        source: 'analytics-domain'
      })
    };

  } catch (error) {
    logger.error('Analytics error', { error: error.message });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

// Event-driven data collection
async function handleDomainEvent(event) {
  try {
    logger.info('Processing domain event', { 
      source: event.source, 
      detailType: event['detail-type'] 
    });

    const { organizationId, eventId, athleteId } = event.detail;
    const metricId = `${event.source}-${Date.now()}`;

    // Store analytics data in own table
    await ddb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        organizationId,
        metricId,
        eventType: event['detail-type'],
        source: event.source,
        data: event.detail,
        timestamp: new Date().toISOString()
      }
    }));

    logger.info('Analytics data stored', { organizationId, metricId });
    return { statusCode: 200 };

  } catch (error) {
    logger.error('Event processing error', { error: error.message });
    return { statusCode: 500 };
  }
}
