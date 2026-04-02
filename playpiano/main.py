import cv2
import time
import numpy as np

from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import mediapipe as mp

import settings
from SoundManager import SoundManager
from PianoKeyboard import PianoKeyboard

class PlayPianoApp:
    def __init__(self):
        # Camera
        self.cap = cv2.VideoCapture(settings.CAMERA_INDEX, cv2.CAP_V4L2)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, settings.CAMERA_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, settings.CAMERA_HEIGHT)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        actual_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"🎥 Camera opened at: {actual_w} x {actual_h}")
        
        # Initialize sub-systems
        self.sound_manager = SoundManager()
        self.piano = PianoKeyboard(actual_w, actual_h)

        # === MediaPipe Tasks ===
        print("⏳ Attempting to load model on GPU...")
        try:
            base_options_gpu = python.BaseOptions(
                model_asset_path=settings.MODEL_PATH,
                delegate=python.BaseOptions.Delegate.GPU,
            )
            options_gpu = vision.HandLandmarkerOptions(
                base_options=base_options_gpu,
                running_mode=vision.RunningMode.VIDEO,
                num_hands=settings.MAX_NUM_HANDS,
                min_hand_detection_confidence=settings.MIN_DETECTION_CONFIDENCE,
                min_hand_presence_confidence=settings.MIN_TRACKING_CONFIDENCE,
                min_tracking_confidence=settings.MIN_TRACKING_CONFIDENCE,
            )
            self.hand_landmarker = vision.HandLandmarker.create_from_options(options_gpu)
            print("🚀 SUCCESS: Hand landmarker loaded on GPU!")
        except Exception as e:
            print(f"⚠️ GPU Load Failed: {e}")
            print("🐌 Falling back to CPU mode...")
            
            base_options_cpu = python.BaseOptions(
                model_asset_path=settings.MODEL_PATH,
                delegate=python.BaseOptions.Delegate.CPU,
            )
            options_cpu = vision.HandLandmarkerOptions(
                base_options=base_options_cpu,
                running_mode=vision.RunningMode.VIDEO,
                num_hands=settings.MAX_NUM_HANDS,
                min_hand_detection_confidence=settings.MIN_DETECTION_CONFIDENCE,
                min_hand_presence_confidence=settings.MIN_TRACKING_CONFIDENCE,
                min_tracking_confidence=settings.MIN_TRACKING_CONFIDENCE,
            )
            self.hand_landmarker = vision.HandLandmarker.create_from_options(options_cpu)
            print("✅ Hand landmarker loaded safely (CPU mode)")

        self.last_timestamp_ms = 0

    def _get_pixel_points(self, landmarks, w, h):
        return [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

    def _draw_hand_landmarks(self, image, hand_landmarks, w, h):
        pts = self._get_pixel_points(hand_landmarks, w, h)
        connections = [
            (0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),
            (0,9),(9,10),(10,11),(11,12),(0,13),(13,14),(14,15),(15,16),
            (0,17),(17,18),(18,19),(19,20),(5,9),(9,13),(13,17)
        ]
        # Landmarks style
        for start, end in connections:
            if start < len(pts) and end < len(pts):
                cv2.line(image, pts[start], pts[end], (200, 200, 200), 2)
        for pt in pts:
            cv2.circle(image, pt, 4, (0, 0, 255), -1)

    def run(self):
        # We will use tips of fingers: Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20)
        tip_ids = [4, 8, 12, 16, 20]
        pTime = 0

        while True:
            success, img = self.cap.read()
            if not success:
                continue

            img = cv2.flip(img, 1)
            h, w, _ = img.shape
            
            # Create a transparent overlay for the piano
            overlay = img.copy()

            imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=imgRGB)
            
            timestamp_ms = int(time.time() * 1000)
            if timestamp_ms <= self.last_timestamp_ms:
                timestamp_ms = self.last_timestamp_ms + 1
            self.last_timestamp_ms = timestamp_ms
            
            results = self.hand_landmarker.detect_for_video(mp_image, timestamp_ms)

            active_points = []

            if results.hand_landmarks:
                for hand_landmarks in results.hand_landmarks:
                    self._draw_hand_landmarks(overlay, hand_landmarks, w, h)
                    
                    pts = self._get_pixel_points(hand_landmarks, w, h)
                    for tip_id in tip_ids:
                        active_points.append(pts[tip_id])
                        # highlight the finger tips playing the piano
                        cv2.circle(overlay, pts[tip_id], 10, (0, 255, 0), -1)

            # Update piano state
            triggered_notes = self.piano.update_presses(active_points)
            
            # Play sounds
            for note in triggered_notes:
                self.sound_manager.play(note)
                
            # Draw piano
            self.piano.draw(overlay)
            
            # Blend overlay with original image (for semi-transparent piano)
            alpha = 0.6 # Transparency factor
            img_out = cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0)
            
            # Calculate FPS
            fps = 1 / (time.time() - pTime) if (time.time() - pTime) > 0 else 0
            pTime = time.time()
            cv2.putText(img_out, f"FPS: {int(fps)}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(img_out, "Press 'q' to quit.", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            cv2.imshow("Play Piano AR", img_out)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break

        self.cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    app = PlayPianoApp()
    app.run()
