import re

with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'r') as f:
    content = f.read()

# Fix all corrupted patterns like: credentials=this.p...n); -> credentials = this.parseCredentials(token);
# Pattern: "credentials=this.p" followed by dots and then "n);"
content = re.sub(r'const credentials=this\.p\.\.\.n\);', 'const credentials = this.parseCredentials(token);', content)

# Also fix: credentials=*** -> credentials = this.parseCredentials(token);
content = re.sub(r'const credentials=\*\*\*;', 'const credentials = this.parseCredentials(token);', content)

# Check for remaining bad patterns
bad_patterns = re.findall(r'credentials=this\.p', content)
if bad_patterns:
    print(f"WARNING: Still found {len(bad_patterns)} bad patterns")
else:
    print("All patterns fixed")

with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'w') as f:
    f.write(content)