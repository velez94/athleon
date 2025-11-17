// Helper functions for authenticated API calls with Amplify v6
import { get as amplifyGet, post as amplifyPost, put as amplifyPut, del as amplifyDel } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_NAME = 'CalisthenicsAPI';

// Get auth token for API requests
const getAuthHeaders = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      return {
        Authorization: `Bearer ${token}`
      };
    }
  } catch (error) {
    console.warn('No auth session available:', error);
  }
  return {};
};

export const get = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyGet({
    apiName: API_NAME,
    path,
    options: {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  const { body } = await restOperation.response;
  // Parse the ReadableStream body as JSON
  const data = await body.json();
  return data;
};

export const post = async (path, data, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyPost({
    apiName: API_NAME,
    path,
    options: {
      ...options,
      body: data,
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  const { body } = await restOperation.response;
  // Parse the ReadableStream body as JSON
  const responseData = await body.json();
  return responseData;
};

export const put = async (path, data, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyPut({
    apiName: API_NAME,
    path,
    options: {
      ...options,
      body: data,
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  const { body } = await restOperation.response;
  // Parse the ReadableStream body as JSON
  const responseData = await body.json();
  return responseData;
};

export const del = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyDel({
    apiName: API_NAME,
    path,
    options: {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  await restOperation.response;
};
