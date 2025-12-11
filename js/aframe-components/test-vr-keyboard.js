/**
 * DIAGNOSTIC KEYBOARD - Always visible, simple test
 */

AFRAME.registerComponent('test-vr-keyboard', {
    schema: {},

    init: function () {
        console.log('*'.repeat(50));
        console.log('[TEST-KEYBOARD] INITIALIZING - YOU SHOULD SEE THIS!');
        console.log('*'.repeat(50));

        // Create a big visible plane so we know it exists
        var testPlane = document.createElement('a-plane');
        testPlane.setAttribute('width', 0.5);
        testPlane.setAttribute('height', 0.3);
        testPlane.setAttribute('color', '#FF00FF'); // Bright magenta
        testPlane.setAttribute('position', '0 0 0');
        this.el.appendChild(testPlane);

        // Add text
        var text = document.createElement('a-text');
        text.setAttribute('value', 'TEST KEYBOARD\nIF YOU SEE THIS\nIT WORKS!');
        text.setAttribute('align', 'center');
        text.setAttribute('width', 1);
        text.setAttribute('color', '#FFFFFF');
        text.setAttribute('position', '0 0 0.01');
        this.el.appendChild(text);

        console.log('[TEST-KEYBOARD] Created at position:', this.el.getAttribute('position'));
        console.log('[TEST-KEYBOARD] Visible:', this.el.getAttribute('visible'));

        // Make sure it's visible
        this.el.setAttribute('visible', true);

        console.log('[TEST-KEYBOARD] Forced visible to true');
        console.log('[TEST-KEYBOARD] Setup complete');
    },

    tick: function (time, delta) {
        // Log every 3 seconds
        if (!this.lastLog || time - this.lastLog > 3000) {
            this.lastLog = time;
            console.log('[TEST-KEYBOARD] Still alive, position:', this.el.getAttribute('position'));
        }
    }
});

console.log('[TEST-KEYBOARD] Component registered - script loaded successfully');
