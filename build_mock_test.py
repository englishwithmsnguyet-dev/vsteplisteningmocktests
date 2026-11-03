import json
import re

with open('/tmp/all_questions.json', 'r') as f:
    questions = json.load(f)

# Split into 3 parts
part1_qs = questions[0:8]
part2_qs = questions[8:20]
part3_qs = questions[20:35]

mock_test = {
    "id": 8,
    "title": "VSTEP Listening Mock Test 08 (47 Mins)",
    "vocab": [],
    "test": {
        "duration": 47 * 60,
        "parts": [
            {
                "id": "part1",
                "title": "PART 1: Questions 1-8",
                "instructions": "Directions: In this part, you will hear EIGHT short announcements or instructions. There is one question for each announcement or instruction. For each question, choose the right answer A, B, C or D. The recording will be played ONCE only.",
                "audioSrc": "AUDIO/MOCK TEST/PART 01.mp3",
                "questions": part1_qs
            },
            {
                "id": "part2",
                "title": "PART 2: Questions 9-20",
                "instructions": "Directions: In this part, you will hear THREE conversations. The conversations will not be repeated. There are four questions for each conversation. For each question, choose the right answer A, B, C or D.",
                "audioSrc": [
                    "AUDIO/MOCK TEST/PART 02 - CONVERSATION 01.mp3",
                    "AUDIO/MOCK TEST/PART 02 - CONVERSATION 02.mp3",
                    "AUDIO/MOCK TEST/PART 02 - CONVERSATION 03.mp3"
                ],
                "questions": part2_qs
            },
            {
                "id": "part3",
                "title": "PART 3: Questions 21-35",
                "instructions": "Directions: In this part, you will hear THREE talks or lectures. The talks or lectures will not be repeated. There are five questions for each talk or lecture. For each question, choose the right answer A, B, C or D.",
                "audioSrc": [
                    "AUDIO/MOCK TEST/PART 03 - LONG TALK 01.mp3",
                    "AUDIO/MOCK TEST/PART 03 - LONG TALK 02.mp3",
                    "AUDIO/MOCK TEST/PART 03 - LONG TALK 03.mp3"
                ],
                "questions": part3_qs
            }
        ]
    }
}

json_str = json.dumps(mock_test, ensure_ascii=False, indent=4)

with open('/Users/nguyetpham/Desktop/WEBSITE/listening-mock-tests/data.js', 'r') as f:
    data = f.read()

pattern = r'const ALL_TESTS = \['
match = re.search(pattern, data)
if match:
    insert_pos = match.end()
    new_data = data[:insert_pos] + '\n' + json_str + ',' + data[insert_pos:]
    with open('/Users/nguyetpham/Desktop/WEBSITE/listening-mock-tests/data.js', 'w') as f:
        f.write(new_data)
    print("Successfully added new test to data.js")
else:
    print("Could not find ALL_TESTS in data.js")
