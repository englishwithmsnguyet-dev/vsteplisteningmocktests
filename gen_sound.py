import wave
import struct
import math
import base64

def generate_beep(filename, freq, duration, is_buzz=False):
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1) # mono
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            
            # Envelope (decay)
            env = math.exp(-3 * t / duration)
            
            if is_buzz:
                # Square wave for buzz
                val = 1.0 if math.sin(2.0 * math.pi * freq * t) > 0 else -1.0
            else:
                # Sine wave for ding
                val = math.sin(2.0 * math.pi * freq * t)
                
            sample = int(val * env * 32767.0)
            # Clip
            sample = max(-32768, min(32767, sample))
            wav_file.writeframes(struct.pack('<h', sample))

generate_beep('correct.wav', 880.0, 0.5, False)
generate_beep('incorrect.wav', 150.0, 0.4, True)

with open('correct.wav', 'rb') as f:
    c_b64 = base64.b64encode(f.read()).decode('utf-8')
with open('incorrect.wav', 'rb') as f:
    i_b64 = base64.b64encode(f.read()).decode('utf-8')

print(f"CORRECT_B64 = '{c_b64[:20]}...'")

# Create a JS snippet
js_code = f"""
const B64_SOUND_CORRECT = 'data:audio/wav;base64,{c_b64}';
const B64_SOUND_INCORRECT = 'data:audio/wav;base64,{i_b64}';
"""
with open('sounds.js', 'w') as f:
    f.write(js_code)

