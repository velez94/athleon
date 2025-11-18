#!/bin/bash

# Script to replace all client.get/post/put/del calls with new API helper

cd "$(dirname "$0")/src/components/backoffice"

for file in *.jsx; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Replace client.get calls
    sed -i "s/client\.get('CalisthenicsAPI', '\([^']*\)')/get('\1')/g" "$file"
    sed -i 's/client\.get("CalisthenicsAPI", "\([^"]*\)")/get("\1")/g' "$file"
    sed -i 's/client\.get(`CalisthenicsAPI`, `\([^`]*\)`)/get(`\1`)/g' "$file"
    
    # Replace client.post calls with body
    sed -i "s/client\.post('CalisthenicsAPI', '\([^']*\)', { body: \([^}]*\) })/post('\1', \2)/g" "$file"
    sed -i 's/client\.post("CalisthenicsAPI", "\([^"]*\)", { body: \([^}]*\) })/post("\1", \2)/g' "$file"
    
    # Replace client.put calls with body
    sed -i "s/client\.put('CalisthenicsAPI', '\([^']*\)', { body: \([^}]*\) })/put('\1', \2)/g" "$file"
    sed -i 's/client\.put("CalisthenicsAPI", "\([^"]*\)", { body: \([^}]*\) })/put("\1", \2)/g' "$file"
    
    # Replace client.del calls
    sed -i "s/client\.del('CalisthenicsAPI', '\([^']*\)')/del('\1')/g" "$file"
    sed -i 's/client\.del("CalisthenicsAPI", "\([^"]*\)")/del("\1")/g' "$file"
    
    # Replace client.get with queryStringParameters
    sed -i "s/client\.get('CalisthenicsAPI', '\([^']*\)', {[^}]*queryStringParameters: { organizationId: \([^}]*\) }[^}]*})/get('\1?organizationId=' + \2)/g" "$file"
  fi
done

echo "Done!"
