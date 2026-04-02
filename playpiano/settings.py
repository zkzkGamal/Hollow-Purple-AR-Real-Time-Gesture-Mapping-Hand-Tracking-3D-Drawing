import os

# Camera
CAMERA_INDEX = 0
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

# MediaPipe
MAX_NUM_HANDS = 2
MIN_DETECTION_CONFIDENCE = 0.5
MIN_TRACKING_CONFIDENCE = 0.5
MODEL_PATH = "../hand_landmarker.task"

# Piano Layout
WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"]
BLACK_NOTES = ["C#", "D#", "F#", "G#", "A#"]
ALL_NOTES = WHITE_NOTES + BLACK_NOTES

KEY_HEIGHT_RATIO = 0.4 # White piano keys take up 40% of the screen
BLACK_KEY_HEIGHT_RATIO = 0.25 # Black keys are shorter
BLACK_KEY_WIDTH_RATIO = 0.6 # relative to white key width

# Colors
KEY_COLOR_WHITE = (255, 255, 255) # White
KEY_COLOR_BLACK = (60, 60, 60) # Dark gray
KEY_COLOR_PRESSED = (180, 200, 255) # Light blue when pressed
KEY_BORDER_COLOR = (0, 0, 0) # Black
KEY_BORDER_THICKNESS = 2
TEXT_COLOR_WHITE = (0, 0, 0)
TEXT_COLOR_BLACK = (255, 255, 255)

# Audio
SOUNDS_DIR = os.path.join(os.path.dirname(__file__), 'sounds')
