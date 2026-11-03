import json
import re

with open('/tmp/all_questions.json', 'r') as f:
    questions = json.load(f)

new_test = {
    "id": 8,  # Assuming next ID is 8, or I can use a unique ID like 99
    "title": 'Listening Mock Test (47 Mins)',
    "vocab": [],
    "questions": questions
}

# Convert JSON to a JS string, formatting correctly
json_str = json.dumps(new_test, ensure_ascii=False, indent=4)
# Make it look like JS object
js_obj_str = json_str

# Read data.js
with open('/Users/nguyetpham/Desktop/WEBSITE/listening-mock-tests/data.js', 'r') as f:
    data = f.read()

# Insert the new test at the end of the ALL_TESTS array
# Find the last closing bracket of ALL_TESTS
pattern = r'const ALL_TESTS = \['
match = re.search(pattern, data)
if match:
    insert_pos = match.end()
    # Insert new test right at the beginning of the array
    new_data = data[:insert_pos] + '\n' + js_obj_str + ',' + data[insert_pos:]
    with open('/Users/nguyetpham/Desktop/WEBSITE/listening-mock-tests/data.js', 'w') as f:
        f.write(new_data)
    print("Successfully added new test to data.js")
else:
    print("Could not find ALL_TESTS in data.js")
