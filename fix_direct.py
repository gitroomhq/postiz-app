with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'r') as f:
    content = f.read()

# Check what's actually there
print(f"File length: {len(content)}")
print(f"Corrupted patterns 'credentials=this.p': {content.count('credentials=this.p')}")

# Simple string replaces for the corrupted patterns
# The actual text is: 'const credentials=this.p...en);'
content = content.replace('const credentials=this.p...en);', 'const credentials = this.parseCredentials(token);')
content = content.replace('const credentials=this.p...n);', 'const credentials = this.parseCredentials(token);')
content = content.replace('const credentials=***;', 'const credentials = this.parseCredentials(token);')

# Verify fix
remaining = content.count('credentials=this.p')
print(f"After fix, remaining: {remaining}")

with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'w') as f:
    f.write(content)

print("Done")