with open('libraries/nestjs-libraries/src/integrations/social/ghost.provider.ts', 'r') as f:
    content = f.read()

# Get the raw bytes around line 2350
lines = content.split('\n')
line_2350 = lines[2349] if len(lines) > 2349 else 'OUT OF BOUNDS'
print(f"Line 2350 raw bytes: {repr(line_2350)}")
print(f"Line 2350 hex: {line_2350.encode().hex()}")