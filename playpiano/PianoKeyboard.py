import cv2
import settings

class PianoKeyboard:
    def __init__(self, screen_w, screen_h):
        self.screen_w = screen_w
        self.screen_h = screen_h
        
        self.white_key_width = self.screen_w // len(settings.WHITE_NOTES)
        self.white_key_height = int(self.screen_h * settings.KEY_HEIGHT_RATIO)
        
        self.black_key_width = int(self.white_key_width * settings.BLACK_KEY_WIDTH_RATIO)
        self.black_key_height = int(self.screen_h * settings.BLACK_KEY_HEIGHT_RATIO)
        
        # Move to top
        self.start_y = 0
        
        self.white_keys = []
        self.black_keys = []
        
        black_key_positions = {0: "C#", 1: "D#", 3: "F#", 4: "G#", 5: "A#"}
        
        for i in range(len(settings.WHITE_NOTES)):
            x = i * self.white_key_width
            y = self.start_y
            w = self.white_key_width if i < len(settings.WHITE_NOTES) - 1 else self.screen_w - x
            h = self.white_key_height
            
            note = settings.WHITE_NOTES[i]
            self.white_keys.append({'note': note, 'rect': (x, y, w, h), 'type': 'white'})
            
            if i in black_key_positions:
                black_note = black_key_positions[i]
                bx = x + w - (self.black_key_width // 2)
                by = self.start_y
                bw = self.black_key_width
                bh = self.black_key_height
                self.black_keys.append({'note': black_note, 'rect': (bx, by, bw, bh), 'type': 'black'})
            
        self.pressed_notes = set()

    def update_presses(self, active_points):
        """
        active_points: List of (x,y) coordinates of fingertips
        Returns a list of notes that were JUST TRIGERRED this frame.
        """
        currently_pressed = set()
        triggered_notes = []
        
        # Black keys on top
        all_keys_to_check = self.black_keys + self.white_keys
        
        for pt in active_points:
            px, py = pt
            for key in all_keys_to_check:
                x, y, w, h = key['rect']
                if x <= px <= x + w and y <= py <= y + h:
                    note = key['note']
                    currently_pressed.add(note)
                    if note not in self.pressed_notes:
                        triggered_notes.append(note)
                    break
        
        self.pressed_notes = currently_pressed
        return triggered_notes

    def draw(self, img):
        for key in self.white_keys:
            note = key['note']
            x, y, w, h = key['rect']
            
            color = settings.KEY_COLOR_PRESSED if note in self.pressed_notes else settings.KEY_COLOR_WHITE
            
            cv2.rectangle(img, (x, y), (x + w, y + h), color, -1)
            cv2.rectangle(img, (x, y), (x + w, y + h), settings.KEY_BORDER_COLOR, settings.KEY_BORDER_THICKNESS)
            
            text_size = cv2.getTextSize(note, cv2.FONT_HERSHEY_SIMPLEX, 1, 2)[0]
            text_x = x + (w - text_size[0]) // 2
            text_y = y + h - 20
            cv2.putText(img, note, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 1, settings.TEXT_COLOR_WHITE, 2)

        for key in self.black_keys:
            note = key['note']
            x, y, w, h = key['rect']
            
            color = settings.KEY_COLOR_PRESSED if note in self.pressed_notes else settings.KEY_COLOR_BLACK
            
            cv2.rectangle(img, (x, y), (x + w, y + h), color, -1)
            cv2.rectangle(img, (x, y), (x + w, y + h), settings.KEY_BORDER_COLOR, settings.KEY_BORDER_THICKNESS)
            
            text_size = cv2.getTextSize(note, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            text_x = x + (w - text_size[0]) // 2
            text_y = y + h - 15
            cv2.putText(img, note, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, settings.TEXT_COLOR_BLACK, 2)
