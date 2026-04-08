/**
 * handTracker.js
 * MediaPipe Hands setup and landmark logic
 */

export class HandTracker {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
            selfieMode: false
        });

        this.onResultsCallback = null;
        this.hands.onResults(this.onResults.bind(this));

        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: videoElement });
            },
            width: 1280,
            height: 720
        });

        this.latestResults = null;
    }

    async start() {
        await this.camera.start();
    }

    onResults(results) {
        this.latestResults = results;
        if (this.onResultsCallback) {
            this.onResultsCallback(results);
        }
        this.drawLandmarks(results);
    }

    drawLandmarks(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Mirror the canvas context to align with mirrored webcam
        this.canvasCtx.translate(this.canvasElement.width, 0);
        this.canvasCtx.scale(-1, 1);

        if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach((landmarks) => {
                // Draw skeleton using raw landmarks (aligned because context is mirrored)
                drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
                    color: 'rgba(255, 255, 255, 0.4)',
                    lineWidth: 1
                });
                
                // Draw dots (landmarks)
                for (let i = 0; i < landmarks.length; i++) {
                    const landmark = landmarks[i];
                    const x = landmark.x * this.canvasElement.width;
                    const y = landmark.y * this.canvasElement.height;
                    
                    this.canvasCtx.beginPath();
                    this.canvasCtx.arc(x, y, i === 8 ? 2 : 1, 0, 2 * Math.PI);
                    this.canvasCtx.fillStyle = i === 8 ? 'rgba(255, 62, 62, 1)' : 'rgba(255, 255, 255, 0.8)';
                    this.canvasCtx.fill();
                }
            });
        }
        this.canvasCtx.restore();
    }

    getIndexTipRaw(handIndex = 0) {
        if (!this.latestResults || !this.latestResults.multiHandLandmarks || this.latestResults.multiHandLandmarks.length <= handIndex) {
            return null;
        }
        return this.latestResults.multiHandLandmarks[handIndex][8]; // Index tip
    }

    getThumbTipRaw(handIndex = 0) {
        if (!this.latestResults || !this.latestResults.multiHandLandmarks || this.latestResults.multiHandLandmarks.length <= handIndex) {
            return null;
        }
        return this.latestResults.multiHandLandmarks[handIndex][4]; // Thumb tip
    }

    getIndexTipPixels(handIndex = 0) {
        const landmark = this.getIndexTipRaw(handIndex);
        if (!landmark) return null;
        return {
            x: (1 - landmark.x) * this.canvasElement.width,
            y: landmark.y * this.canvasElement.height,
            z: landmark.z
        };
    }

    getHandLabel(handIndex = 0) {
        if (!this.latestResults || !this.latestResults.multiHandedness || this.latestResults.multiHandedness.length <= handIndex) {
            return 'Unknown';
        }
        // MediaPipe's handedness assumes mirrored image.
        // If user wants to swap them:
        const label = this.latestResults.multiHandedness[handIndex].label;
        return label === 'Left' ? 'Right' : 'Left';
    }

    isHandDetected() {
        return this.latestResults && this.latestResults.multiHandLandmarks && this.latestResults.multiHandLandmarks.length > 0;
    }
}
