import re

with open('/Users/nguyetpham/Desktop/WEBSITE/listening-mock-tests/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('sounds.js', 'r', encoding='utf-8') as f:
    sounds_js = f.read()

# Insert sounds_js into html just before `function VocabGame`
html = html.replace('function VocabGame({ vocabList, onExit }) {', sounds_js + '\n        function VocabGame({ vocabList, onExit }) {')

# Now rewrite playCorrectSound and playIncorrectSound
new_audio_logic = """
            const playCorrectSound = () => {
                try {
                    const audio = new Audio(B64_SOUND_CORRECT);
                    audio.play();
                } catch(e) {}
            };

            const playIncorrectSound = () => {
                try {
                    const audio = new Audio(B64_SOUND_INCORRECT);
                    audio.play();
                } catch(e) {}
            };
"""

html = re.sub(r'const playCorrectSound = \(\) => \{.*?\};', new_audio_logic.strip(), html, flags=re.DOTALL)
html = re.sub(r'const playIncorrectSound = \(\) => \{.*?\};\n\n            const handleAnswer', '\n            const handleAnswer', html, flags=re.DOTALL)

with open('/Users/nguyetpham/Desktop/WEBSITE/listening-mock-tests/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
