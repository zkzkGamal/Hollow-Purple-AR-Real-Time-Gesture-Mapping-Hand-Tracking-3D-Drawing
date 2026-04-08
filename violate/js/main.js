import { HandTracker } from './handTracker.js';
import { Scene3D } from './threeScene.js';
import { OrbManager } from './orbManager.js';
import * as THREE from 'three';



class App {
    constructor() {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('overlay-canvas');
        this.threeContainer = document.getElementById('three-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.messageDisplay = document.getElementById('message-display');
        this.fpsCounter = document.getElementById('fps-counter');

        this.scene3D = new Scene3D(this.threeContainer);
        this.handTracker = new HandTracker(this.video, this.canvas);
        this.orbManager = new OrbManager(this.scene3D);

        this.lastFrameTime = 0;
        this.clock = new THREE.Clock();
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const stage = document.getElementById('ar-stage');
        const w = stage ? stage.clientWidth : window.innerWidth;
        const h = stage ? stage.clientHeight : window.innerHeight;
        this.canvas.width = w;
        this.canvas.height = h;
        
        if (this.scene3D) {
            this.scene3D.camera.aspect = w / h;
            this.scene3D.camera.updateProjectionMatrix();
            this.scene3D.renderer.setSize(w, h);
        }
    }

    async init() {
        try {
            await this.handTracker.start();
            
            // Resize now that layout is complete
            this.resizeCanvas();

            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                this.loadingOverlay.style.display = 'none';
            }, 500);

            this.animate();
        } catch (error) {
            console.error('Initialization failed:', error);
            this.messageDisplay.textContent = 'Camera access denied or MediaPipe error.';
            this.loadingOverlay.querySelector('p').textContent = 'Error: ' + error.message;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const dt = this.clock.getDelta();
        const t = this.clock.getElapsedTime();

        // 1. Update Hand Tracking (Landmarks drawn via callback in tracker)
        
        // 2. Update 3D Orbs & Interaction
        this.orbManager.update(this.handTracker, t);

        // 3. Update 3D Effects
        this.scene3D.updateHP(dt, t);

        // 4. Render 3D Scene
        this.scene3D.render();

        // 5. Update UI
        if (this.handTracker.isHandDetected()) {
            this.messageDisplay.style.opacity = '0';
        } else {
            this.messageDisplay.style.opacity = '1';
            this.messageDisplay.textContent = 'Show your hands to mix colors';
        }

        // FPS
        this.frameCount = (this.frameCount || 0) + 1;
        const now = performance.now();
        if (!this.lastFpsUpdate || now - this.lastFpsUpdate > 1000) {
            this.fpsCounter.textContent = `FPS: ${this.frameCount}`;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }
}

const app = new App();
app.init();
