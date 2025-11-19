#!/bin/bash

# Add API client initialization to files that use client.get/post/put/del
for file in $(grep -l "client\." src/**/*.jsx); do
  if ! grep -q "const client = generateClient()" "$file"; then
    sed -i '/import.*generateClient/a const client = generateClient();' "$file"
  fi
done

echo "Added API client initialization"
