
# ── MediaPipe ─────────────────────────────────────────────────────────────────
MAX_NUM_HANDS: int = 1
MIN_DETECTION_CONFIDENCE: float = 0.7   
MIN_TRACKING_CONFIDENCE: float = 0.7  
MIN_HAND_PRESENCE_CONFIDENCE: float = 0.7

# ── Landmark IDs ──────────────────────────────────────────────────────────────
TIP_IDS: list[int]  = [4, 8, 12, 16, 20]   
BASE_IDS: list[int] = [2, 5,  9, 13, 17]

FINGER_NAMES: list[str] = ["Thumb", "Index", "Middle", "Ring", "Pinky"]

# ── Drawing ───────────────────────────────────────────────────────────────────
DEFAULT_DRAW_COLOR: tuple[int, int, int] = (0, 0, 255)   
BRUSH_SIZE: int   = 8     
ERASER_SIZE: int  = 40    

SMOOTHING_WINDOW: int = 5

# ── Colour Palette ────────────────────────────────────────────────────────────
PALETTE: list[tuple[str, tuple[int, int, int]]] = [
    ("Red",    (0,   0,   255)),
    ("Eraser", (0,   0,    0 )),  
]

# Palette widget layout (pixels)
PALETTE_X: int     = 20   
PALETTE_Y0: int    = 100  
PALETTE_W: int     = 40   
PALETTE_H: int     = 40   
PALETTE_GAP: int   = 5    

# ── Skeleton drawing style ────────────────────────────────────────────────────
LANDMARK_COLOR: tuple[int, int, int]   = (0,   255,  0)   
CONNECTION_COLOR: tuple[int, int, int] = (255, 255,  0)   
LANDMARK_THICKNESS: int  = 2
LANDMARK_RADIUS: int     = 4
CONNECTION_THICKNESS: int = 2

# ── HUD / overlay ─────────────────────────────────────────────────────────────
HUD_FONT       = 0   
HUD_COLOR_FPS: tuple[int, int, int]  = (255, 0, 255)  
HUD_COLOR_MODE_DRAW: tuple[int, int, int]  = (0, 255, 0)    
HUD_COLOR_MODE_HOVER: tuple[int, int, int] = (0, 165, 255)  
HUD_COLOR_SUMMARY: tuple[int, int, int]    = (0, 255, 255)  
HUD_COLOR_HINT: tuple[int, int, int]       = (180, 180, 180)  

HINT_TEXT: str = (
    "Index=Draw  |  Index+Middle=Hover  |  All fingers=Clear  |  Q=Quit  |  C=Clear"
)

# ── Camera ────────────────────────────────────────────────────────────────────
CAMERA_INDEX: int = 0
