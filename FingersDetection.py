import math
import settings

class CheckFingers:
    def fingers_up(self, lms, handedness, w, h):
        """Return list of booleans: True = finger is up (extended)."""
        up = []
        pts = [(int(lm.x * w), int(lm.y * h)) for lm in lms.landmark]

        # Landmark 0 is the Wrist. Use distance from wrist to determine if fingers are extended.
        # This makes the detection fully rotation-invariant (works drawing down, sideways, etc.)
        wrist = pts[0]
        
        for i in range(5):
            tip = pts[settings.TIP_IDS[i]]
            pip = pts[settings.TIP_IDS[i] - 2]  # PIP joint for index-pinky, and MCP for thumb
            
            # If the tip is further from the wrist than the PIP joint, the finger is extended
            dist_tip = math.hypot(tip[0] - wrist[0], tip[1] - wrist[1])
            dist_pip = math.hypot(pip[0] - wrist[0], pip[1] - wrist[1])
            
            up.append(dist_tip > dist_pip)

        return up, pts