# 🌌 Hand Pose & AR Drawing Suite

A comprehensive suite of computer-vision applications that blend real-time hand gesture recognition with interactive 2D drawing and immersive 3D Augmented Reality (AR) effects.

---

## 🟣 Hollow Purple AR (Standalone)
**The Ultimate JJK Experience.** This standalone web application uses state-of-the-art hand tracking to simulate Gojo Satoru's legendary "Hollow Purple" technique directly in your browser.

### ✨ Key Features
- **🎯 Anime-Accurate Tracking**: Energy orbs are precisely anchored to your **index fingertips**, mirroring the anime's iconic stance.
- **⚡ High-Performance AR**: Leverages **MediaPipe JS** and **Three.js** for 60FPS tracking and rendering without a backend.
- **🎬 Cinematic Visuals**: Multi-layered glow halos, turbulent particles, and procedural shockwave animations for an authentic "Imaginary Mass" feel.
- **🪞 Natural Mirroring**: Fully mirrored coordinate space for intuitive, mirror-like interaction.

### 🛠️ Tech Stack
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **Tracking**: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
- **3D Engine**: [Three.js](https://threejs.org/)
- **Server**: Python (SSL/HTTPS for secure camera context)

---

## 🎨 Hand Pose Drawing (Legacy)
An interactive 2D whiteboard that allows you to paint in the air using simple hand gestures.

### 🎮 Controls & Gestures
| Action | Gesture | Description |
| :--- | :--- | :--- |
| **Draw** | ☝️ Index + 👍 Thumb UP | Starts drawing a line following your index finger. |
| **Hover** | ☝️ Index + ✌️ Middle UP | Move the cursor without drawing. |
| **Clear** | 🖐️ All 5 Fingers UP | Instantly wipes the canvas clean. |
| **Color** | 👈 Point at Palette | Change brush color or select the eraser. |

---

## 🎹 Play Piano AR
An interactive virtual piano application that lets you play synthesised keys by tapping on them in the air using MediaPipe tracking and OpenCV.

### 🧩 Modules Included
- **`settings.py`**: Configuration for piano layout (white and black keys), screen dimensions, and MediaPipe logic.
- **`PianoKeyboard.py`**: Handles drawing both white and black keys overlapping onto the OpenCV canvas, and prioritizing hit-detection.
- **`SoundManager.py`**: Wraps `pygame.mixer` to ensure overlapping key sound playback with low latency.
- **`generate_tones.py`**: A utility script to computationally generate the ADSR `.wav` sound frequencies for standard pitches and sharps (black keys).
- **`main.py`**: The orchestrator that launches the camera, executes the tracking loop, tests fingertips against boundaries, and triggers the audio.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Installation & Run

#### Option A: Standalone AR (Recommended)
This is the most modern version of the project.
```bash
# Navigate to the AR folder
cd hollow-purple

# Start the secure HTTPS server
python serve_https.py
```
1. Open **`https://localhost:8443`** in Chrome/Edge.
2. Click **Advanced → Proceed to localhost** (Bypass self-signed certificate warning).
3. Click **Activate Camera** and start pointing!

#### Option B: 2D Drawing App
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

#### Option C: Play Piano AR
```bash
pip install -r requirements.txt
# Navigate to the piano folder
cd playpiano

# Run the piano app
python generate_tones.py
python main.py
```

---

## 📦 Requirements
The core Python requirements are listed in `requirements.txt`:
- `opencv-python`
- `mediapipe`
- `numpy`
- `pygame` (for Play Piano audio)

---

## 🤝 Acknowledgments
- Inspired by the *Jujutsu Kaisen* anime series.
- Powered by Google's MediaPipe tracking solutions.
# Hollow-Purple-AR-Real-Time-Gesture-Mapping-Hand-Tracking-3D-Drawing
