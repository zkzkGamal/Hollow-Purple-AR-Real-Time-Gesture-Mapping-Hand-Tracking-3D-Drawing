import os
import pygame
import settings

class SoundManager:
    def __init__(self):
        pygame.mixer.pre_init(44100, -16, 2, 512)
        pygame.mixer.init()
        pygame.init()
        
        self.sounds = {}
        for note in settings.ALL_NOTES:
            path = os.path.join(settings.SOUNDS_DIR, f"{note}.wav")
            if os.path.exists(path):
                self.sounds[note] = pygame.mixer.Sound(path)
            else:
                print(f"Warning: Sound file not found: {path}")
                
    def play(self, note):
        if note in self.sounds:
            # Play the sound on any available channel
            self.sounds[note].play()

    def stop_all(self):
        pygame.mixer.stop()
