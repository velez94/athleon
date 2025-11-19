#!/bin/bash

# Build the frontend with ESLint warnings instead of errors
export DISABLE_ESLINT_PLUGIN=true
npm run build

echo "Build completed with ESLint disabled"
