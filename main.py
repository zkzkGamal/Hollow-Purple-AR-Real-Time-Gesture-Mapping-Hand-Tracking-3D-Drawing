import cv2
import time
import numpy as np
from collections import deque

from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import mediapipe as mp

from FingersDetection import CheckFingers
from PaletteService import PaletteService
import settings


class HandDrawingApp:
    def __init__(self):
        # Camera - Linux optimized
        self.cap = cv2.VideoCapture(settings.CAMERA_INDEX, cv2.CAP_V4L2)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        actual_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"🎥 Camera opened at: {actual_w} x {actual_h}")

        # === MediaPipe Tasks - Try GPU, Fallback to CPU ===
        print("⏳ Attempting to load model on GPU...")
        try:
            base_options_gpu = python.BaseOptions(
                model_asset_path="hand_landmarker.task",
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
                model_asset_path="hand_landmarker.task",
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

        # Canvas & helpers
        self.canvas = None
        self.draw_color = settings.DEFAULT_DRAW_COLOR
        self.prev_draw_pt = None
        self.drawing_mode = False
        self.pTime = 0
        self.pts_queue = deque(maxlen=settings.SMOOTHING_WINDOW)
        self.missing_frames = 0
        self.last_timestamp_ms = 0

        self.check_fingers = CheckFingers()
        self.palette_service = PaletteService(draw_color=self.draw_color)


    def _get_pixel_points(self, landmarks, w, h):
        return [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

    def _smooth_point(self, pt):
        self.pts_queue.append(pt)
        x = int(sum(p[0] for p in self.pts_queue) / len(self.pts_queue))
        y = int(sum(p[1] for p in self.pts_queue) / len(self.pts_queue))
        return (x, y)

    def _draw_hand_landmarks(self, image, hand_landmarks, w, h):
        pts = self._get_pixel_points(hand_landmarks, w, h)
        connections = [
            (0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),
            (0,9),(9,10),(10,11),(11,12),(0,13),(13,14),(14,15),(15,16),
            (0,17),(17,18),(18,19),(19,20),(5,9),(9,13),(13,17)
        ]
        for start, end in connections:
            if start < len(pts) and end < len(pts):
                cv2.line(image, pts[start], pts[end], settings.CONNECTION_COLOR, 
                         max(1, settings.CONNECTION_THICKNESS-1))   # thinner = faster
        for pt in pts:
            cv2.circle(image, pt, max(2, settings.LANDMARK_RADIUS-2), 
                       settings.LANDMARK_COLOR, -1)   # filled circle = faster

    def run(self):
        frame_skip = 0   # we can skip some frames if needed

        while True:
            success, img = self.cap.read()
            if not success:
                continue

            img = cv2.flip(img, 1)
            h, w, _ = img.shape

            if self.canvas is None:
                self.canvas = np.zeros((h, w, 3), dtype=np.uint8)

            # Process hand detection only every frame for now (we can change to 2 if still slow)
            imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=imgRGB)
            
            # VIDEO mode requires strictly monotonically increasing timestamps
            timestamp_ms = int(time.time() * 1000)
            if timestamp_ms <= self.last_timestamp_ms:
                timestamp_ms = self.last_timestamp_ms + 1
            self.last_timestamp_ms = timestamp_ms
            
            results = self.hand_landmarker.detect_for_video(mp_image, timestamp_ms)

            if results.hand_landmarks:
                for idx, (hand_landmarks, handedness) in enumerate(zip(results.hand_landmarks, results.handedness)):
                    class FakeLandmarkList: landmark = hand_landmarks
                    class FakeClassification: label = handedness[0].category_name
                    class FakeClassificationList: classification = [FakeClassification()]

                    fake_hand_lms = FakeLandmarkList()
                    fake_handedness = FakeClassificationList()

                    up, pts = self.check_fingers.fingers_up(fake_hand_lms, fake_handedness, w, h)
                    hand_label = handedness[0].category_name

                    self._draw_hand_landmarks(img, hand_landmarks, w, h)

                    # Finger labels + summary (kept but can be disabled if needed)
                    for i in range(5):
                        tip_pt = pts[settings.TIP_IDS[i]]
                        label = settings.FINGER_NAMES[i] if up[i] else ""
                        bg_color = (0, 200, 0) if up[i] else (60, 60, 60)
                        if label:
                            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                            tx = tip_pt[0] - tw // 2
                            ty = tip_pt[1] - 18
                            cv2.rectangle(img, (tx-3, ty-th-3), (tx+tw+3, ty+3), bg_color, -1)
                            cv2.putText(img, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)

                    raised = [settings.FINGER_NAMES[i] for i in range(5) if up[i]]
                    summary = f"{hand_label}: {', '.join(raised) if raised else 'none'} ({len(raised)})"
                    cv2.putText(img, summary, (10, h - 20 - idx * 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, settings.HUD_COLOR_SUMMARY, 2)

                    index_tip = pts[settings.TIP_IDS[1]]
                    smoothed_index_tip = self._smooth_point(index_tip)

                    # === Drawing logic ===
                    if up[1] and not up[2]:
                        self.missing_frames = 0
                        result = self.palette_service.check_palette_click(index_tip)
                        if result == "eraser":
                            if self.prev_draw_pt:
                                cv2.line(self.canvas, self.prev_draw_pt, smoothed_index_tip, (0,0,0), settings.ERASER_SIZE)
                            cv2.circle(self.canvas, smoothed_index_tip, settings.ERASER_SIZE//2, (0,0,0), -1)
                        elif result is not None:
                            self.draw_color = result
                        else:
                            if self.prev_draw_pt:
                                cv2.line(self.canvas, self.prev_draw_pt, smoothed_index_tip, self.draw_color, settings.BRUSH_SIZE)
                            cv2.circle(self.canvas, smoothed_index_tip, settings.BRUSH_SIZE//2, self.draw_color, -1)
                        self.prev_draw_pt = smoothed_index_tip
                        self.drawing_mode = True

                    elif up[1] and up[2] and not up[3]:
                        self.missing_frames = 0
                        self.prev_draw_pt = None
                        self.drawing_mode = False
                        self.pts_queue.clear()
                        cv2.circle(img, index_tip, 12, self.draw_color, 2)

                    elif up[1] and up[2] and up[3]:
                        self.missing_frames = 0
                        self.canvas = np.zeros((h, w, 3), dtype=np.uint8)
                        self.prev_draw_pt = None
                        self.pts_queue.clear()

                    else:
                        self.missing_frames += 1
                        if self.missing_frames > 5:
                            self.prev_draw_pt = None
                            self.drawing_mode = False
                            self.pts_queue.clear()
            else:
                self.missing_frames += 1
                if self.missing_frames > 5:
                    self.prev_draw_pt = None
                    self.drawing_mode = False
                    self.pts_queue.clear()

            # Merge canvas
            canvas_gray = cv2.cvtColor(self.canvas, cv2.COLOR_BGR2GRAY)
            _, mask = cv2.threshold(canvas_gray, 10, 255, cv2.THRESH_BINARY)
            img_bg = cv2.bitwise_and(img, img, mask=cv2.bitwise_not(mask))
            img_out = cv2.add(img_bg, self.canvas)

            self.palette_service.draw_color = self.draw_color
            self.palette_service.draw_palette(img_out)

            mode_txt = "DRAW" if self.drawing_mode else "HOVER"
            mode_color = settings.HUD_COLOR_MODE_DRAW if self.drawing_mode else settings.HUD_COLOR_MODE_HOVER
            cv2.putText(img_out, f"Mode: {mode_txt}", (w - 180, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, mode_color, 2)

            fps = 1 / (time.time() - self.pTime) if (time.time() - self.pTime) > 0 else 0
            self.pTime = time.time()
            cv2.putText(img_out, f"FPS: {int(fps)}", (w - 120, 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, settings.HUD_COLOR_FPS, 2)

            cv2.putText(img_out, settings.HINT_TEXT, (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, settings.HUD_COLOR_HINT, 1)

            cv2.imshow("Hand Pose Detection", img_out)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('c'):
                self.canvas = np.zeros((h, w, 3), dtype=np.uint8)

        self.cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    app = HandDrawingApp()
    app.run()