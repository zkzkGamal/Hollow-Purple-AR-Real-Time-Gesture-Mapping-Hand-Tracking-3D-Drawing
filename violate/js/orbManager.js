/**
 * orbManager.js
 * Manages 3D orbs, pickup (pinch) logic, and sequential mixing
 */

import * as THREE from 'three';

// ─── Color Mix Table ────────────────────────────────────
const MIX_TABLE = {
    'red+blue':   { color: 0x800080, title: 'PURPLE' },
    'blue+red':   { color: 0x800080, title: 'PURPLE' },
    'red+green':  { color: 0xffff00, title: 'YELLOW' },
    'green+red':  { color: 0xffff00, title: 'YELLOW' },
    'blue+green': { color: 0x00ffff, title: 'CYAN' },
    'green+blue': { color: 0x00ffff, title: 'CYAN' },
    'red+white':  { color: 0xff8888, title: 'PINK' },
    'white+red':  { color: 0xff8888, title: 'PINK' },
    'red+black':  { color: 0x880000, title: 'DARK RED' },
    'black+red':  { color: 0x880000, title: 'DARK RED' },
};

function getMixResult(id1, id2, color1, color2) {
    const key = `${id1}+${id2}`;
    if (MIX_TABLE[key]) return MIX_TABLE[key];

    // If one of them is a 'mixed' orb, result is Violet
    if (id1.startsWith('mixed') || id2.startsWith('mixed')) {
        return { color: 0x4b0082, title: 'VIOLET' };  // Deep dark violet / indigo
    }

    // Fallback: blend colors
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return { color: c1.lerp(c2, 0.5).getHex(), title: 'BLEND' };
}

// ─── Orb Class ──────────────────────────────────────────
export class Orb {
    constructor(id, data, scene3D) {
        this.id = id;
        this.color = data.color;
        this.name = data.name;

        this.visuals = scene3D.makeOrb(data.color, data.lightColor);
        scene3D.scene.add(this.visuals.group);

        this.isGrabbed = false;
        this.grabbedByHandIdx = -1;

        // Base idle position
        this.idlePos = new THREE.Vector3(data.x, data.y, 0);
        this.visuals.group.position.copy(this.idlePos);

        // Each orb has its own EMA — reset each time we release
        this.visuals.ema.reset();
    }

    update(targetPos, t) {
        if (this.isGrabbed && targetPos) {
            // Follow finger with EMA
            const smoothed = this.visuals.ema.update(targetPos);
            this.visuals.group.position.copy(smoothed);
        } else {
            // Float back to idle with gentle hover
            const target = this.idlePos.clone();
            target.y += Math.sin(t * 1.8 + this.idlePos.x) * 0.15;
            this.visuals.group.position.lerp(target, 0.08);
        }

        // Always animate particles and pulse
        this._animate(t);
    }

    _animate(t) {
        this.visuals.core.scale.setScalar(1 + 0.1 * Math.sin(t * 7 + this.idlePos.x));

        const pa = this.visuals.pts.geometry.attributes.position;
        const { phase, rad, spd } = this.visuals.pts.userData;
        const N = phase.length;
        for (let i = 0; i < N; i++) {
            const tt = (t + phase[i]) * spd[i];
            const r = rad[i] * (1.0 + 0.4 * Math.abs(Math.sin(tt * 0.7)));
            pa.array[i*3]   = r * Math.sin(tt * 1.3) * Math.cos(tt * 0.8 + phase[i]);
            pa.array[i*3+1] = r * Math.cos(tt * 1.3);
            pa.array[i*3+2] = r * Math.sin(tt * 1.3) * Math.sin(tt * 0.8 + phase[i]);
        }
        pa.needsUpdate = true;
    }

    checkGrab(handPos) {
        if (!handPos) return false;
        return this.visuals.group.position.distanceTo(handPos) < 2.0;
    }

    release() {
        this.isGrabbed = false;
        this.grabbedByHandIdx = -1;
        // Lock idle position to current so it stays where dropped
        this.idlePos.copy(this.visuals.group.position);
        this.visuals.ema.reset();
    }

    destroy(scene3D) {
        scene3D.scene.remove(this.visuals.group);
    }
}

// ─── OrbManager Class ───────────────────────────────────
export class OrbManager {
    constructor(scene3D) {
        this.scene3D = scene3D;
        this.orbs = [];
        this.mixing = false; // prevent double mix in same frame
        this.reset();
    }

    reset() {
        this.orbs.forEach(o => o.destroy(this.scene3D));
        this.orbs = [];
        this.mixing = false;

        // 5 colors in a beautiful arc at the bottom
        const configs = [
            { id: 'red',   color: 0xff0000, lightColor: 0xff4444, name: 'Red',   x: -4.0, y: -3.0 },
            { id: 'blue',  color: 0x0044ff, lightColor: 0x4488ff, name: 'Blue',  x: -2.0, y: -3.5 },
            { id: 'green', color: 0x00cc44, lightColor: 0x44ff88, name: 'Green', x:  0.0, y: -3.8 },
            { id: 'black', color: 0x111111, lightColor: 0x555555, name: 'Black', x:  2.0, y: -3.5 },
            { id: 'white', color: 0xffffff, lightColor: 0xffffff, name: 'White', x:  4.0, y: -3.0 },
        ];

        for (const cfg of configs) {
            this.orbs.push(new Orb(cfg.id, cfg, this.scene3D));
        }
    }

