#!/usr/bin/env python3
import os
import re
import sys

def fix_api_calls(content):
    """Replace all client.get/post/put/del calls with new API helper"""
    
    # Pattern 1: client.get('CalisthenicsAPI', 'path') or client.get('CalisthenicsAPI', `/path`)
    content = re.sub(
        r"client\.get\(['\"]CalisthenicsAPI['\"]\s*,\s*(['\"`])([^'\"`]+)\1\)",
        r"get(\1\2\1)",
        content
    )
    
    # Pattern 2: client.get('CalisthenicsAPI', 'path', {...})
    content = re.sub(
        r"client\.get\(['\"]CalisthenicsAPI['\"]\s*,\s*(['\"`])([^'\"`]+)\1\s*,\s*\{[^}]*\}\)",
        r"get(\1\2\1)",
        content
    )
    
    # Pattern 3: client.post('CalisthenicsAPI', 'path', { body: data })
    content = re.sub(
        r"client\.post\(['\"]CalisthenicsAPI['\"]\s*,\s*(['\"`])([^'\"`]+)\1\s*,\s*\{\s*body:\s*([^}]+)\}\)",
        r"post(\1\2\1, \3)",
        content
    )
    
    # Pattern 4: client.put('CalisthenicsAPI', 'path', { body: data })
    content = re.sub(
        r"client\.put\(['\"]CalisthenicsAPI['\"]\s*,\s*(['\"`])([^'\"`]+)\1\s*,\s*\{\s*body:\s*([^}]+)\}\)",
        r"put(\1\2\1, \3)",
        content
    )
    
    # Pattern 5: client.del('CalisthenicsAPI', 'path')
    content = re.sub(
        r"client\.del\(['\"]CalisthenicsAPI['\"]\s*,\s*(['\"`])([^'\"`]+)\1\)",
        r"del(\1\2\1)",
        content
    )
    
    return content

def fix_imports(content, filepath):
    """Replace generateClient imports with API helper imports"""
    
    # Check if file uses generateClient
    if 'generateClient' not in content:
        return content
    
    # Determine relative path depth
    depth = filepath.count(os.sep) - 1  # -1 for src/
    if depth == 1:
        rel_path = '../lib/api'
    elif depth == 2:
        rel_path = '../../lib/api'
    elif depth == 3:
        rel_path = '../../../lib/api'
    else:
        rel_path = '../../lib/api'
    
    # Replace import
    content = re.sub(
        r"import \{ generateClient \} from ['\"]aws-amplify/api['\"];",
        f"import {{ get, post, put, del }} from '{rel_path}';",
        content
    )
    
    # Remove const client = generateClient();
    content = re.sub(r"const client = generateClient\(\);?\n?", "", content)
    
    return content

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix API calls
        content = fix_api_calls(content)
        
        # Fix imports
        rel_path = filepath.replace('src/', '')
        content = fix_imports(content, rel_path)
        
        # Only write if changed
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    src_dir = 'src/components'
    
    if not os.path.exists(src_dir):
        print(f"Directory {src_dir} not found!")
        sys.exit(1)
    
    processed = 0
    modified = 0
    
    # Walk through all .jsx and .js files
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.jsx', '.js')):
                filepath = os.path.join(root, file)
                
                # Check if file contains client. calls
                with open(filepath, 'r', encoding='utf-8') as f:
                    if 'client.' in f.read():
                        processed += 1
                        if process_file(filepath):
                            modified += 1
                            print(f"✓ Modified: {filepath}")
    
    print(f"\nProcessed {processed} files, modified {modified} files")
    
    # Count remaining
    remaining = 0
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.jsx', '.js')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    count = len(re.findall(r'client\.(get|post|put|del)\(', content))
                    if count > 0:
                        remaining += count
                        print(f"  {filepath}: {count} remaining")
    
    print(f"\nRemaining client. calls: {remaining}")

if __name__ == '__main__':
    main()
