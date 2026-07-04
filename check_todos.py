import os
import re

directories = [
    r"C:\Users\Manas Varade\.gemini\antigravity\scratch\doctor-appointment-agent\backend\src",
    r"C:\Users\Manas Varade\.gemini\antigravity\scratch\doctor-appointment-agent\frontend\src"
]

print("Scanning directories for TODOs, FIXMEs, or placeholders...")

found_items = []

for directory in directories:
    if not os.path.exists(directory):
        print(f"Directory {directory} does not exist!")
        continue
        
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.json', '.html', '.css')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    for idx, line in enumerate(lines):
                        # Search for TODO, FIXME, placeholder, XXX, etc.
                        if re.search(r'\b(TODO|FIXME|XXX|placeholder)\b', line, re.IGNORECASE):
                            found_items.append({
                                'file': os.path.relpath(file_path, r"C:\Users\Manas Varade\.gemini\antigravity\scratch\doctor-appointment-agent"),
                                'line': idx + 1,
                                'content': line.strip()
                            })
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

print(f"Found {len(found_items)} items:")
for item in found_items:
    print(f"{item['file']}:{item['line']}: {item['content']}")
