<div align="center">

# 🌌 Hand Pose AR Suite

**Real-time hand gesture recognition meets immersive 3D augmented reality.**  
A collection of browser-based and desktop applications powered by MediaPipe & Three.js.

[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-blue?style=for-the-badge&logo=google)](https://google.github.io/mediapipe/solutions/hands.html)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Engine-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8%2B-yellow?style=for-the-badge&logo=python)](https://www.python.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-green?style=for-the-badge&logo=opencv)](https://opencv.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

</div>

---

## 📦 Projects Overview

| Project | Type | Stack | Description |
|---|---|---|---|
| [🟣 Hollow Purple AR](#-hollow-purple-ar) | Browser | MediaPipe JS + Three.js | JJK-inspired 3D energy orb AR effect |
| [🎨 Violate — Color Mixer](#-violate--color-mixer) | Browser | MediaPipe JS + Three.js | Hand-controlled 3D color mixing experience |
| [✏️ Hand Pose Drawing](#%EF%B8%8F-hand-pose-drawing) | Desktop | Python + OpenCV + MediaPipe | Air-drawing canvas with gesture controls |
| [🎹 Play Piano AR](#-play-piano-ar) | Desktop | Python + OpenCV + Pygame | Touch-free virtual piano with real sounds |

---

## 🟣 Hollow Purple AR

> *"The convergence of infinity..."*

A standalone, real-time browser AR experience that simulates **Gojo Satoru's Hollow Purple** technique from *Jujutsu Kaisen*. Energy orbs track your index fingertips and explode in cinematic shockwaves when they collide.

### ✨ Features
- 🎯 **Fingertip-anchored Orbs** — Blue & Red energy orbs that follow your index fingers with EMA smoothing
- ⚡ **No Backend Needed** — Runs entirely in the browser at 60FPS
- 🌀 **Shockwave Explosion FX** — Multi-ring shockwaves + particle burst on collision
- 🪞 **Mirrored Coordinate Space** — Natural, intuitive interaction

### 🛠️ Tech Stack
`HTML5` `CSS3` `Vanilla JS (ES Modules)` `MediaPipe Hands` `Three.js` `Python (HTTPS server)`

### 🚀 Run It
```bash
cd hollow-purple
python serve_https.py
# Open https://localhost:8443 in Chrome/Edge
```

---

## 🎨 Violate — Color Mixer

> *"Mix reality. One pinch at a time."*

A **TikTok/YouTube Shorts-ready** browser AR experience where you mix 3D color energy orbs by pinching your fingers and bringing them together. Watch colors blend with smooth ripple animations and cinematic title popups.

### ✨ Features
- 🤌 **Pinch-to-Grab** — Pinch index + thumb to grab an orb, release to drop it anywhere
- 🌈 **5 Base Colors** — Red, Blue, Green, Black, White — each as a glowing 3D orb
- 🔀 **Sequential Mixing** — Red + Blue = **Purple** · Purple + Green = **Violet**
- 🌊 **Smooth Ripple FX** — Staggered expanding ring animation on every mix (no explosion)
- 🏷️ **Cinematic Titles** — Animated color-matched title popups for every merge result
- 📱 **Vertical-Optimized** — Designed for 9:16 screen recording (TikTok / Shorts)

### 🔬 Color Rules
| Mix | Result | Hex |
|---|---|---|
| Red + Blue | Purple | `#800080` |
| Red + Green | Yellow | `#ffff00` |
| Blue + Green | Cyan | `#00ffff` |
| Red + White | Pink | `#ff8888` |
| Purple + any | Violet | `#8a2be2` |

### 🛠️ Tech Stack
`HTML5` `CSS3` `Vanilla JS (ES Modules)` `MediaPipe Hands` `Three.js`

### 🚀 Run It
```bash
cd violate
# Serve with any local HTTP server (needs camera access)
npx serve .
# Or: python -m http.server 8080
# Open http://localhost:8080
```

---

## ✏️ Hand Pose Drawing

> *"Paint in the air."*

An interactive 2D drawing canvas controlled entirely by hand gestures. No mouse, no touch screen — just your hand in front of a webcam.

### 🎮 Gesture Controls
| Gesture | Action |
|---|---|
| ☝️ Index finger up | Draw on canvas |
| ✌️ Index + Middle up | Hover / Move without drawing |
| 🖐️ All 5 fingers up | Clear canvas instantly |
| 👈 Point at palette | Select color or eraser |

### ✨ Features
- 🖌️ **Smooth Drawing** — Uses a rolling average queue to eliminate jitter
- 🎨 **Color Palette** — Live palette rendered in-frame for quick color switching
- 🚀 **GPU Acceleration** — Automatically tries GPU inference, falls back to CPU
- 🖥️ **Optimized for Linux** — Uses V4L2 backend + MJPG codec for low-latency capture

### 🛠️ Tech Stack
`Python 3.8+` `OpenCV` `MediaPipe Tasks` `NumPy`

### 🚀 Run It
```bash
pip install -r requirements.txt
python main.py
```

---

## 🎹 Play Piano AR

> *"Touch the invisible keys."*

A virtual piano that detects your fingertip positions and plays synthesized notes when you "tap" keys in mid-air. Supports black keys (sharps/flats) and polyphonic (simultaneous) playback.

### ✨ Features
- 🎵 **Full Octave Layout** — White and black keys rendered over OpenCV canvas
- 🔊 **Low-Latency Audio** — Pygame mixer with overlapping note support
- 🎼 **ADSR Tone Generation** — Generates realistic `.wav` files from scratch
- 👆 **Precise Hit Detection** — Prioritizes black keys over white for accurate playing

### 📁 Module Structure
| File | Purpose |
|---|---|
| `main.py` | Orchestrates camera loop, tracking & key triggering |
| `PianoKeyboard.py` | Renders keyboard, handles hit-box detection |
| `SoundManager.py` | Wraps `pygame.mixer` for polyphonic playback |
| `generate_tones.py` | Generates ADSR `.wav` tone files |
| `settings.py` | Layout config (keys, dimensions, colors) |

### 🛠️ Tech Stack
`Python 3.8+` `OpenCV` `MediaPipe` `Pygame` `NumPy`

### 🚀 Run It
```bash
pip install -r requirements.txt
cd playpiano
python generate_tones.py  # One-time: generate sound files
python main.py
```

---

## 🧰 Requirements

### Python Apps (Drawing + Piano)
```bash
pip install -r requirements.txt
```
```
opencv-python
mediapipe
numpy
pygame
```

### Browser Apps (Hollow Purple + Violate)
No installation required. Just serve the folder over HTTP/HTTPS.

> ⚠️ **Camera Access**: Browsers require HTTPS or `localhost` for webcam access.  
> For Hollow Purple, use the included `serve_https.py` (self-signed SSL).  
> For Violate, any local server on `localhost` works.

---

## 🎬 Compatibility

| Browser | Supported |
|---|---|
| Chrome 90+ | ✅ Recommended |
| Edge 90+ | ✅ |
| Firefox | ⚠️ May have webcam issues |
| Safari | ❌ WebGL + Camera limitations |

---

## 🤝 Acknowledgments

- 🟣 Inspired by **Gojo Satoru** from *Jujutsu Kaisen* (Gege Akutami / MAPPA)
- 🔎 Powered by **Google MediaPipe** — open-source ML pipeline framework
- 🌐 3D rendering via **Three.js** — cross-browser WebGL library
- 🎹 Audio synthesis concepts from ADSR envelope theory

---

<div align="center">

**Built with 🖐️ and way too much caffeine.**

[![Stars](https://img.shields.io/github/stars/zkzkGamal/Hollow-Purple-AR-Real-Time-Gesture-Mapping-Hand-Tracking-3D-Drawing?style=social)](https://github.com/zkzkGamal/Hollow-Purple-AR-Real-Time-Gesture-Mapping-Hand-Tracking-3D-Drawing)

</div>
