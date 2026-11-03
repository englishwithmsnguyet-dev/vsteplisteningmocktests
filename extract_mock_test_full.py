import docx
import json
import re

doc = docx.Document('/Users/nguyetpham/Documents/MINH NGUYỆT/TEACHING/TÀI LIỆU DẠY BẢN MỚI/VSTEP 2026/LECTURES/LISTENING/LISTENING MOCK TEST/TRANSCRIPT/LISTENING MOCK TEST - ANSWER KEYS.docx')

questions = []
q_id = 1

# Process Tables for Questions 1-8
for table in doc.tables:
    if len(table.rows) >= 2:
        en_text = table.rows[0].cells[0].text.strip()
        vn_text = table.rows[1].cells[0].text.strip()
        match = re.match(r'^(\d+)\.\s*(.*)', en_text)
        if match:
            lines = [L.strip() for L in en_text.split('\n') if L.strip()]
            q_text_en = lines[0].split('.', 1)[1].strip()
            
            options_en = {}
            transcript_en = ""
            for j in range(1, len(lines)):
                if re.match(r'^[A-D]\.', lines[j]):
                    opt_letter = lines[j][0]
                    options_en[opt_letter] = lines[j][2:].strip()
                else:
                    transcript_en = "\n".join(lines[j:])
                    break
                    
            vn_lines = [L.strip() for L in vn_text.split('\n') if L.strip()]
            q_text_vn = vn_lines[0].split('.', 1)[1].strip()
            
            options_vn = {}
            correct_ans = ""
            for j in range(1, len(vn_lines)):
                if re.match(r'^[A-D]\.', vn_lines[j]):
                    opt_letter = vn_lines[j][0]
                    opt_text = vn_lines[j][2:].strip()
                    if '✅' in opt_text:
                        correct_ans = opt_letter
                        opt_text = opt_text.replace('✅', '').strip()
                    options_vn[opt_letter] = opt_text
            
            questions.append({
                "id": q_id,
                "text": q_text_en,
                "options": options_en,
                "correct": correct_ans,
                "translation": {
                    "question": q_text_vn,
                    "options": options_vn
                },
                "explanations": {k: f"Đáp án {k}" for k in options_en.keys()},
                "transcriptSnippet": transcript_en
            })
            q_id += 1

# Process Paragraphs for Questions 9-35
current_q = None
parsing_mode = None  # 'en_q', 'vn_q', 'transcript_en', 'transcript_vn'
all_paras = doc.paragraphs

idx = 0
while idx < len(all_paras):
    p = all_paras[idx]
    text = p.text.strip()
    
    match = re.match(r'^(\d+)\.\s*(.*)', text)
    if match and int(match.group(1)) == q_id:
        if current_q:
            questions.append(current_q)
        current_q = {
            "id": q_id,
            "text": match.group(2).strip(),
            "options": {},
            "correct": "",
            "translation": {"question": "", "options": {}},
            "explanations": {},
            "transcriptSnippet": ""
        }
        parsing_mode = 'en_q'
        q_id += 1
        idx += 1
        continue

    if current_q:
        if parsing_mode == 'en_q':
            if re.match(r'^[A-D]\.', text):
                opts = re.findall(r'([A-D])\.\s*(.*?)(?=(?:[A-D]\.|$))', text)
                
                # Check run colors for correct answer in English options
                for run in p.runs:
                    if getattr(run.font, 'color', None) and run.font.color.rgb:
                        color = str(run.font.color.rgb).upper()
                        if color == 'FF0000' or color == 'EE0000':
                            run_text = run.text.strip()
                            if run_text:
                                for l, ot in opts:
                                    if run_text in ot or run_text.startswith(l):
                                        current_q["correct"] = l
                
                for letter, opt_text in opts:
                    current_q["options"][letter] = opt_text.strip()
            elif text.startswith('___') or text.startswith(f'{current_q["id"]}.'):
                match_vn = re.match(r'^(\d+)\.\s*(.*)', text)
                if match_vn and int(match_vn.group(1)) == current_q["id"]:
                    current_q["translation"]["question"] = match_vn.group(2).strip()
                    parsing_mode = 'vn_q'
            elif "TRANSCRIPT" in text or "Lễ tân:" in text or "Khách:" in text:
                 pass
            elif re.match(r'^(\d+)\.\s*(.*)', text):
                 pass

        elif parsing_mode == 'vn_q':
            if re.match(r'^[A-D]\.', text):
                opts = re.findall(r'([A-D])\.\s*(.*?)(?=(?:[A-D]\.|$))', text)
                for letter, opt_text in opts:
                    current_q["translation"]["options"][letter] = opt_text.strip()
            elif "TRANSCRIPT" in text:
                parsing_mode = 'transcript_en'
                
        elif parsing_mode == 'transcript_en':
            if text.startswith('___'):
                parsing_mode = 'transcript_vn'
            else:
                if text:
                    current_q["transcriptSnippet"] += text + "\n"
                    
        elif parsing_mode == 'transcript_vn':
             if text.startswith('QUESTIONS'):
                 parsing_mode = None
                 
    idx += 1

if current_q:
    questions.append(current_q)

print(json.dumps(questions, ensure_ascii=False, indent=2))
