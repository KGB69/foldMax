/**
 * Simple VR Keyboard - Persistent Entity Approach
 * Always exists in scene, just shown/hidden
 */

AFRAME.registerComponent('simple-vr-keyboard', {
    schema: {},

    init: function () {
        console.log('[SimpleKeyboard] Initializing');

        this.callback = null;
        this.inputValue = '';
        this.selectedKey = 0;
        this.keys = [];

        this.createKeyboard();
        this.setupInput();

        console.log('[SimpleKeyboard] Ready');
    },

    createKeyboard: function () {
        // Background
        var bg = document.createElement('a-plane');
        bg.setAttribute('width', 0.8);
        bg.setAttribute('height', 0.5);
        bg.setAttribute('color', '#1a1a2e');
        bg.setAttribute('opacity', 0.95);
        this.el.appendChild(bg);

        // Title
        var title = document.createElement('a-text');
        title.setAttribute('value', 'Enter PDB ID');
        title.setAttribute('align', 'center');
        title.setAttribute('width', 0.8);
        title.setAttribute('color', '#FFFFFF');
        title.setAttribute('position', '0 0.22 0.01');
        this.el.appendChild(title);

        // Input display
        this.display = document.createElement('a-text');
        this.display.setAttribute('value', '[ ]');
        this.display.setAttribute('align', 'center');
        this.display.setAttribute('width', 1.5);
        this.display.setAttribute('color', '#00FF00');
        this.display.setAttribute('position', '0 0.18 0.01');
        this.el.appendChild(this.display);

        // Keyboard layout
        var layout = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '⌫'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '✓', '✗']
        ];

        var startY = 0.1;
        var rowHeight = 0.07;
        var keyWidth = 0.065;
        var keyHeight = 0.055;
        var keyGap = 0.008;

        for (var row = 0; row < layout.length; row++) {
            var rowKeys = layout[row];
            var rowWidth = rowKeys.length * (keyWidth + keyGap) - keyGap;
            var startX = -rowWidth / 2 + keyWidth / 2;
            var y = startY - row * rowHeight;

            for (var col = 0; col < rowKeys.length; col++) {
                var key = rowKeys[col];
                var x = startX + col * (keyWidth + keyGap);
                this.createKey(key, x, y, keyWidth, keyHeight);
            }
        }
    },

    createKey: function (label, x, y, w, h) {
        var color = '#333355';
        if (label === '⌫') color = '#aa3333';
        else if (label === '✓') color = '#33aa33';
        else if (label === '✗') color = '#aa3333';

        var keyBg = document.createElement('a-plane');
        keyBg.setAttribute('width', w);
        keyBg.setAttribute('height', h);
        keyBg.setAttribute('position', x + ' ' + y + ' 0.005');
        keyBg.setAttribute('color', color);
        this.el.appendChild(keyBg);

        var keyText = document.createElement('a-text');
        keyText.setAttribute('value', label);
        keyText.setAttribute('align', 'center');
        keyText.setAttribute('width', 0.5);
        keyText.setAttribute('color', '#FFFFFF');
        keyText.setAttribute('position', x + ' ' + y + ' 0.01');
        this.el.appendChild(keyText);

        this.keys.push({
            label: label,
            bg: keyBg,
            text: keyText,
            baseColor: color
        });
    },

    setupInput: function () {
        var self = this;

        // Controller input
        var controllers = ['#left-hand', '#right-hand'];
        controllers.forEach(function (selector) {
            var ctrl = document.querySelector(selector);
            if (ctrl) {
                ctrl.addEventListener('thumbstickmoved', function (evt) {
                    if (self.el.getAttribute('visible')) {
                        self.handleJoystick(evt.detail);
                    }
                });

                ctrl.addEventListener('triggerdown', function () {
                    if (self.el.getAttribute('visible')) {
                        self.pressKey();
                    }
                });
            }
        });

        // Desktop keyboard
        window.addEventListener('keydown', function (evt) {
            if (!self.el.getAttribute('visible')) return;

            if (evt.key === 'Escape') {
                self.hide(null);
            } else if (evt.key === 'Enter') {
                self.hide(self.inputValue);
            } else if (evt.key === 'Backspace') {
                self.inputValue = self.inputValue.slice(0, -1);
                self.updateDisplay();
            } else if (/^[a-zA-Z0-9]$/.test(evt.key)) {
                if (self.inputValue.length < 8) {
                    self.inputValue += evt.key.toUpperCase();
                    self.updateDisplay();
                }
            }
        });
    },

    handleJoystick: function (detail) {
        var x = detail.x;
        var y = detail.y;
        var deadzone = 0.5;

        if (Math.abs(x) < deadzone && Math.abs(y) < deadzone) {
            this.joystickReset = true;
            return;
        }

        if (!this.joystickReset) return;
        this.joystickReset = false;

        // Simple navigation: left/right/up/down
        if (Math.abs(x) > Math.abs(y)) {
            this.selectedKey += (x > 0) ? 1 : -1;
        } else {
            this.selectedKey += (y > 0) ? -10 : 10; // Approximate row jump
        }

        this.selectedKey = Math.max(0, Math.min(this.keys.length - 1, this.selectedKey));
        this.updateSelection();
    },

    updateSelection: function () {
        for (var i = 0; i < this.keys.length; i++) {
            var key = this.keys[i];
            if (i === this.selectedKey) {
                key.bg.setAttribute('color', '#00FFFF');
            } else {
                key.bg.setAttribute('color', key.baseColor);
            }
        }
    },

    pressKey: function () {
        var key = this.keys[this.selectedKey];
        if (!key) return;

        var label = key.label;
        console.log('[SimpleKeyboard] Key pressed:', label);

        if (label === '⌫') {
            this.inputValue = this.inputValue.slice(0, -1);
            this.updateDisplay();
        } else if (label === '✓') {
            this.hide(this.inputValue);
        } else if (label === '✗') {
            this.hide(null);
        } else {
            if (this.inputValue.length < 8) {
                this.inputValue += label;
                this.updateDisplay();
            }
        }
    },

    updateDisplay: function () {
        var display = this.inputValue || ' ';
        this.display.setAttribute('value', '[ ' + display + ' ]');
    },

    // Public API
    show: function (callback) {
        console.log('[SimpleKeyboard] Showing keyboard');
        this.callback = callback;
        this.inputValue = '';
        this.selectedKey = 0;
        this.joystickReset = true;

        this.updateDisplay();
        this.updateSelection();
        this.el.setAttribute('visible', true);
    },

    hide: function (result) {
        console.log('[SimpleKeyboard] Hiding keyboard, result:', result);
        this.el.setAttribute('visible', false);

        if (this.callback) {
            this.callback(result);
            this.callback = null;
        }
    }
});

console.log('[SimpleKeyboard] Component registered');
