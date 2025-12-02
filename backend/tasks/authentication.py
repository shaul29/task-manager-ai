"""
AWS Cognito Authentication for Django REST Framework
"""

import boto3
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import User
import logging

logger = logging.getLogger(__name__)


class CognitoAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class for AWS Cognito
    """

    def authenticate(self, request):
        """
        Authenticate user using Cognito access token
        Supports both Authorization header and query parameter (for SSE)
        """
        # Try Authorization header first
        auth_header = request.headers.get('Authorization')
        token = None

        if auth_header:
            try:
                # Extract token from "Bearer <token>"
                parts = auth_header.split()
                if parts[0].lower() == 'bearer' and len(parts) == 2:
                    token = parts[1]
            except Exception:
                pass

        # Fallback to query parameter (for EventSource which doesn't support headers)
        if not token:
            token = request.GET.get('token')

        if not token:
            return None

        try:
            # Verify token with Cognito
            user = self.verify_token(token)
            return (user, None)

        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')

    def verify_token(self, token):
        """
        Verify access token with AWS Cognito and get/create user
        """
        if not settings.COGNITO_USER_POOL_ID or not settings.COGNITO_REGION:
            # For development without Cognito, create a test user
            logger.warning("Cognito not configured. Using test authentication.")
            user, _ = User.objects.get_or_create(
                email='test@example.com',
                defaults={'username': 'testuser'}
            )
            return user

        try:
            # Initialize Cognito client
            client = boto3.client(
                'cognito-idp',
                region_name=settings.COGNITO_REGION
            )

            # Get user info from Cognito
            response = client.get_user(AccessToken=token)

            # Extract user attributes
            cognito_id = response['Username']
            attributes = {
                attr['Name']: attr['Value']
                for attr in response['UserAttributes']
            }
            email = attributes.get('email', '')

            # Get or create user
            user, created = User.objects.get_or_create(
                cognito_id=cognito_id,
                defaults={
                    'email': email,
                    'username': email.split('@')[0]  # Use email prefix as username
                }
            )

            if created:
                logger.info(f"Created new user: {email}")

            return user

        except client.exceptions.NotAuthorizedException:
            raise exceptions.AuthenticationFailed('Token is invalid or expired')
        except Exception as e:
            logger.error(f"Cognito verification failed: {str(e)}")
            raise exceptions.AuthenticationFailed(f'Could not verify token: {str(e)}')


class OptionalCognitoAuthentication(CognitoAuthentication):
    """
    Optional authentication - doesn't fail if no auth header is provided
    Useful for endpoints that work with or without authentication
    """

    def authenticate(self, request):
        """
        Return None if no auth header, otherwise authenticate
        """
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        return super().authenticate(request)
