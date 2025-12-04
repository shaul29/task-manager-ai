#!/bin/bash

# Task Manager Frontend Deployment Script
# Builds and deploys React app to S3 + CloudFront

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Task Manager Frontend Deployment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Load environment variables
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo -e "${YELLOW}Please create it from .env.production.example${NC}"
    exit 1
fi

source .env.production

# Check required variables
if [ -z "$S3_BUCKET" ] || [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Please set S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID in .env.production"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}🔐 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✅ AWS credentials verified${NC}\n"

# Navigate to frontend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found at: $FRONTEND_DIR${NC}"
    exit 1
fi

cd "$FRONTEND_DIR"
echo -e "${BLUE}📁 Working directory: $FRONTEND_DIR${NC}\n"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Create production env file
echo -e "${YELLOW}⚙️  Creating production environment...${NC}"
cat > .env.production << EOF
VITE_API_URL=https://api.lulifyinsight.com
EOF
echo -e "${GREEN}✅ Production environment configured${NC}\n"

# Build the application
echo -e "${YELLOW}🔨 Building React application...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build completed${NC}\n"

# Sync to S3
echo -e "${YELLOW}☁️  Uploading to S3 bucket: $S3_BUCKET${NC}"
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.html"

# Upload HTML files with no-cache
echo -e "${YELLOW}📄 Uploading HTML files with no-cache...${NC}"
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --exclude "*" \
    --include "*.html" \
    --cache-control "public, max-age=0, must-revalidate"

echo -e "${GREEN}✅ Files uploaded to S3${NC}\n"

# Invalidate CloudFront cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}✅ CloudFront invalidation created: $INVALIDATION_ID${NC}\n"

# Wait for invalidation (optional)
read -p "Wait for CloudFront invalidation to complete? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏳ Waiting for invalidation to complete...${NC}"
    aws cloudfront wait invalidation-completed \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --id $INVALIDATION_ID
    echo -e "${GREEN}✅ Invalidation completed${NC}\n"
fi

# Deployment summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${BLUE}🌐 Website URL:${NC} https://task-manager.lulifyinsight.com"
echo -e "${BLUE}📦 S3 Bucket:${NC} s3://$S3_BUCKET"
echo -e "${BLUE}☁️  CloudFront:${NC} $CLOUDFRONT_DISTRIBUTION_ID"
echo -e "${BLUE}🔗 API Endpoint:${NC} https://api.lulifyinsight.com"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test the website: https://task-manager.lulifyinsight.com"
echo "2. Check browser console for any errors"
echo "3. Test API connectivity and authentication"
echo "4. Monitor CloudFront metrics in AWS Console"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "  Redeploy:           ./deploy-frontend.sh"
echo "  Check S3:           aws s3 ls s3://$S3_BUCKET/"
echo "  CloudFront status:  aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID"
