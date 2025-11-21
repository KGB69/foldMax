// Radial Menu Controller
(function () {
    'use strict';

    const RadialMenu = {
        isOpen: false,
        activeSubmenu: null,
        menuItems: [],
        fab3DObject: null,

        init: function () {
            this.createMenuStructure();
            this.attachEventListeners();
            this.calculatePositions();
            this.create3DFAB();
        },

        createMenuStructure: function () {
            // Define menu items with their properties
            this.menuItems = [
                { id: 'search', icon: '🔍', label: 'Search', angle: 0, action: 'toggleSearch' },
                { id: 'upload', icon: '📁', label: 'Upload', angle: 45, action: 'triggerUpload' },
                { id: 'voice', icon: '🎤', label: 'Voice', angle: 90, action: 'triggerVoice' },
                { id: 'vismode', icon: '👁️', label: 'Vis Mode', angle: 135, submenu: 'structureMode' },
                { id: 'structure', icon: '🧬', label: 'Structure', angle: 180, submenu: 'mainStructure' },
                { id: 'ligand', icon: '⚛️', label: 'Ligand', angle: 225, submenu: 'ligandStructure' },
                { id: 'color', icon: '🎨', label: 'Color', angle: 270, submenu: 'updateColorMode' },
                { id: 'more', icon: '⋯', label: 'More', angle: 315, action: 'showMoreMenu' }
            ];
        },

        attachEventListeners: function () {
            const fab = document.getElementById('radial-menu-fab');
            const backdrop = document.getElementById('radial-menu-backdrop');

            if (fab) {
                fab.addEventListener('click', () => this.toggle());
            }

            if (backdrop) {
                backdrop.addEventListener('click', () => this.close());
            }

            // Keyboard shortcut: M key to toggle menu
            document.addEventListener('keydown', (e) => {
                if (e.key === 'm' || e.key === 'M') {
                    this.toggle();
                }
            });

            // Attach listeners to menu items
            this.menuItems.forEach(item => {
                const element = document.getElementById(`radial-item-${item.id}`);
                if (element) {
                    element.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleMenuItemClick(item);
                    });
                }
            });

            // Upload input handler
            const uploadInput = document.getElementById('radial-upload-input');
            if (uploadInput) {
                uploadInput.addEventListener('change', (e) => {
                    const uploadButton = document.getElementById('upload_button');
                    if (uploadButton && e.target.files.length > 0) {
                        const event = new Event('change', { bubbles: true });
                        Object.defineProperty(event, 'target', { value: uploadButton, enumerable: true });
                        uploadButton.files = e.target.files;
                        uploadButton.dispatchEvent(event);
                    }
                    this.close();
                });
            }

            // Search button handler
            const searchBtn = document.getElementById('radial-search-btn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    const searchText = document.getElementById('radial-search-input').value;
                    const originalSearchInput = document.getElementById('search_text');
                    const originalSearchButton = document.getElementById('search_button');

                    if (originalSearchInput && originalSearchButton) {
                        originalSearchInput.value = searchText;
                        originalSearchButton.click();
                    }
                    this.close();
                });
            }

            // Search input enter key
            const searchInput = document.getElementById('radial-search-input');
            if (searchInput) {
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        document.getElementById('radial-search-btn').click();
                    }
                });
            }
        },

        create3DFAB: function () {
            if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;

            const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
            const material = new THREE.MeshStandardMaterial({
                color: 0xf79049,
                emissive: 0xff6b35,
                emissiveIntensity: 0.3,
                metalness: 0.5,
                roughness: 0.3
            });

            this.fab3DObject = new THREE.Mesh(geometry, material);
            this.fab3DObject.rotation.x = Math.PI / 2;
            this.fab3DObject.position.set(2, -1.5, -3);

            if (typeof scene !== 'undefined' && scene.add) {
                scene.add(this.fab3DObject);
                this.fab3DObject.userData.interactive = true;
                this.fab3DObject.userData.onSelect = () => this.toggle();
            }
        },

        calculatePositions: function () {
            const radius = 120;
            const items = document.querySelectorAll('.radial-menu-item');

            items.forEach((item, index) => {
                const menuItem = this.menuItems[index];
                if (!menuItem) return;

                const angle = (menuItem.angle * Math.PI) / 180;
                const x = Math.cos(angle) * radius;
                const y = -Math.sin(angle) * radius;

                item.dataset.x = x;
                item.dataset.y = y;
                item.style.transform = `translate(0px, 0px) scale(0)`;
            });
        },

        toggle: function () {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        open: function () {
            this.isOpen = true;
            const fab = document.getElementById('radial-menu-fab');
            const itemsContainer = document.getElementById('radial-menu-items');
            const backdrop = document.getElementById('radial-menu-backdrop');

            fab.classList.add('active');
            itemsContainer.classList.add('active');
            backdrop.classList.add('active');

            if (this.fab3DObject) {
                this.fab3DObject.rotation.z = Math.PI / 4;
            }

            const items = document.querySelectorAll('.radial-menu-item');
            items.forEach((item, index) => {
                setTimeout(() => {
                    const x = item.dataset.x || 0;
                    const y = item.dataset.y || 0;
                    item.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                }, index * 50);
            });
        },

        close: function () {
            this.isOpen = false;
            const fab = document.getElementById('radial-menu-fab');
            const itemsContainer = document.getElementById('radial-menu-items');
            const backdrop = document.getElementById('radial-menu-backdrop');

            fab.classList.remove('active');
            itemsContainer.classList.remove('active');
            backdrop.classList.remove('active');

            if (this.fab3DObject) {
                this.fab3DObject.rotation.z = 0;
            }

            const items = document.querySelectorAll('.radial-menu-item');
            items.forEach(item => {
                item.style.transform = `translate(0px, 0px) scale(0)`;
            });

            this.closeAllSubmenus();
        },

        handleMenuItemClick: function (item) {
            if (item.submenu) {
                this.toggleSubmenu(item.submenu);
            } else if (item.action) {
                this[item.action]();
            }
        },

        toggleSubmenu: function (submenuId) {
            const submenu = document.getElementById(`radial-submenu-${submenuId}`);
            if (!submenu) return;

            if (this.activeSubmenu && this.activeSubmenu !== submenuId) {
                this.closeSubmenu(this.activeSubmenu);
            }

            if (submenu.classList.contains('active')) {
                this.closeSubmenu(submenuId);
            } else {
                submenu.classList.add('active');
                this.activeSubmenu = submenuId;
            }
        },

        closeSubmenu: function (submenuId) {
            const submenu = document.getElementById(`radial-submenu-${submenuId}`);
            if (submenu) {
                submenu.classList.remove('active');
            }
            if (this.activeSubmenu === submenuId) {
                this.activeSubmenu = null;
            }
        },

        closeAllSubmenus: function () {
            document.querySelectorAll('.radial-submenu').forEach(submenu => {
                submenu.classList.remove('active');
            });
            document.querySelectorAll('.radial-search-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            this.activeSubmenu = null;
        },

        toggleSearch: function () {
            const searchPanel = document.getElementById('radial-search-panel');
            if (searchPanel) {
                this.closeAllSubmenus();
                searchPanel.classList.toggle('active');
            }
        },

        triggerUpload: function () {
            const uploadInput = document.getElementById('radial-upload-input');
            if (uploadInput) {
                uploadInput.click();
            }
        },

        triggerVoice: function () {
            if (typeof startRecording === 'function') {
                startRecording();
                setTimeout(() => {
                    if (typeof endRecord === 'function') {
                        endRecord();
                    }
                }, 3000);
            }
            this.close();
        },

        showMoreMenu: function () {
            this.toggleSubmenu('moreMenu');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => RadialMenu.init());
    } else {
        RadialMenu.init();
    }

    window.RadialMenu = RadialMenu;
})();
