import re

with open('data.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix double commas
text = re.sub(r',\s*,', ',', text)

with open('data.js', 'w', encoding='utf-8') as f:
    f.write(text)
