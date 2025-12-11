/**
 * VR Keyboard Component
 * 
 * A simple alphanumeric keyboard for entering PDB IDs in VR.
 * Appears in front of the player when triggered.
 */

AFRAME.registerComponent('vr-keyboard', {
    schema: {
        width: { default: 0.8 },
        height: { default: 0.5 },
        distance: { default: 0.8 }
    },

    init: function () {
        console.log('[VRKeyboard] Initializing');

        this.isOpen = false;
        this.inputValue = '';
        this.callback = null;
        this.keyButtons = [];
        this.selectedKeyIndex = 0;
        this.keyRows = [];

        this.createKeyboard();
        this.setupListeners();

        console.log('[VRKeyboard] Ready');
    },

    createKeyboard: function () {
        // Main container - will be positioned in front of camera
        this.keyboardEl = document.createElement('a-entity');
        this.keyboardEl.setAttribute('visible', false);
        this.keyboardEl.setAttribute('id', 'vr-keyboard-panel');
        this.el.appendChild(this.keyboardEl);

        // Background panel
        var bgEl = document.createElement('a-plane');
        bgEl.setAttribute('width', this.data.width);
        bgEl.setAttribute('height', this.data.height);
        bgEl.setAttribute('color', '#1a1a2e');
        bgEl.setAttribute('opacity', 0.95);
        this.keyboardEl.appendChild(bgEl);

        // Input display
        this.inputDisplay = document.createElement('a-text');
        this.inputDisplay.setAttribute('value', '[ ]');
        this.inputDisplay.setAttribute('align', 'center');
        this.inputDisplay.setAttribute('width', 1.5);
        this.inputDisplay.setAttribute('color', '#00FF00');
        this.inputDisplay.setAttribute('position', '0 0.18 0.01');
        this.keyboardEl.appendChild(this.inputDisplay);

        // Title
        var titleEl = document.createElement('a-text');
        titleEl.setAttribute('value', 'Enter PDB ID');
        titleEl.setAttribute('align', 'center');
        titleEl.setAttribute('width', 0.8);
        titleEl.setAttribute('color', '#FFFFFF');
        titleEl.setAttribute('position', '0 0.22 0.01');
        this.keyboardEl.appendChild(titleEl);

        // Keyboard layout - PDB IDs are typically 4 characters (letters/numbers)
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

            this.keyRows.push([]);

            for (var col = 0; col < rowKeys.length; col++) {
                var key = rowKeys[col];
                var x = startX + col * (keyWidth + keyGap);

                var keyData = this.createKey(key, x, y, keyWidth, keyHeight);
                this.keyButtons.push(keyData);
                this.keyRows[row].push(keyData);
            }
        }
    },

    createKey: function (label, x, y, w, h) {
        var keyEl = document.createElement('a-entity');

        // Key background
        var bgEl = document.createElement('a-plane');
        bgEl.setAttribute('width', w);
        bgEl.setAttribute('height', h);
        bgEl.setAttribute('position', x + ' ' + y + ' 0.005');

        // Special keys get different colors
        var color = '#333355';
        if (label === '⌫') color = '#aa3333';
        else if (label === '✓') color = '#33aa33';
        else if (label === '✗') color = '#aa3333';

        bgEl.setAttribute('color', color);
        this.keyboardEl.appendChild(bgEl);

        // Key label
        var textEl = document.createElement('a-text');
        textEl.setAttribute('value', label);
        textEl.setAttribute('align', 'center');
        textEl.setAttribute('width', 0.5);
        textEl.setAttribute('color', '#FFFFFF');
        textEl.setAttribute('position', x + ' ' + y + ' 0.01');
        this.keyboardEl.appendChild(textEl);

        return {
            label: label,
            bgEl: bgEl,
            textEl: textEl,
            x: x,
            y: y,
            baseColor: color
        };
    },

    setupListeners: function () {
        var self = this;

        // Listen for keyboard open event
        this.el.sceneEl.addEventListener('vr-keyboard-open', function (evt) {
            console.log('[VRKeyboard] Event received! Opening keyboard...');
            self.callback = evt.detail.callback;
            // Defer to next frame to ensure scene is ready
            setTimeout(function () {
                self.open();
            }, 100);
        });

        // Controller input - listen to both hands
        var leftHand = document.querySelector('#left-hand');
        var rightHand = document.querySelector('#right-hand');

        if (leftHand) {
            leftHand.addEventListener('thumbstickmoved', function (evt) {
                if (self.isOpen) self.handleJoystick(evt.detail);
            });
            leftHand.addEventListener('triggerdown', function () {
                if (self.isOpen) self.pressSelectedKey();
            });
        }

        if (rightHand) {
            rightHand.addEventListener('thumbstickmoved', function (evt) {
                if (self.isOpen) self.handleJoystick(evt.detail);
            });
            rightHand.addEventListener('triggerdown', function () {
                if (self.isOpen) self.pressSelectedKey();
            });
        }

        // Keyboard input for desktop testing
        window.addEventListener('keydown', function (evt) {
            if (!self.isOpen) return;

            if (evt.key === 'Escape') {
                self.cancel();
            } else if (evt.key === 'Enter') {
                self.submit();
            } else if (evt.key === 'Backspace') {
                self.backspace();
            } else if (/^[a-zA-Z0-9]$/.test(evt.key)) {
                self.addChar(evt.key.toUpperCase());
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

        // Find current row and column
        var currentIndex = this.selectedKeyIndex;
        var currentRow = 0;
        var currentCol = 0;
        var count = 0;

        for (var r = 0; r < this.keyRows.length; r++) {
            if (count + this.keyRows[r].length > currentIndex) {
                currentRow = r;
                currentCol = currentIndex - count;
                break;
            }
            count += this.keyRows[r].length;
        }

        // Navigate
        if (Math.abs(x) > Math.abs(y)) {
            // Horizontal
            if (x > deadzone) {
                currentCol = Math.min(currentCol + 1, this.keyRows[currentRow].length - 1);
            } else if (x < -deadzone) {
                currentCol = Math.max(currentCol - 1, 0);
            }
        } else {
            // Vertical
            if (y > deadzone) {
                currentRow = Math.max(currentRow - 1, 0);
                currentCol = Math.min(currentCol, this.keyRows[currentRow].length - 1);
            } else if (y < -deadzone) {
                currentRow = Math.min(currentRow + 1, this.keyRows.length - 1);
                currentCol = Math.min(currentCol, this.keyRows[currentRow].length - 1);
            }
        }

        // Calculate new index
        var newIndex = 0;
        for (var i = 0; i < currentRow; i++) {
            newIndex += this.keyRows[i].length;
        }
        newIndex += currentCol;

        if (newIndex !== this.selectedKeyIndex) {
            this.selectedKeyIndex = newIndex;
            this.updateSelection();
            this.triggerHaptic();
        }
    },

    updateSelection: function () {
        var self = this;
        this.keyButtons.forEach(function (key, i) {
            if (i === self.selectedKeyIndex) {
                key.bgEl.setAttribute('color', '#00FFFF');
            } else {
                key.bgEl.setAttribute('color', key.baseColor);
            }
        });
    },

    pressSelectedKey: function () {
        var key = this.keyButtons[this.selectedKeyIndex];
        if (!key) return;

        var label = key.label;
        console.log('[VRKeyboard] Key pressed:', label);

        if (label === '⌫') {
            this.backspace();
        } else if (label === '✓') {
            this.submit();
        } else if (label === '✗') {
            this.cancel();
        } else {
            this.addChar(label);
        }

        this.triggerHaptic();
    },

    addChar: function (char) {
        if (this.inputValue.length < 8) { // Max 8 chars
            this.inputValue += char;
            this.updateDisplay();
        }
    },

    backspace: function () {
        this.inputValue = this.inputValue.slice(0, -1);
        this.updateDisplay();
    },

    updateDisplay: function () {
        var display = this.inputValue || ' ';
        this.inputDisplay.setAttribute('value', '[ ' + display + ' ]');
    },

    submit: function () {
        console.log('[VRKeyboard] Submitting:', this.inputValue);
        if (this.callback) {
            this.callback(this.inputValue);
        }
        this.close();
    },

    cancel: function () {
        console.log('[VRKeyboard] Cancelled');
        if (this.callback) {
            this.callback(null);
        }
        this.close();
    },

    open: function () {
        console.log('[VRKeyboard] Opening keyboard...');
        this.isOpen = true;
        this.inputValue = '';
        this.selectedKeyIndex = 0;
        this.joystickReset = true;

        // Position in front of camera
        var camera = document.querySelector('#camera');
        if (!camera) {
            console.error('[VRKeyboard] Camera not found!');
            return;
        }

        console.log('[VRKeyboard] Camera found, positioning keyboard...');
        var camPos = camera.object3D.getWorldPosition(new THREE.Vector3());
        var camDir = new THREE.Vector3(0, 0, -1);
        camDir.applyQuaternion(camera.object3D.quaternion);

        var kbPos = camPos.clone().add(camDir.multiplyScalar(this.data.distance));
        this.keyboardEl.object3D.position.copy(kbPos);
        this.keyboardEl.object3D.lookAt(camPos);

        console.log('[VRKeyboard] Position:', kbPos);
        console.log('[VRKeyboard] Setting visible to true...');

        this.keyboardEl.setAttribute('visible', true);

        // Force visibility on all children
        this.keyboardEl.object3D.visible = true;
        this.keyboardEl.object3D.traverse(function (child) {
            child.visible = true;
        });

        console.log('[VRKeyboard] Keyboard should now be visible!');
        this.updateDisplay();
        this.updateSelection();
    },

    close: function () {
        console.log('[VRKeyboard] Closing');
        this.isOpen = false;
        this.keyboardEl.setAttribute('visible', false);
    },

    triggerHaptic: function () {
        // Try to trigger haptic on active controller
        var controllers = [
            document.querySelector('#left-hand'),
            document.querySelector('#right-hand')
        ];

        controllers.forEach(function (ctrl) {
            if (ctrl) {
                var gamepad = ctrl.components['oculus-touch-controls'];
                if (gamepad && gamepad.controller && gamepad.controller.gamepad) {
                    var actuators = gamepad.controller.gamepad.hapticActuators;
                    if (actuators && actuators[0]) {
                        actuators[0].pulse(0.3, 30);
                    }
                }
            }
        });
    }
});

console.log('[VRKeyboard] Component registered');
