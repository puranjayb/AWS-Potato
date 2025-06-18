import { Amplify } from 'aws-amplify';

const cognitoConfig = {
  Auth: {
    Cognito: {
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'your-user-pool-id',
      userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 'your-user-pool-web-client-id',
    }
  }
};

Amplify.configure(cognitoConfig);