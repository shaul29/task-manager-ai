/**
 * AWS Cognito Authentication Service
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
};

const userPool = new CognitoUserPool(poolData);

/**
 * Sign up a new user
 */
export const signUp = (email, password) => {
  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, [], null, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result.user);
    });
  });
};

/**
 * Sign in a user
 */
export const signIn = (email, password) => {
  return new Promise((resolve, reject) => {
    const authenticationData = {
      Username: email,
      Password: password,
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    const userData = {
      Username: email,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const accessToken = result.getAccessToken().getJwtToken();
        const idToken = result.getIdToken().getJwtToken();
        const refreshToken = result.getRefreshToken().getToken();

        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('idToken', idToken);
        localStorage.setItem('refreshToken', refreshToken);

        resolve({
          accessToken,
          idToken,
          refreshToken,
        });
      },
      onFailure: (err) => {
        // Handle specific error cases
        if (err.code === 'UserNotConfirmedException') {
          reject(new Error('Your account is not confirmed. Please contact support or try signing up again.'));
        } else if (err.code === 'NotAuthorizedException') {
          reject(new Error('Incorrect username or password.'));
        } else if (err.code === 'UserNotFoundException') {
          reject(new Error('User not found. Please sign up first.'));
        } else {
          reject(err);
        }
      },
    });
  });
};

/**
 * Sign out current user
 */
export const signOut = () => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user found'));
      return;
    }

    cognitoUser.getSession((err, session) => {
      if (err) {
        reject(err);
        return;
      }

      if (!session.isValid()) {
        reject(new Error('Session is invalid'));
        return;
      }

      cognitoUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
          return;
        }

        const userData = {};
        attributes.forEach((attr) => {
          userData[attr.Name] = attr.Value;
        });

        resolve({
          username: cognitoUser.getUsername(),
          attributes: userData,
          session,
        });
      });
    });
  });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const accessToken = localStorage.getItem('accessToken');
  return !!accessToken;
};

export { userPool };
