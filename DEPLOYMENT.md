# Pet Shop Billing System - Deployment Guide

## Deployment on Render

This application is configured for deployment on Render. Here's how to deploy:

### Prerequisites

- A Render account
- PostgreSQL database (can be created on Render)

### Environment Variables

The following environment variables need to be configured on Render:

- `NODE_ENV`: Set to `production`
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `DEFAULT_ADMIN_USERNAME`: Default admin username (default: admin)
- `DEFAULT_ADMIN_PASSWORD`: Default admin password (default: admin123)

### Deployment Process

1. Connect your GitHub repository to Render
2. Render will automatically detect the `render.yaml` configuration
3. During deployment:
   - Backend dependencies will be installed
   - Frontend will be built and placed in backend's public directory
   - Database migrations will run automatically
   - Default admin user will be created if it doesn't exist

### Default Credentials

After the first deployment, you can log in with:
- Username: `admin` (or as configured in `DEFAULT_ADMIN_USERNAME`)
- Password: `admin123` (or as configured in `DEFAULT_ADMIN_PASSWORD`)

### Security Notes

- The debug and password reset endpoints are disabled in production
- Change the default admin password after first login
- Ensure your `JWT_SECRET` is a strong, unique value

### API Endpoints

- Backend API: `/api/*`
- Frontend: All other routes

The application is now ready for production use!