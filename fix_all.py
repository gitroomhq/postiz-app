import re

with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'r') as f:
    content = f.read()

# Fix all corrupted patterns
# Pattern: "const credentials=this.p...n);" or "const credentials=this.p...en);"
# These should be "const credentials = this.parseCredentials(PARAM);"

# First, let's find all corrupted patterns and their context
corrupted = re.findall(r'const credentials=this\.p\.\.\.[^n]+n\);', content)
print(f"Found {len(corrupted)} corrupted patterns")

# Fix with token first (most common)
content = re.sub(r'const credentials=this\.p\.\.\.n\);', 'const credentials = this.parseCredentials(token);', content)
content = re.sub(r'const credentials=this\.p\.\.\.en\);', 'const credentials = this.parseCredentials(token);', content)
content = re.sub(r'const credentials=\*\*\*;', 'const credentials = this.parseCredentials(token);', content)

# Now fix the specific functions that have accessToken parameter instead of token
# update function (line ~2195) uses accessToken
# changeStatus function (line ~2342) uses accessToken

# Find and fix changeStatus (accessToken parameter)
content = re.sub(
    r'(async changeStatus\([^)]*accessToken[^)]*\)[^{]*\{[^}]*const credentials\s*=\s*this\.parseCredentials\(token\);)',
    lambda m: m.group(0).replace('parseCredentials(token)', 'parseCredentials(accessToken)'),
    content
)

# Find and fix update function (accessToken parameter)
content = re.sub(
    r'(async update\([^)]*accessToken[^)]*\)[^}]*\{[^}]*const credentials\s*=\s*this\.parseCredentials\(token\);)',
    lambda m: m.group(0).replace('parseCredentials(token)', 'parseCredentials(accessToken)'),
    content
)

# Count remaining issues
remaining = re.findall(r'const credentials=this\.p', content)
print(f"Remaining corrupted: {len(remaining)}")

with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'w') as f:
    f.write(content)

print("File fixed")