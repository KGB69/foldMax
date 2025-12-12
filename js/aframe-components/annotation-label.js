/**
 * Annotation Label Component
 * Renders the Billboarded Text + Connector Line
 */
AFRAME.registerComponent('annotation-label', {
    schema: {
        text: { type: 'string', default: '' },
        targetPos: { type: 'vec3' },
        isPreview: { type: 'boolean', default: false }
    },

    init: function () {
        // 1. Text Entity
        this.textEl = document.createElement('a-entity');
        this.textEl.setAttribute('text', {
            align: 'center',
            color: '#FFFFFF',
            width: 1.5,
            shader: 'msdf',
            font: 'https://raw.githubusercontent.com/etiennepinchon/aframe-fonts/master/fonts/roboto/Roboto-Bold.json'
        });

        // 2. Background Panel (for readability)
        var bgEl = document.createElement('a-entity');
        bgEl.setAttribute('geometry', { primitive: 'plane', width: 'auto', height: 'auto' });
        bgEl.setAttribute('material', { color: '#000000', opacity: 0.7, transparent: true, side: 'double' }); // Increased opacity
        bgEl.setAttribute('scale', '0.45 0.2 1'); // Slightly larger
        bgEl.setAttribute('position', '0 0 -0.01');
        this.textEl.appendChild(bgEl);

        // 3. Connector Line
        this.lineEl = document.createElement('a-entity');

        this.el.appendChild(this.textEl);
        this.el.appendChild(this.lineEl);

        // Billboarding
        this.el.setAttribute('look-at', '[camera]');

        // Offset relative to target
        this.offset = new THREE.Vector3(0, 0.25, 0); // 25cm above atom
    },

    update: function () {
        // Update Text
        this.textEl.setAttribute('text', 'value', this.data.text);

        // Update Position
        var pos = this.data.targetPos;
        this.el.object3D.position.set(pos.x, pos.y, pos.z).add(this.offset);

        // Styling based on Preview vs Pinned
        var lineColor = this.data.isPreview ? '#00FFFF' : '#FFFF00'; // Cyan for preview, Yellow for pinned

        // Update Line (From Label to Atom)
        // Since label is at pos+offset, start is 0,0,0 (local), end is 0,-0.25,0
        // Use A-Frame 'line' component
        this.lineEl.setAttribute('line', {
            start: '0 0 0',
            end: '0 ' + (-this.offset.y) + ' 0',
            color: lineColor
        });
    }
});
