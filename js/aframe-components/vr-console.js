/**
 * VR Console Component
 * Displays console logs as text in VR for debugging without PC connection
 */

AFRAME.registerComponent('vr-console', {
    schema: {
        maxLines: { default: 15 },
        position: { type: 'vec3', default: { x: -1.5, y: 1.5, z: -2 } },
        width: { default: 2.5 }
    },

    init: function () {
        console.log('[VRConsole] Initializing VR console...');

        this.logs = [];
        this.textEntity = null;

        // Create text display
        this.createTextDisplay();

        // Intercept console methods
        this.interceptConsole();

        // Log initial message
        console.log('[VRConsole] VR Console Active - Logs will appear in VR');
        console.log('[VRConsole] Position: ' + JSON.stringify(this.data.position));
    },

    createTextDisplay: function () {
        // Create container entity
        var container = document.createElement('a-entity');
        container.setAttribute('position', this.data.position);

        // Create background panel
        var bg = document.createElement('a-plane');
        bg.setAttribute('width', this.data.width);
        bg.setAttribute('height', 2.5);
        bg.setAttribute('color', '#000000');
        bg.setAttribute('opacity', 0.8);
        container.appendChild(bg);

        // Create text entity
        this.textEntity = document.createElement('a-text');
        this.textEntity.setAttribute('value', 'VR CONSOLE\n---\nWaiting for logs...');
        this.textEntity.setAttribute('color', '#00ff00');
        this.textEntity.setAttribute('width', this.data.width - 0.2);
        this.textEntity.setAttribute('align', 'left');
        this.textEntity.setAttribute('baseline', 'top');
        this.textEntity.setAttribute('position', {
            x: -this.data.width / 2 + 0.1,
            y: 1.2,
            z: 0.01
        });
        this.textEntity.setAttribute('wrap-count', 60);
        container.appendChild(this.textEntity);

        // Add to scene
        this.el.sceneEl.appendChild(container);
        this.container = container;

        console.log('[VRConsole] Text display created');
    },

    interceptConsole: function () {
        var self = this;

        // Store original console methods
        var originalLog = console.log;
        var originalWarn = console.warn;
        var originalError = console.error;

        // Override console.log
        console.log = function () {
            originalLog.apply(console, arguments);
            var msg = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            self.addLog('[LOG] ' + msg, '#00ff00');
        };

        // Override console.warn
        console.warn = function () {
            originalWarn.apply(console, arguments);
            var msg = Array.from(arguments).join(' ');
            self.addLog('[WARN] ' + msg, '#ffff00');
        };

        // Override console.error
        console.error = function () {
            originalError.apply(console, arguments);
            var msg = Array.from(arguments).join(' ');
            self.addLog('[ERROR] ' + msg, '#ff0000');
        };

        console.log('[VRConsole] Console methods intercepted');
    },

    addLog: function (message, color) {
        // Add timestamp
        var time = new Date().toLocaleTimeString();
        var logEntry = time + ' ' + message;

        // Add to logs array
        this.logs.push(logEntry);

        // Keep only last N lines
        if (this.logs.length > this.data.maxLines) {
            this.logs.shift();
        }

        // Update display
        this.updateDisplay();
    },

    updateDisplay: function () {
        if (!this.textEntity) return;

        var displayText = 'VR CONSOLE (' + this.logs.length + ' logs)\n' +
            '================================\n' +
            this.logs.join('\n');

        this.textEntity.setAttribute('value', displayText);
    },

    remove: function () {
        if (this.container) {
            this.container.parentNode.removeChild(this.container);
        }
    }
});
