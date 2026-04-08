/**
 * threeScene.js
 * Premium 3D visuals inspired by Hollow Purple project
 */

import * as THREE from 'three';

const CFG = {
    FOV: 60,
    CAMERA_Z: 10,
    WORLD_X: 11,  // half-width of visible frustum at z=0
    WORLD_Y: 8.5, // half-height of visible frustum at z=0
    EMA: 0.15,
    PARTICLES: 100
};

export class EMA {
    constructor(a = CFG.EMA) { this.a = a; this.v = null; }
    update(vec) {
        if (!this.v) this.v = vec.clone();
        else this.v.lerp(vec, this.a);
        return this.v.clone();
    }
    reset() { this.v = null; }
}

export class Scene3D {
    constructor(container) {
        this.container = container;
        // Use window dimensions initially — container may have 0 size before CSS layout
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(CFG.FOV, w / h, 0.1, 100);
        this.camera.position.z = CFG.CAMERA_Z;

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.AmbientLight(0xffffff, 2));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(0, 5, 5);
        this.scene.add(dirLight);

        this.hpEffect = null;
        this.ripples = [];
    }

    onResize(w, h) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    toWorld(lm) {
        // Map normalized landmark (0..1) to Three.js world space
        // X is negated because webcam is mirrored (selfieMode:false)
        return new THREE.Vector3(
            (0.5 - lm.x) * CFG.WORLD_X,
            (0.5 - lm.y) * CFG.WORLD_Y,
            lm.z * -5
        );
    }

    makeOrb(colorHex, lightColorHex) {
        const group = new THREE.Group();
        const color = new THREE.Color(colorHex);
        const lightColor = new THREE.Color(lightColorHex);

        // Force minimum brightness for dark colors (black/dark)
        const brightness = color.r + color.g + color.b;
        const emissiveColor = brightness < 0.1 ? new THREE.Color(0x444444) : color;

        // Core sphere
        const coreMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissiveColor,
            emissiveIntensity: 3.0,
            roughness: 0.1,
            metalness: 0.9,
            transparent: false
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), coreMat);
        group.add(core);

        // Halos
        const halos = [[0.9, 0.35], [1.4, 0.18], [2.2, 0.08], [3.2, 0.03]];
        for (const [r, op] of halos) {
            const haloBrightness = lightColor.r + lightColor.g + lightColor.b;
            const haloColor = haloBrightness < 0.3 ? new THREE.Color(0x888888) : lightColor;
            const m = new THREE.MeshBasicMaterial({
                color: haloColor, transparent: true, opacity: op,
                side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            group.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), m));
        }

        // Light
        const light = new THREE.PointLight(lightColor, 6, 15);
        group.add(light);

        // Ambient particles orbiting the core
        const N = CFG.PARTICLES;
        const pos = new Float32Array(N * 3);
        const phase = new Float32Array(N);
        const rad = new Float32Array(N);
        const spd = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            phase[i] = Math.random() * Math.PI * 2;
            rad[i]   = 0.4 + Math.random() * 0.8;
            spd[i]   = 0.5 + Math.random() * 1.2;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const particleColor = brightness < 0.1 ? new THREE.Color(0xaaaaaa) : lightColor;
        const pMat = new THREE.PointsMaterial({
            color: particleColor, size: 0.07, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        });
        const pts = new THREE.Points(pGeo, pMat);
        pts.userData = { phase, rad, spd };
        group.add(pts);

        return { group, core, coreMat, light, pts, ema: new EMA() };
    }

    updateOrb(orb, worldPos, t) {
        // EMA smooth into target position
        const smoothed = orb.ema.update(worldPos);
        orb.group.position.copy(smoothed);

        // Pulse core
        orb.core.scale.setScalar(1 + 0.1 * Math.sin(t * 8));

        // Animate particles
        const pa = orb.pts.geometry.attributes.position;
        const { phase, rad, spd } = orb.pts.userData;
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

    /**
     * Smooth merge animation: ripple rings that expand outward and fade
     * No explosion. Pure cinematic color wave.
     */
    triggerSmoothMix(pos, colorHex) {
        // Clean up last effect
        if (this.hpEffect) {
            this.scene.remove(this.hpEffect.grp);
            this.hpEffect = null;
        }

        const color = new THREE.Color(colorHex);
        const grp = new THREE.Group();
        grp.position.copy(pos);
        this.scene.add(grp);

        // Ripple rings
        const rings = [];
        const ringCount = 5;
        for (let i = 0; i < ringCount; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 8, 48), mat);
            ring.rotation.x = Math.PI / 2;
            ring.userData.delay = i * 0.18; // each ring starts a bit later
            grp.add(ring);
            rings.push({ mesh: ring, mat });
        }

        // Central soft glow that fades in and out
        const glowMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), glowMat);
        grp.add(glow);

        this.hpEffect = { grp, rings, glow, glowMat, life: 2.0, totalLife: 2.0 };
    }

    updateHP(dt, t) {
        if (!this.hpEffect) return;
        this.hpEffect.life -= dt;
        const l = Math.max(0, this.hpEffect.life);
        const progress = 1 - (l / this.hpEffect.totalLife); // 0 → 1

        // Central glow: peaks at 30% then fades
        const glowPeak = Math.sin(progress * Math.PI);
        this.hpEffect.glowMat.opacity = glowPeak * 0.7;
        this.hpEffect.glow.scale.setScalar(1 + progress * 3);

        // Ripple rings: each one expanding outward at a staggered pace
        for (const r of this.hpEffect.rings) {
            const localP = Math.max(0, progress - r.mesh.userData.delay);
            const localClamped = Math.min(localP / 0.6, 1); // each ring completes in 60% of total time
            const scale = 1 + localClamped * 12;
            const opacity = (1 - localClamped) * 0.9;
            r.mesh.scale.setScalar(scale);
            r.mat.opacity = Math.max(0, opacity);
        }

        if (l <= 0) {
            this.scene.remove(this.hpEffect.grp);
            this.hpEffect = null;
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
