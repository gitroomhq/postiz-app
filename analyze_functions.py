import re

with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'r') as f:
    content = f.read()

# Find all corrupted patterns - they should be "const credentials = this.parseCredentials(PARAM_NAME)"
# where PARAM_NAME matches the function parameter

# First, fix the truncated patterns
content = re.sub(r'const credentials=this\.p\.\.\.n\);', 'const credentials = this.parseCredentials(token);', content)
content = re.sub(r'const credentials=this\.p\.\.\.en\);', 'const credentials = this.parseCredentials(token);', content)
content = re.sub(r'const credentials=\*\*\*;', 'const credentials = this.parseCredentials(token);', content)

# Now check for parameter mismatches
# Functions with accessToken parameter should use accessToken
# Functions with token parameter should use token

# Known patterns:
# - Methods with token parameter: tags, authors, tiers, newsletters, themes, updateThemeSettings, activateTheme, deletePost
# - Methods with accessToken parameter: update, changeStatus

# Let's identify all function signatures and their parseCredentials usage
lines = content.split('\n')
functions = []

for i, line in enumerate(lines):
    # Look for function signatures
    if 'async ' in line and '(' in line:
        # Extract function name and first parameter
        match = re.search(r'async\s+(\w+)\s*\(\s*(\w+)', line)
        if match:
            func_name = match.group(1)
            first_param = match.group(2)
            functions.append((i+1, func_name, first_param))

# Now fix - functions with accessToken should use accessToken, not token
# This is a pattern issue from the corruption

# Count issues
for line_num, func_name, first_param in functions:
    print(f"Line {line_num}: {func_name}({first_param} ...)")