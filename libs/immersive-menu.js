/**
 * Immersive Radial Menu
 * Ported from envTest/src/components/RadialMenu.jsx
 */

var ImmersiveMenu = {
    isOpen: false,
    history: [],
    currentMenu: null,
    container: null,

    MENU_DATA: {
        id: 'main',
        label: 'Main Menu',
        items: [
            { id: 'search', label: 'Search', icon: '🔍' },
            { id: 'upload', label: 'Upload', icon: '📁' },
            { id: 'voice', label: 'Voice', icon: '🎤' },
            {
                id: 'vis_mode',
                label: 'Vis Mode',
                icon: '👁️',
                items: [
                    { id: 'non_vr', label: 'Non-VR', icon: '🖥️' },
                    { id: 'vr', label: 'VR', icon: '🥽' },
                    { id: 'toggle_wasd', label: 'Toggle WASD', icon: '🎮' },
                    { id: 'spherical', label: 'Spherical View', icon: '🌐' },
                ]
            },
            {
                id: 'structure',
                label: 'Structure',
                icon: '🧬',
                items: [
                    { id: 'hide', label: 'Hide', icon: '🚫' },
                    { id: 'line', label: 'Line', icon: '〰️' },
                    { id: 'dot', label: 'Dot', icon: '•' },
                    { id: 'backbone', label: 'Backbone', icon: '🦴' },
                    { id: 'sphere', label: 'Sphere', icon: '🏐' },
                    { id: 'stick', label: 'Stick', icon: '🥢' },
                    { id: 'ball_rod', label: 'Ball & Rod', icon: '🍡' },
                    { id: 'tube', label: 'Tube', icon: '🧪' },
                    {
                        id: 'ribbon',
                        label: 'Ribbon',
                        icon: '🎗️',
                        items: [
                            { id: 'flat', label: 'Flat', icon: '➖' },
                            { id: 'ellipse', label: 'Ellipse', icon: '⭕' },
                            { id: 'rectangle', label: 'Rectangle', icon: '▭' },
                            { id: 'strip', label: 'Strip', icon: '🎞️' },
                            { id: 'railway', label: 'Railway', icon: '🛤️' },
                            { id: 'ss', label: 'SS', icon: '🐍' },
                        ]
                    },
                ]
            },
            {
                id: 'ligand',
                label: 'Ligand',
                icon: '⚛️',
                items: [
                    { id: 'l_hide', label: 'Hide', icon: '🚫' },
                    { id: 'l_line', label: 'Line', icon: '〰️' },
                    { id: 'l_sphere', label: 'Sphere', icon: '🏐' },
                    { id: 'l_stick', label: 'Stick', icon: '🥢' },
                    { id: 'l_ball_rod', label: 'Ball & Rod', icon: '🍡' },
                ]
            },
            {
                id: 'color',
                label: 'Color',
                icon: '🎨',
                items: [
                    { id: 'element', label: 'By Element', icon: '🧪' },
                    { id: 'residue', label: 'Residue', icon: '🧩' },
                    { id: 'sec_struct', label: 'Secondary Structure', icon: '🏗️' },
                    { id: 'chain', label: 'Chain', icon: '🔗' },
                    { id: 'representation', label: 'Representation', icon: '👁️' },
                    { id: 'bfactor', label: 'B-Factor', icon: '🌡️' },
                    { id: 'spectrum', label: 'Spectrum', icon: '🌈' },
                    { id: 'chain_spectrum', label: 'Chain Spectrum', icon: '🌈' },
                    { id: 'hydrophobicity', label: 'Hydrophobicity', icon: '💧' },
                    { id: 'conservation', label: 'Conservation', icon: '🛡️' },
                ]
            },
            {
                id: 'more',
                label: 'More',
                icon: '⋯',
                items: [
                    {
                        id: 'show_others', label: 'Show Others', icon: '👀', items: [
                            { id: 'water', label: 'Water', icon: '💧' },
                            { id: 'axis', label: 'Axis', icon: 'xyz' },
                        ]
                    },
                    {
                        id: 'surface', label: 'Surface', icon: '🌫️', items: [
                            { id: 'vdw', label: 'Van der Waals', icon: '🏐' },
                            { id: 'solvent', label: 'Solvent', icon: '🌊' },
                            { id: 'molecular', label: 'Molecular', icon: '🧬' },
                            { id: 'opacity', label: 'Opacity', icon: '👻' },
                            { id: 'wireframe', label: 'Wireframe', icon: '🕸️' },
                        ]
                    },
                    { id: 'label', label: 'Label', icon: '🏷️' },
                    { id: 'measure', label: 'Measure', icon: '📏' },
                    { id: 'drag', label: 'Drag', icon: '✋' },
                    { id: 'fragment', label: 'Fragment', icon: '🧩' },
                    { id: 'editing', label: 'Editing', icon: '✏️' },
                    { id: 'mutation', label: 'Mutation', icon: '🧬' },
                    { id: 'rotation', label: 'Rotation', icon: '🔄' },
                    { id: 'drugs', label: 'Drugs & Docking', icon: '💊' },
                    { id: 'export', label: 'Export', icon: '📤' },
                    { id: 'speech', label: 'Speech', icon: '🗣️' },
                    { id: 'help', label: 'Help', icon: '❓' },
                ]
            },
        ]
    },

    init: function () {
        this.history = [this.MENU_DATA];
        this.currentMenu = this.MENU_DATA;

        // Create Container
        this.container = document.createElement('div');
        this.container.id = 'immersive-menu-container';
        this.container.style.display = 'none';
        document.body.appendChild(this.container);

        // Event Listeners
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    },

    onKeyDown: function (e) {
        if (e.code === 'KeyM') {
            this.toggle();
        }
    },

    toggle: function () {
        this.isOpen = !this.isOpen;
        this.container.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen) {
            document.exitPointerLock(); // Unlock to use menu
            this.render();
            PDB.isShowMenu = true;
        } else {
            // Optionally re-lock if we want, but usually user clicks to lock
            PDB.isShowMenu = false;
        }
    },

    render: function () {
        this.container.innerHTML = ''; // Clear

        // Center Back/Menu Button
        var centerBtn = document.createElement('div');
        centerBtn.className = 'immersive-center-btn';
        centerBtn.innerHTML = this.history.length > 1 ? '↩<br><span style="font-size:12px">' + this.currentMenu.label + '</span>' : 'MENU';
        centerBtn.onclick = this.onBack.bind(this);
        this.container.appendChild(centerBtn);

        // Radial Items
        var items = this.currentMenu.items;
        var radius = 200;
        var angleStep = (2 * Math.PI) / items.length;

        items.forEach((item, index) => {
            var angle = index * angleStep - Math.PI / 2;
            var x = Math.cos(angle) * radius;
            var y = Math.sin(angle) * radius;

            var itemBtn = document.createElement('div');
            itemBtn.className = 'immersive-item-btn';
            itemBtn.style.transform = `translate(${x}px, ${y}px)`;
            itemBtn.innerHTML = `<div style="font-size: 24px">${item.icon}</div><div style="font-size: 12px">${item.label}</div>`;

            if (item.items) {
                // Has submenu indicator
                itemBtn.innerHTML += '<div class="submenu-indicator"></div>';
            }

            itemBtn.onclick = () => this.onItemClick(item);
            this.container.appendChild(itemBtn);
        });
    },

    onItemClick: function (item) {
        if (item.items) {
            this.history.push(item);
            this.currentMenu = item;
            this.render();
        } else {
            console.log('Action triggered:', item.id);
            this.executeAction(item.id);
            // Close menu on action? Maybe not for all actions.
            // this.toggle(); 
        }
    },

    onBack: function () {
        if (this.history.length > 1) {
            this.history.pop();
            this.currentMenu = this.history[this.history.length - 1];
            this.render();
        } else {
            this.toggle(); // Close if at root
        }
    },

    executeAction: function (actionId) {
        // Map actions to PDB functions
        // This is a simplified mapping based on existing radial-menu.js
        switch (actionId) {
            case 'search':
                // Will be handled by extension
                break;
            case 'upload':
                // Will be handled by extension
                break;
            case 'vr':
                PDB.mode = PDB.MODE_VR;
                // Trigger VR enter logic
                break;
            case 'non_vr':
                PDB.mode = PDB.MODE_THREE;
                break;
            case 'toggle_wasd':
                // Toggle WASD logic if needed separately
                break;

            // Structure Modes
            case 'hide':
                PDB.render.hideStructure();
                break;
            case 'line':
                PDB.config.mainMode = PDB.LINE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'dot':
                PDB.config.mainMode = PDB.DOT;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'backbone':
                PDB.config.mainMode = PDB.BACKBONE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'sphere':
                PDB.config.mainMode = PDB.SPHERE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'stick':
                PDB.config.mainMode = PDB.STICK;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'ball_rod':
                PDB.config.mainMode = PDB.BALL_AND_ROD;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'tube':
                PDB.config.mainMode = PDB.TUBE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'flat':
                PDB.config.mainMode = PDB.RIBBON_FLAT;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'ellipse':
                PDB.config.mainMode = PDB.RIBBON_ELLIPSE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'rectangle':
                PDB.config.mainMode = PDB.RIBBON_RECTANGLE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'strip':
                PDB.config.mainMode = PDB.RIBBON_STRIP;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'railway':
                PDB.config.mainMode = PDB.RIBBON_RAILWAY;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;
            case 'ss':
                PDB.config.mainMode = PDB.CARTOON_SSE;
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                break;

            // Ligand Modes
            case 'l_hide':
                PDB.GROUP[PDB.GROUP_HET].visible = false;
                break;
            case 'l_line':
                PDB.GROUP[PDB.GROUP_HET].visible = true;
                PDB.config.hetMode = PDB.HET_LINE;
                PDB.controller.refreshGeometryByMode(PDB.config.hetMode);
                break;
            case 'l_sphere':
                PDB.GROUP[PDB.GROUP_HET].visible = true;
                PDB.config.hetMode = PDB.HET_SPHERE;
                PDB.controller.refreshGeometryByMode(PDB.config.hetMode);
                break;
            case 'l_stick':
                PDB.GROUP[PDB.GROUP_HET].visible = true;
                PDB.config.hetMode = PDB.HET_STICK;
                PDB.controller.refreshGeometryByMode(PDB.config.hetMode);
                break;
            case 'l_ball_rod':
                PDB.GROUP[PDB.GROUP_HET].visible = true;
                PDB.config.hetMode = PDB.HET_BALL_ROD;
                PDB.controller.refreshGeometryByMode(PDB.config.hetMode);
                break;

            // ... Add more mappings as needed
            default:
                console.log('Unimplemented action:', actionId);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        ImmersiveMenu.init();
    });
} else {
    ImmersiveMenu.init();
}
