/**
 * colorCircles.js
 * Color circle state, drag logic, and mixing triggers
 */

export class ColorCircle {
    constructor(id, x, y, radius, color, name) {
        this.id = id;
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color; // Hex string e.g. '#FF0000'
        this.name = name;
        this.isGrabbed = false;
        this.grabbedByHandIdx = -1;
        
        this.targetX = x;
        this.targetY = y;
        this.lerpFactor = 0.15;
        
        this.pulse = 0;
        this.idleOffset = 0;
    }

    update(indexTip, handIdx) {
        // Idle animation
        this.pulse += 0.05;
        this.idleOffset = Math.sin(this.pulse) * 5;

        if (this.isGrabbed && indexTip) {
            // Follow finger tip
            this.targetX = indexTip.x;
            this.targetY = indexTip.y;
        } else if (!this.isGrabbed) {
            // Stay at last dropped position or base
            // (We keep this.targetX as the last position)
        }

        // Smooth movement
        this.x += (this.targetX - this.x) * this.lerpFactor;
        this.y += (this.targetY - this.y) * this.lerpFactor;
    }

    draw(ctx) {
        const drawY = this.y + (this.isGrabbed ? 0 : this.idleOffset);
        
        ctx.save();
        
        // Outer glow
        ctx.shadowBlur = this.isGrabbed ? 30 : 15 + Math.sin(this.pulse) * 5;
        ctx.shadowColor = this.color;
        
        // Main circle
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        
        // Border
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = '600 16px Inter';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.fillText(this.name, this.x, drawY + this.radius + 25);
        
        ctx.restore();
    }

    checkGrab(indexTip) {
        if (!indexTip) return false;
        const dx = indexTip.x - this.x;
        const dy = indexTip.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius;
    }
}

export class ColorCircleManager {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.circles = [];
        this.initCircles();
        
        this.grabTimers = new Map(); // For release delay
    }

    initCircles() {
        const radius = 75;
        const spacing = 220;
        const startX = this.width / 2 - spacing;
        const y = this.height * 0.95; // 5% higher than before

        this.circles = [
            new ColorCircle('red', startX, y, radius, '#FF0000', 'Red'),
            new ColorCircle('yellow', startX + spacing, y, radius, '#FFFF00', 'Yellow'),
            new ColorCircle('blue', startX + spacing * 3, y, radius, '#0000FF', 'Blue')
        ];
    }

    update(handTracker) {
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            const indexTip = handTracker.getIndexTip(handIdx);
            
            this.circles.forEach(circle => {
                // Grab logic
                if (indexTip && !circle.isGrabbed && circle.checkGrab(indexTip)) {
                    circle.isGrabbed = true;
                    circle.grabbedByHandIdx = handIdx;
                }

                // Update individual circle
                if (circle.isGrabbed && circle.grabbedByHandIdx === handIdx) {
                    circle.update(indexTip, handIdx);
                    
                    this.handleReleaseLogic(circle, indexTip);
                } else {
                    circle.update(null, -1);
                }
            });
        }
    }

    handleReleaseLogic(circle, indexTip) {
        if (!indexTip) {
            circle.isGrabbed = false;
            return;
        }

        // Check if still
        const lastPos = this.grabTimers.get(circle.id) || { x: indexTip.x, y: indexTip.y, time: Date.now() };
        const distMoved = Math.sqrt(Math.pow(indexTip.x - lastPos.x, 2) + Math.pow(indexTip.y - lastPos.y, 2));
        
        if (distMoved < 5) {
            if (Date.now() - lastPos.time > 500) {
                circle.isGrabbed = false;
                circle.grabbedByHandIdx = -1;
                this.grabTimers.delete(circle.id);
            }
        } else {
            this.grabTimers.set(circle.id, { x: indexTip.x, y: indexTip.y, time: Date.now() });
        }
    }

    draw(ctx) {
        this.circles.forEach(circle => circle.draw(ctx));
    }

    getOverlaps() {
        const overlaps = [];
        for (let i = 0; i < this.circles.length; i++) {
            for (let j = i + 1; j < this.circles.length; j++) {
                const c1 = this.circles[i];
                const c2 = this.circles[j];
                const dx = c1.x - c2.x;
                const dy = c1.y - c2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < c1.radius + c2.radius) {
                    overlaps.push([c1, c2]);
                }
            }
        }
        return overlaps;
    }
}
