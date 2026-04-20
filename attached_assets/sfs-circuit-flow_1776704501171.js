/**
 * SFS CIRCUIT-FLOW ANIMATION
 * Golden animated circuit pattern background
 *
 * Usage:
 * <canvas id="sfs-circuit"></canvas>
 * <script src="path/to/sfs-circuit-flow.js"></script>
 */

(function() {
  'use strict';

  const CircuitFlow = {
    canvas: null,
    ctx: null,
    particles: [],
    nodes: [],
    mouse: { x: null, y: null },
    config: {
      particleCount: 80,
      nodeCount: 30,
      particleSpeed: 0.3,
      connectionDistance: 150,
      mouseRadius: 200,
      colors: {
        particle: 'rgba(212, 175, 55, 0.8)',      // Gold particles
        particleGlow: 'rgba(212, 175, 55, 0.4)',  // Gold glow
        line: 'rgba(212, 175, 55, 0.2)',          // Gold connections
        node: 'rgba(212, 175, 55, 0.6)',          // Gold nodes
      },
      fadeOnHidden: true,
    },

    init() {
      this.canvas = document.getElementById('sfs-circuit');
      if (!this.canvas) {
        console.warn('SFS Circuit: Canvas element #sfs-circuit not found');
        return;
      }

      this.ctx = this.canvas.getContext('2d');
      this.resize();
      this.createParticles();
      this.createNodes();
      this.setupEventListeners();
      this.animate();
    },

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    createParticles() {
      this.particles = [];
      for (let i = 0; i < this.config.particleCount; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * this.config.particleSpeed,
          vy: (Math.random() - 0.5) * this.config.particleSpeed,
          radius: Math.random() * 2 + 1,
        });
      }
    },

    createNodes() {
      this.nodes = [];
      for (let i = 0; i < this.config.nodeCount; i++) {
        this.nodes.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          radius: Math.random() * 3 + 2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    },

    updateParticles() {
      this.particles.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > this.canvas.width) {
          particle.vx *= -1;
        }
        if (particle.y < 0 || particle.y > this.canvas.height) {
          particle.vy *= -1;
        }

        // Mouse interaction
        if (this.mouse.x !== null && this.mouse.y !== null) {
          const dx = this.mouse.x - particle.x;
          const dy = this.mouse.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.config.mouseRadius) {
            const force = (this.config.mouseRadius - distance) / this.config.mouseRadius;
            particle.vx += (dx / distance) * force * 0.02;
            particle.vy += (dy / distance) * force * 0.02;
          }
        }

        // Limit speed
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (speed > 2) {
          particle.vx = (particle.vx / speed) * 2;
          particle.vy = (particle.vy / speed) * 2;
        }
      });
    },

    drawParticles() {
      this.particles.forEach(particle => {
        // Glow effect
        this.ctx.beginPath();
        const gradient = this.ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius * 3
        );
        gradient.addColorStop(0, this.config.colors.particleGlow);
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Particle core
        this.ctx.beginPath();
        this.ctx.fillStyle = this.config.colors.particle;
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        this.ctx.fill();
      });
    },

    drawConnections() {
      this.particles.forEach((p1, i) => {
        this.particles.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.config.connectionDistance) {
            const opacity = 1 - (distance / this.config.connectionDistance);
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(212, 175, 55, ${opacity * 0.2})`;
            this.ctx.lineWidth = opacity * 2;
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
          }
        });
      });
    },

    drawNodes() {
      const time = Date.now() * 0.001;

      this.nodes.forEach(node => {
        // Pulsing effect
        const pulse = Math.sin(time + node.pulse) * 0.5 + 0.5;
        const radius = node.radius + pulse * 2;

        // Node glow
        this.ctx.beginPath();
        const gradient = this.ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, radius * 4
        );
        gradient.addColorStop(0, `rgba(212, 175, 55, ${0.3 * pulse})`);
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.arc(node.x, node.y, radius * 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Node core
        this.ctx.beginPath();
        this.ctx.fillStyle = this.config.colors.node;
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Node ring
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(212, 175, 55, ${pulse})`;
        this.ctx.lineWidth = 2;
        this.ctx.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
        this.ctx.stroke();
      });
    },

    render() {
      // Clear canvas with fade effect
      this.ctx.fillStyle = 'rgba(20, 20, 20, 0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.drawConnections();
      this.drawParticles();
      this.drawNodes();
    },

    animate() {
      if (!document.hidden || !this.config.fadeOnHidden) {
        this.updateParticles();
        this.render();
      }
      requestAnimationFrame(() => this.animate());
    },

    setupEventListeners() {
      // Resize handler
      window.addEventListener('resize', () => {
        this.resize();
        this.createParticles();
        this.createNodes();
      });

      // Mouse movement
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });

      // Mouse leave
      window.addEventListener('mouseleave', () => {
        this.mouse.x = null;
        this.mouse.y = null;
      });

      // Visibility change (pause when tab hidden)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.config.fadeOnHidden) {
          // Resume animation
          this.ctx.fillStyle = 'rgba(20, 20, 20, 1)';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
      });
    },

    // Public API
    setConfig(options) {
      Object.assign(this.config, options);
      this.createParticles();
      this.createNodes();
    },

    pause() {
      this.config.fadeOnHidden = true;
    },

    resume() {
      this.config.fadeOnHidden = false;
    },

    destroy() {
      this.particles = [];
      this.nodes = [];
      if (this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CircuitFlow.init());
  } else {
    CircuitFlow.init();
  }

  // Export to window
  window.SFSCircuitFlow = CircuitFlow;

})();
