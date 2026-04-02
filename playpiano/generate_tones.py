import wave
import struct
import math
import os

def generate_tone(frequency, duration, volume=0.5, sample_rate=44100, filename='tone.wav'):
    num_samples = int(duration * sample_rate)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1) # Mono
        wav_file.setsampwidth(2) # 2 bytes per sample (16-bit)
        wav_file.setframerate(sample_rate)
        
        # Add some basic ADSR envelope for it to sound a bit like a piano (or less like an abrupt beep)
        attack_time = 0.05
        decay_time = 0.1
        sustain_level = 0.7
        release_time = 0.2
        
        attack_samples = int(attack_time * sample_rate)
        decay_samples = int(decay_time * sample_rate)
        release_samples = int(release_time * sample_rate)
        sustain_samples = num_samples - attack_samples - decay_samples - release_samples
        if sustain_samples < 0:
            sustain_samples = 0
            
        for i in range(num_samples):
            # Calculate envelope
            if i < attack_samples:
                env = i / attack_samples
            elif i < attack_samples + decay_samples:
                env = 1.0 - (1.0 - sustain_level) * ((i - attack_samples) / decay_samples)
            elif i < attack_samples + decay_samples + sustain_samples:
                env = sustain_level
            else:
                release_idx = i - (attack_samples + decay_samples + sustain_samples)
                env = sustain_level * (1.0 - release_idx / release_samples)
                if env < 0: env = 0
                
            sample = volume * env * math.sin(2 * math.pi * frequency * i / sample_rate)
            # Add some harmonics for a richer sound
            sample += volume * 0.5 * env * math.sin(2 * math.pi * (frequency*2) * i / sample_rate)
            sample += volume * 0.25 * env * math.sin(2 * math.pi * (frequency*3) * i / sample_rate)
            
            # Normalize and clamp
            sample = max(-1.0, min(1.0, sample / 1.75))
            
            value = int(sample * 32767.0)
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

# Frequencies for C4 to B4 (including sharps)
notes = {
    'C': 261.63,
    'C#': 277.18,
    'D': 293.66,
    'D#': 311.13,
    'E': 329.63,
    'F': 349.23,
    'F#': 369.99,
    'G': 392.00,
    'G#': 415.30,
    'A': 440.00,
    'A#': 466.16,
    'B': 493.88
}

os.makedirs('sounds', exist_ok=True)
for note, freq in notes.items():
    filename = f'sounds/{note}.wav'
    print(f"Generating {filename} ({freq} Hz)...")
    generate_tone(freq, 1.5, filename=filename)

print("Done generating sounds.")
