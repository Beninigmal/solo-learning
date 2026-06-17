import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';

export function ThreeParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 35;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const container = containerRef.current;
    container.appendChild(renderer.domElement);

    // 4. Create Particles
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const particleData: Array<{
      x: number;
      y: number;
      z: number;
      speedY: number;
      swayAmp: number;
      swayFreq: number;
      phase: number;
      baseColor: THREE.Color;
    }> = [];

    const colorOrange = new THREE.Color('#ff6a00');
    const colorWhite = new THREE.Color('#ffffff');
    const colorRed = new THREE.Color('#ff2a00');
    const colorYellow = new THREE.Color('#ffcc00');
    
    const bottomLimit = -28;
    const topLimit = 28;

    for (let i = 0; i < particleCount; i++) {
      // Spawn particles distributed across vertical viewport
      const x = (Math.random() - 0.5) * 45;
      const y = bottomLimit + Math.random() * (topLimit - bottomLimit);
      const z = (Math.random() - 0.5) * 20;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Select random ember color
      const mixRatio = Math.random();
      const baseColor = new THREE.Color();
      if (mixRatio < 0.2) {
        baseColor.copy(colorWhite).lerp(colorYellow, Math.random());
      } else if (mixRatio < 0.6) {
        baseColor.copy(colorYellow).lerp(colorOrange, Math.random());
      } else {
        baseColor.copy(colorOrange).lerp(colorRed, Math.random());
      }

      // Start particles fully invisible
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;

      particleData.push({
        x, y, z,
        speedY: Math.random() * 0.08 + 0.08, // float speed
        swayAmp: Math.random() * 2.5 + 0.5,
        swayFreq: Math.random() * 0.001 + 0.0006,
        phase: Math.random() * Math.PI * 2,
        baseColor,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom glowing radial gradient canvas texture
    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = 32;
    canvasTexture.height = 32;
    const ctx = canvasTexture.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');     // White hot core
      gradient.addColorStop(0.18, 'rgba(255, 200, 50, 0.9)');    // Yellow glow
      gradient.addColorStop(0.45, 'rgba(255, 90, 0, 0.65)');     // Soft orange glow
      gradient.addColorStop(0.75, 'rgba(230, 20, 0, 0.2)');      // Reddish fuzzy edge
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');              // Transparent boundary
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvasTexture);

    const material = new THREE.PointsMaterial({
      size: 2.8,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // 5. Animation loop
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const elapsedTime = clock.getElapsedTime() * 1000;
      const positionsArr = geometry.attributes.position.array as Float32Array;
      const colorsArr = geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const data = particleData[i];
        
        // Rise upwards
        data.y += data.speedY;

        // Reset if goes beyond top limit
        if (data.y > topLimit) {
          data.y = bottomLimit;
          data.x = (Math.random() - 0.5) * 45;
          data.z = (Math.random() - 0.5) * 20;
        }

        // Sway movement
        const t = elapsedTime * data.swayFreq + data.phase;
        const currentX = data.x + Math.sin(t) * data.swayAmp;
        const currentZ = data.z + Math.cos(t * 0.85) * (data.swayAmp * 0.5);

        // Update Position
        positionsArr[i * 3] = currentX;
        positionsArr[i * 3 + 1] = data.y;
        positionsArr[i * 3 + 2] = currentZ;

        // Calculate fading color (fade in from bottom, fade out at top)
        const lifeRatio = (data.y - bottomLimit) / (topLimit - bottomLimit);
        let fade = 1.0;
        if (lifeRatio < 0.2) {
          fade = lifeRatio / 0.2; // Fade in smoothly from 0 to 20%
        } else if (lifeRatio > 0.8) {
          fade = (1.0 - lifeRatio) / 0.2; // Fade out smoothly from 80% to 100%
        } else {
          fade = 1.0;
        }

        // Apply a global subtle twinkle based on phase
        fade *= 0.7 + 0.3 * Math.sin(t * 3.0);

        // Adjust RGB intensity based on fade
        colorsArr[i * 3] = data.baseColor.r * fade;
        colorsArr[i * 3 + 1] = data.baseColor.g * fade;
        colorsArr[i * 3 + 2] = data.baseColor.b * fade;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      // Rotate particle cloud slowly
      points.rotation.y += 0.0006;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.style.display = 'none'; // Force hide immediately
      }
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose(); // CRITICAL: Free WebGL context
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({});
