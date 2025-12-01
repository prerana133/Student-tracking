#!/bin/bash
# build.sh - Build script for Render deployment

# Update pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

python manage.py create_or_get_superuser

# Collect static files
python manage.py collectstatic --noinput
