#!/bin/bash

# Script to replace all client.get/post/put/del calls with new API helper in ALL components

cd "$(dirname "$0")/src"

# Find all .jsx and .js files that contain client.get/post/put/del
files=$(grep -rl "client\\.get\|client\\.post\|client\\.put\|client\\.del" components --include="*.jsx" --include="*.js")

for file in $files; do
  echo "Processing $file..."
  
  # Replace client.get calls - handle template literals
  sed -i "s/await client\.get('CalisthenicsAPI', '\([^']*\)')/await get('\1')/g" "$file"
  sed -i 's/await client\.get("CalisthenicsAPI", "\([^"]*\)")/await get("\1")/g' "$file"
  sed -i 's/await client\.get(`CalisthenicsAPI`, `\([^`]*\)`)/await get(`\1`)/g' "$file"
  
  # Replace client.get without await
  sed -i "s/client\.get('CalisthenicsAPI', '\([^']*\)')/get('\1')/g" "$file"
  sed -i 's/client\.get("CalisthenicsAPI", "\([^"]*\)")/get("\1")/g' "$file"
  sed -i 's/client\.get(`CalisthenicsAPI`, `\([^`]*\)`)/get(`\1`)/g' "$file"
  
  # Replace client.post calls
  sed -i "s/await client\.post('CalisthenicsAPI', '\([^']*\)', { body: \([^}]*\) })/await post('\1', \2)/g" "$file"
  sed -i 's/await client\.post("CalisthenicsAPI", "\([^"]*\)", { body: \([^}]*\) })/await post("\1", \2)/g' "$file"
  sed -i "s/client\.post('CalisthenicsAPI', '\([^']*\)', { body: \([^}]*\) })/post('\1', \2)/g" "$file"
  
  # Replace client.put calls
  sed -i "s/await client\.put('CalisthenicsAPI', '\([^']*\)', { body: \([^}]*\) })/await put('\1', \2)/g" "$file"
  sed -i 's/await client\.put("CalisthenicsAPI", "\([^"]*\)", { body: \([^}]*\) })/await put("\1", \2)/g' "$file"
  sed -i "s/client\.put('CalisthenicsAPI', '\([^']*\)', { body: \([^}]*\) })/put('\1', \2)/g" "$file"
  
  # Replace client.del calls
  sed -i "s/await client\.del('CalisthenicsAPI', '\([^']*\)')/await del('\1')/g" "$file"
  sed -i 's/await client\.del("CalisthenicsAPI", "\([^"]*\)")/await del("\1")/g' "$file"
  sed -i "s/client\.del('CalisthenicsAPI', '\([^']*\)')/del('\1')/g" "$file"
  
  # Replace client.get with queryStringParameters (common pattern)
  sed -i "s/client\.get('CalisthenicsAPI', '\([^']*\)', {[^}]*queryStringParameters: { \([^}]*\) }[^}]*})/get('\1?\2')/g" "$file"
  
  # Replace generateClient imports with API helper imports
  if grep -q "import { generateClient } from 'aws-amplify/api'" "$file"; then
    # Determine the correct relative path to lib/api.js
    depth=$(echo "$file" | grep -o "/" | wc -l)
    if [ $depth -eq 1 ]; then
      rel_path="../lib/api"
    elif [ $depth -eq 2 ]; then
      rel_path="../../lib/api"
    elif [ $depth -eq 3 ]; then
      rel_path="../../../lib/api"
    else
      rel_path="../../lib/api"
    fi
    
    sed -i "s|import { generateClient } from 'aws-amplify/api';|import { get, post, put, del } from '$rel_path';|g" "$file"
    sed -i '/^const client = generateClient();$/d' "$file"
  fi
done

echo "Done! Processed $(echo "$files" | wc -l) files"
echo ""
echo "Remaining client. calls:"
grep -r "client\\.get\|client\\.post\|client\\.put\|client\\.del" components --include="*.jsx" --include="*.js" | wc -l
