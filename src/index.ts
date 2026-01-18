import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('run', async (req) => {
  console.log('Request:', req);

  return {
    title: 'FeatBit for Jira',
    message: 'Welcome to FeatBit integration!',
  };
});

// Update feature flags for a Jira issue
resolver.define('updateFeatureFlags', async (req) => {
  const { issueKey, featureFlags } = req.payload;

  try {
    // Get the issue
    const issueResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
    const issue = await issueResponse.json();

    // Update issue properties with feature flags
    const propertyKey = 'featbit-feature-flags';
    await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/properties/${propertyKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(featureFlags),
    });

    return {
      success: true,
      issueKey,
      featureFlags,
    };
  } catch (error) {
    console.error('Error updating feature flags:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Get feature flags for a Jira issue
resolver.define('getFeatureFlags', async (req) => {
  const { issueKey } = req.payload;

  try {
    const propertyKey = 'featbit-feature-flags';
    const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/properties/${propertyKey}`);
    const data = await response.json();

    return {
      success: true,
      issueKey,
      featureFlags: data.value,
    };
  } catch (error) {
    console.error('Error getting feature flags:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

export const handler = resolver.getDefinitions();
