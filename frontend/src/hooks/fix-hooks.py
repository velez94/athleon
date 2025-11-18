#!/usr/bin/env python3
import os
import re
import glob

for filepath in glob.glob('*.js') + glob.glob('*.jsx'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix all client.get/post/put/del patterns
    content = re.sub(r"client\.get\('CalisthenicsAPI',\s*`([^`]+)`\)", r'get(`\1`)', content)
    content = re.sub(r"client\.get\('CalisthenicsAPI',\s*'([^']+)'\)", r"get('\1')", content)
    content = re.sub(r"client\.post\('CalisthenicsAPI',\s*`([^`]+)`,\s*\{\s*body:\s*([^}]+)\}\)", r'post(`\1`, \2)', content)
    content = re.sub(r"client\.post\('CalisthenicsAPI',\s*'([^']+)',\s*\{\s*body:\s*([^}]+)\}\)", r"post('\1', \2)", content)
    content = re.sub(r"client\.put\('CalisthenicsAPI',\s*`([^`]+)`,\s*\{\s*body:\s*([^}]+)\}\)", r'put(`\1`, \2)', content)
    content = re.sub(r"client\.put\('CalisthenicsAPI',\s*'([^']+)',\s*\{\s*body:\s*([^}]+)\}\)", r"put('\1', \2)", content)
    content = re.sub(r"client\.del\('CalisthenicsAPI',\s*`([^`]+)`\)", r'del(`\1`)', content)
    content = re.sub(r"client\.del\('CalisthenicsAPI',\s*'([^']+)'\)", r"del('\1')", content)
    
    # Fix imports
    content = re.sub(r"import \{ generateClient \} from 'aws-amplify/api';", "import { get, post, put, del } from '../lib/api';", content)
    content = re.sub(r'const client = generateClient\(\);?\n?', '', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f'Fixed {filepath}')

print('Done!')
