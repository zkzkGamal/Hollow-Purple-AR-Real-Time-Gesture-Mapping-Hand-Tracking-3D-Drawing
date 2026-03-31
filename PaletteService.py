import cv2
import settings

class PaletteService:
    def __init__(self, draw_color):
        self.draw_color = draw_color

    def get_palette(self):
        return settings.PALETTE

    def draw_palette(self, img):
        for i, (name, color) in enumerate(settings.PALETTE):
            x1 = settings.PALETTE_X
            y1 = settings.PALETTE_Y0 + i * (settings.PALETTE_H + settings.PALETTE_GAP)
            x2 = x1 + settings.PALETTE_W
            y2 = y1 + settings.PALETTE_H
            cv2.rectangle(img, (x1, y1), (x2, y2), color, -1)
            cv2.rectangle(img, (x1, y1), (x2, y2), (200, 200, 200), 1)
            # Highlight selected
            if name != "Eraser" and color == self.draw_color:
                cv2.rectangle(
                    img, (x1 - 3, y1 - 3), (x2 + 3, y2 + 3), (255, 255, 255), 2
                )
            cv2.putText(
                img,
                name,
                (x2 + 6, y1 + 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 255, 255),
                1,
            )
            
    def check_palette_click(self, pt):
        """Return new draw_color or None if point not in palette."""
        px, py = pt
        for i, (name, color) in enumerate(settings.PALETTE):
            x1 = settings.PALETTE_X
            y1 = settings.PALETTE_Y0 + i * (settings.PALETTE_H + settings.PALETTE_GAP)
            x2 = x1 + settings.PALETTE_W
            y2 = y1 + settings.PALETTE_H
            if x1 <= px <= x2 and y1 <= py <= y2:
                if name == "Eraser":
                    return "eraser"
                self.draw_color = color
                return color
        return None
