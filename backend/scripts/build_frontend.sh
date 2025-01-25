#!/bin/bash

# Check that the current directory is the backend directory
if [ ! -f "main.py" ]; then
    echo "Please run this script from the backend directory"
    exit 1
fi

# CD into the frontend directory
cd ../frontend
 
# Install the dependencies
npm install

# Build the frontend
npm run build

# Copy the built frontend to the backend directory
cp -r dist ../backend

# CD back into the backend directory
cd ../backend

# Print a success message
echo "Frontend built successfully"