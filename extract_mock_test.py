import docx
import json
import re

doc = docx.Document('/Users/nguyetpham/Documents/MINH NGUYỆT/TEACHING/TÀI LIỆU DẠY BẢN MỚI/VSTEP 2026/LECTURES/LISTENING/LISTENING MOCK TEST/TRANSCRIPT/LISTENING MOCK TEST - ANSWER KEYS.docx')

questions = []
q_id = 1

for i, table in enumerate(doc.tables):
    if len(table.rows) >= 2:
        en_text = table.rows[0].cells[0].text.strip()
        vn_text = table.rows[1].cells[0].text.strip()
        
        # Check if it starts with a number like "1." or "35."
        match = re.match(r'^(\d+)\.\s*(.*)', en_text)
        if match:
            # Extract English question and options
            lines = en_text.split('\n')
            q_text_en = lines[0].split('.', 1)[1].strip()
            
            options_en = {}
            transcript_en = ""
            
            opt_idx = 0
            for j in range(1, len(lines)):
                line = lines[j].strip()
                if not line:
                    continue
                if re.match(r'^[A-D]\.', line):
                    opt_letter = line[0]
                    opt_text = line[2:].strip()
                    options_en[opt_letter] = opt_text
                else:
                    # Transcript starts here
                    transcript_en = "\n".join(lines[j:]).strip()
                    break
                    
            # Extract Vietnamese question, options, and answer
            vn_lines = vn_text.split('\n')
            q_text_vn = vn_lines[0].split('.', 1)[1].strip()
            
            options_vn = {}
            correct_ans = ""
            transcript_vn = ""
            
            for j in range(1, len(vn_lines)):
                line = vn_lines[j].strip()
                if not line:
                    continue
                if re.match(r'^[A-D]\.', line):
                    opt_letter = line[0]
                    opt_text = line[2:].strip()
                    if '✅' in opt_text:
                        correct_ans = opt_letter
                        opt_text = opt_text.replace('✅', '').strip()
                    options_vn[opt_letter] = opt_text
                else:
                    # Transcript starts here
                    transcript_vn = "\n".join(vn_lines[j:]).strip()
                    break
                    
            if not correct_ans:
                # Try to find checkmark in the text if not in options
                pass
                
            q_obj = {
                "id": q_id,
                "text": q_text_en,
                "options": options_en,
                "correct": correct_ans,
                "translation": {
                    "question": q_text_vn,
                    "options": options_vn
                },
                "explanations": {
                    "A": "Đáp án A",
                    "B": "Đáp án B",
                    "C": "Đáp án C",
                    "D": "Đáp án D"
                },
                "transcriptSnippet": transcript_en
            }
            questions.append(q_obj)
            q_id += 1

print(json.dumps(questions, ensure_ascii=False, indent=2))