    update(handTracker, t) {
        // --- Update pinch state per hand ---
        for (let i = 0; i < 2; i++) {
            const indexLM = handTracker.getIndexTipRaw(i);
            const thumbLM = handTracker.getThumbTipRaw(i);
            if (!indexLM || !thumbLM) {
                // Release any orbs held by this hand if hand lost
                this.orbs.filter(o => o.isGrabbed && o.grabbedByHandIdx === i)
                         .forEach(o => o.release());
                continue;
            }

            const indexWP = this.scene3D.toWorld(indexLM);
            const thumbWP = this.scene3D.toWorld(thumbLM);
            const pinchDist = indexWP.distanceTo(thumbWP);
            const isPinching = pinchDist < 0.8;

            if (isPinching) {
                // Try to grab an orb if hand not already holding one
                const alreadyHolding = this.orbs.find(o => o.isGrabbed && o.grabbedByHandIdx === i);
                if (!alreadyHolding) {
                    // Find closest ungrabbed orb within range
                    let closest = null, closestDist = Infinity;
                    for (const orb of this.orbs) {
                        if (orb.isGrabbed) continue;
                        const d = orb.visuals.group.position.distanceTo(indexWP);
                        if (d < orb.checkGrab(indexWP) && d < closestDist) { // note: checkGrab returns bool, let's do it right
                            closestDist = d;
                            closest = orb;
                        }
                    }
                    // simpler rewrite:
                    for (const orb of this.orbs) {
                        if (orb.isGrabbed) continue;
                        if (orb.checkGrab(indexWP)) {
                            orb.isGrabbed = true;
                            orb.grabbedByHandIdx = i;
                            orb.visuals.ema.reset(); // start fresh
                            break; // only one at a time
                        }
                    }
                }
            } else {
                // Release
                this.orbs.filter(o => o.isGrabbed && o.grabbedByHandIdx === i)
                         .forEach(o => o.release());
            }
        }

        // --- Update orb positions ---
        for (const orb of this.orbs) {
            let target = null;
            if (orb.isGrabbed) {
                const rawLM = handTracker.getIndexTipRaw(orb.grabbedByHandIdx);
                if (rawLM) target = this.scene3D.toWorld(rawLM);
                else orb.release();
            }
            orb.update(target, t);
        }

        // --- Check collisions ---
        if (!this.mixing) {
            this._checkCollisions();
        }
    }

    _checkCollisions() {
        for (let i = 0; i < this.orbs.length; i++) {
            for (let j = i + 1; j < this.orbs.length; j++) {
                const a = this.orbs[i];
                const b = this.orbs[j];
                if (!a.isGrabbed && !b.isGrabbed) continue; // at least one must be moving
                const dist = a.visuals.group.position.distanceTo(b.visuals.group.position);
                if (dist < 1.2) {
                    this.mixing = true;
                    setTimeout(() => { this.mixing = false; }, 500);
                    this._mix(a, b);
                    return;
                }
            }
        }
    }

    _mix(o1, o2) {
        const mid = new THREE.Vector3()
            .addVectors(o1.visuals.group.position, o2.visuals.group.position)
            .multiplyScalar(0.5);

        const { color: mixedColor, title } = getMixResult(o1.id, o2.id, o1.color, o2.color);

        // Show title popup
        this._showPopup(title, mixedColor);

        // Smooth ripple animation (no explosion)
        this.scene3D.triggerSmoothMix(mid, mixedColor);

        // Remove both orbs from scene
        const ids = [o1.id, o2.id];
        this.orbs = this.orbs.filter(o => !ids.includes(o.id));
        o1.destroy(this.scene3D);
        o2.destroy(this.scene3D);

        // Create new mixed orb at midpoint
        const newOrb = new Orb('mixed-' + Date.now(), {
            color: mixedColor,
            lightColor: mixedColor,
            name: title,
            x: mid.x,
            y: mid.y
        }, this.scene3D);
        this.orbs.push(newOrb);

        // Auto-reset after last orb is mixed down to 1
        if (this.orbs.length === 1) {
            setTimeout(() => this.reset(), 5000);
        }
    }

    _showPopup(text, colorHex) {
        const stage = document.getElementById('ar-stage') || document.body;
        const div = document.createElement('div');
        div.className = 'mix-title';
        div.textContent = text;

        // Color the title text to match the mix
        const hex = '#' + colorHex.toString(16).padStart(6, '0');
        div.style.color = hex;
        div.style.textShadow = `0 0 30px ${hex}, 0 0 60px ${hex}`;

        stage.appendChild(div);
        setTimeout(() => div.remove(), 2200);
    }
}
