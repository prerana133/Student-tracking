# Email Configuration Guide

## SMTP Email Setup for Invitations

The application sends invitation emails when admins or teachers invite users. Follow these steps to configure email:

### 1. Gmail Setup (Recommended for Development)

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Student Tracking" as the name
   - Copy the generated 16-character password

### 2. Update Settings

Edit `backend/backend/settings.py` and update these values:

```python
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'  # Your Gmail address
EMAIL_HOST_PASSWORD = 'your-app-password'  # The 16-character app password
DEFAULT_FROM_EMAIL = 'your-email@gmail.com'
```

### 3. Other Email Providers

#### Outlook/Office 365
```python
EMAIL_HOST = 'smtp.office365.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@outlook.com'
EMAIL_HOST_PASSWORD = 'your-password'
```

#### SendGrid
```python
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = 'your-sendgrid-api-key'
```

#### Custom SMTP
```python
EMAIL_HOST = 'smtp.yourdomain.com'
EMAIL_PORT = 587  # or 465 for SSL
EMAIL_USE_TLS = True  # or EMAIL_USE_SSL = True for port 465
EMAIL_HOST_USER = 'your-email@yourdomain.com'
EMAIL_HOST_PASSWORD = 'your-password'
```

### 4. Testing Email Configuration

You can test the email configuration by creating an invitation through the API or admin panel.

### 5. Environment Variables (Recommended for Production)

For production, use environment variables instead of hardcoding credentials:

```python
import os

EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
```

Then set these in your environment or `.env` file.

### 6. Frontend URL

Make sure to update the `FRONTEND_URL` in settings.py to match your frontend URL:

```python
FRONTEND_URL = 'http://localhost:4200'  # Development
# or
FRONTEND_URL = 'https://yourdomain.com'  # Production
```

### Troubleshooting

- **"Authentication failed"**: Check your email and password/app password
- **"Connection refused"**: Check firewall settings and SMTP port
- **"Timeout"**: Verify EMAIL_HOST and EMAIL_PORT are correct
- **Emails not sending**: Check Django logs for error messages

