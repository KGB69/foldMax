/**
 * DIAGNOSTIC VERSION - Ultra-verbose logging
 * Tests basic functionality without complex interactions
 */

AFRAME.registerComponent('test-controller-menu', {
    schema: {
        hand: { default: 'right' }
    },

    init: function () {
        console.log('='.repeat(50));
        console.log('[TEST-MENU] INITIALIZING - YOU SHOULD SEE THIS!');
        console.log('='.repeat(50));

        this.isOpen = false;
        this.testBox = null;

        // Create a simple visible box as proof of life
        this.testBox = document.createElement('a-box');
        this.testBox.setAttribute('position', '0 0.1 -0.2');
        this.testBox.setAttribute('scale', '0.05 0.05 0.05');
        this.testBox.setAttribute('color', '#00FF00'); // Bright green
        this.testBox.setAttribute('visible', false);
        this.el.appendChild(this.testBox);

        this.setupListeners();

        console.log('[TEST-MENU] Setup complete');
    },

    setupListeners: function () {
        var self = this;

        // Grip to toggle
        this.el.addEventListener('gripdown', function () {
            console.log('[TEST-MENU] GRIP PRESSED!');
            self.toggleMenu();
        });

        // Trigger just logs for now
        this.el.addEventListener('triggerdown', function () {
            console.log('[TEST-MENU] TRIGGER PRESSED!');
        });

        console.log('[TEST-MENU] Listeners attached to', this.data.hand, 'hand');
    },

    toggleMenu: function () {
        this.isOpen = !this.isOpen;
        this.testBox.setAttribute('visible', this.isOpen);

        console.log('[TEST-MENU] Menu toggled, isOpen:', this.isOpen);
        console.log('[TEST-MENU] Box should be', this.isOpen ? 'VISIBLE' : 'HIDDEN');
    },

    tick: function (time, delta) {
        // Log every 2 seconds to prove tick is running
        if (!this.lastLog || time - this.lastLog > 2000) {
            this.lastLog = time;
            console.log('[TEST-MENU] Tick running, isOpen:', this.isOpen);
        }
    }
});

console.log('[TEST-MENU] Component registered - script loaded successfully');
