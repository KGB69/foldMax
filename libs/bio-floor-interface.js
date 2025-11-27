/**
 * Bio-Digital Floor Interface
 * Renders bio-themed circular interface to canvas for 3D floor texture
 * Ported from bio-digital-core-interface (React) to Vanilla JS
 */

(function () {
    'use strict';

    class BioFloorInterface {
        constructor() {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 2048;
            this.canvas.height = 2048;
            this.ctx = this.canvas.getContext('2d');

            this.isActive = false;
            this.rotation = 0;
            this.animationId = null;

            // Colors (bio-digital theme)
            this.colors = {
                cyan: '#06b6d4',
                emerald: '#34d399',
                pink: '#ec4899',
                purple: '#a855f7',
                bg: '#02040a',
                bgLight: '#050510'
            };

            this.init();
        }

        init() {
            this.render();
            this.startAnimation();
        }

        render() {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Clear canvas
            ctx.fillStyle = this.colors.bg;
            ctx.fillRect(0, 0, w, h);

            // Draw hexagonal grid background
            this.drawHexGrid(ctx, w, h);

            // Draw concentric rings
            this.drawOuterOrganicRing(ctx, cx, cy);
            this.drawMiddleCircuitRing(ctx, cx, cy);
            this.drawInnerTechRing(ctx, cx, cy);
            this.drawCoreCenter(ctx, cx, cy);

            // Add vignette
            this.drawVignette(ctx, w, h);
        }

        drawHexGrid(ctx, w, h) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = this.colors.cyan;
            ctx.lineWidth = 2;

            const hexSize = 30;
            const hexHeight = hexSize * Math.sqrt(3);

            for (let row = 0; row < h / hexHeight + 2; row++) {
                for (let col = 0; col < w / (hexSize * 1.5) + 2; col++) {
                    const x = col * hexSize * 1.5;
                    const y = row * hexHeight + (col % 2) * (hexHeight / 2);

                    this.drawHexagon(ctx, x, y, hexSize);
                }
            }

            ctx.restore();
        }

        drawHexagon(ctx, x, y, size) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = x + size * Math.cos(angle);
                const hy = y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(hx, hy);
                } else {
                    ctx.lineTo(hx, hy);
                }
            }
            ctx.closePath();
            ctx.stroke();

            // Center dot
            ctx.fillStyle = this.colors.cyan;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        drawOuterOrganicRing(ctx, cx, cy) {
            ctx.save();
            const radius = 500;

            ctx.translate(cx, cy);
            ctx.rotate(this.rotation * 0.3);

            // DNA helix style ring
            ctx.strokeStyle = this.colors.emerald;
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.6;

            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Organic segments
            const segments = 24;
            for (let i = 0; i < segments; i++) {
                const angle = (Math.PI * 2 / segments) * i;
                const x1 = Math.cos(angle) * (radius - 20);
                const y1 = Math.sin(angle) * (radius - 20);
                const x2 = Math.cos(angle) * (radius + 20);
                const y2 = Math.sin(angle) * (radius + 20);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            ctx.restore();
        }

        drawMiddleCircuitRing(ctx, cx, cy) {
            ctx.save();
            const radius = 360;

            ctx.translate(cx, cy);
            ctx.rotate(-this.rotation * 0.5);

            // Circuit pattern ring
            ctx.strokeStyle = this.colors.cyan;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.7;

            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Circuit nodes
            const nodes = 16;
            for (let i = 0; i < nodes; i++) {
                const angle = (Math.PI * 2 / nodes) * i;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                // Node
                ctx.fillStyle = this.colors.cyan;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fill();

                // Connection lines
                ctx.strokeStyle = this.colors.cyan;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x * 0.9, y * 0.9);
                ctx.lineTo(x * 1.1, y * 1.1);
                ctx.stroke();
            }

            ctx.restore();
        }

        drawInnerTechRing(ctx, cx, cy) {
            ctx.save();
            const radius = 220;

            ctx.translate(cx, cy);
            ctx.rotate(this.rotation * 0.7);

            // Tech aperture ring
            ctx.strokeStyle = this.colors.pink;
            ctx.lineWidth = 6;
            ctx.globalAlpha = 0.5;

            const segments = 8;
            const gapAngle = Math.PI / 32;
            const segmentAngle = (Math.PI * 2 / segments) - gapAngle;

            for (let i = 0; i < segments; i++) {
                const startAngle = (Math.PI * 2 / segments) * i + gapAngle / 2;
                const endAngle = startAngle + segmentAngle;

                ctx.beginPath();
                ctx.arc(0, 0, radius, startAngle, endAngle);
                ctx.stroke();
            }

            ctx.restore();
        }

        drawCoreCenter(ctx, cx, cy) {
            ctx.save();

            // Glowing nucleus
            const radius = 100;

            // Outer glow
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
            gradient.addColorStop(0, this.isActive ? 'rgba(52, 211, 153, 0.8)' : 'rgba(6, 182, 212, 0.4)');
            gradient.addColorStop(0.5, this.isActive ? 'rgba(236, 72, 153, 0.4)' : 'rgba(6, 182, 212, 0.2)');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Core circle
            const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            coreGradient.addColorStop(0, this.isActive ? this.colors.pink : this.colors.cyan);
            coreGradient.addColorStop(1, this.isActive ? this.colors.purple : this.colors.emerald);

            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner pulse
            if (this.isActive) {
                const pulseSize = radius * 0.8 + Math.sin(this.rotation * 5) * 10;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        drawVignette(ctx, w, h) {
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.7, 'transparent');
            gradient.addColorStop(1, this.colors.bg);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        startAnimation() {
            const animate = () => {
                this.rotation += 0.005;
                this.render();
                this.animationId = requestAnimationFrame(animate);
            };
            animate();
        }

        stopAnimation() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }

        toggle() {
            this.isActive = !this.isActive;
            this.render();
        }

        getCanvas() {
            return this.canvas;
        }

        destroy() {
            this.stopAnimation();
        }
    }

    // Export globally
    window.BioFloorInterface = BioFloorInterface;

})();
