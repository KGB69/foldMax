// ImmersiveMenu Extensions - File Upload & Advanced Panel
(function () {
    'use strict';

    // Wait for ImmersiveMenu to be ready
    const waitForMenu = setInterval(() => {
        if (typeof ImmersiveMenu !== 'undefined') {
            clearInterval(waitForMenu);
            initExtensions();
        }
    }, 100);

    function initExtensions() {
        // Store original executeAction
        const originalExecuteAction = ImmersiveMenu.executeAction;

        // Add new properties
        ImmersiveMenu.lastMKeyPress = 0;
        ImmersiveMenu.advancedPanelOpen = false;

        // Override executeAction to add our features
        ImmersiveMenu.executeAction = function (actionId) {
            if (actionId === 'upload') {
                showFileDialog();
                return;
            }
            if (actionId === 'search') {
                toggleSearch();
                return;
            }
            // Call original for other actions
            if (originalExecuteAction) {
                originalExecuteAction.call(this, actionId);
            }
        };

        // File Upload Dialog Functions
        function showFileDialog() {
            const dialog = document.getElementById('file-upload-dialog');
            if (dialog) {
                dialog.classList.add('active');
                updateRecentFilesList();
            }
        }

        function closeFileDialog() {
            const dialog = document.getElementById('file-upload-dialog');
            if (dialog) {
                dialog.classList.remove('active');
                const urlInput = document.getElementById('pdb-url-input');
                const idInput = document.getElementById('pdb-id-input');
                if (urlInput) urlInput.value = '';
                if (idInput) idInput.value = '';
            }
        }

        function handleURLUpload() {
            const urlInput = document.getElementById('pdb-url-input');
            if (!urlInput || !urlInput.value.trim()) {
                alert('Please enter a valid URL');
                return;
            }
            const url = urlInput.value.trim();
            if (window.PDB && window.PDB.loader) {
                window.PDB.loader.load(url);
                saveRecentFile(url, 'URL');
                closeFileDialog();
            }
        }

        function handlePDBIDUpload() {
            const idInput = document.getElementById('pdb-id-input');
            if (!idInput || !idInput.value.trim()) {
                alert('Please enter a PDB ID (e.g., 1CBS)');
                return;
            }
            const pdbId = idInput.value.trim().toUpperCase();
            const url = `https://files.rcsb.org/view/${pdbId}.pdb`;
            if (window.PDB && window.PDB.loader) {
                window.PDB.loader.load(url);
                saveRecentFile(pdbId, 'PDB ID');
                closeFileDialog();
            }
        }

        function saveRecentFile(id, type) {
            try {
                let recent = JSON.parse(localStorage.getItem('recentFiles') || '[]');
                recent.unshift({ id: id, type: type, timestamp: Date.now() });
                recent = recent.slice(0, 5);
                localStorage.setItem('recentFiles', JSON.stringify(recent));
                updateRecentFilesList();
            } catch (e) {
                console.error('Failed to save recent file:', e);
            }
        }

        function updateRecentFilesList() {
            const container = document.getElementById('recent-files-list');
            if (!container) return;
            try {
                const recent = JSON.parse(localStorage.getItem('recentFiles') || '[]');
                if (recent.length === 0) {
                    container.innerHTML = '<div style="color: #888; font-style: italic;">No recent files</div>';
                    return;
                }
                container.innerHTML = recent.map(file => {
                    const timeAgo = getTimeAgo(file.timestamp);
                    return `<div class="recent-file-item" onclick="ImmersiveMenuExt.loadRecentFile('${file.id}', '${file.type}')"><span class="file-type">${file.type}</span><span class="file-id">${file.id}</span><span class="file-time">${timeAgo}</span></div>`;
                }).join('');
            } catch (e) {
                console.error('Failed to update recent files:', e);
            }
        }

        function loadRecentFile(id, type) {
            if (type === 'PDB ID') {
                const url = `https://files.rcsb.org/view/${id}.pdb`;
                if (window.PDB && window.PDB.loader) window.PDB.loader.load(url);
            } else if (type === 'URL') {
                if (window.PDB && window.PDB.loader) window.PDB.loader.load(id);
            }
            closeFileDialog();
        }

        function getTimeAgo(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 60) return 'just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            return `${Math.floor(seconds / 86400)}d ago`;
        }

        function handleFileUpload(file) {
            if (!file.name.endsWith('.pdb')) {
                alert('Please select a PDB file (.pdb)');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                if (window.PDB && window.PDB.loader && window.PDB.loader.loadFromText) {
                    window.PDB.loader.loadFromText(e.target.result, file.name);
                    saveRecentFile(file.name, 'Local File');
                    closeFileDialog();
                }
            };
            reader.readAsText(file);
        }

        function toggleSearch() {
            const searchPanel = document.getElementById('radial-search-panel');
            if (searchPanel) {
                searchPanel.classList.toggle('active');
            }
        }

        // Advanced Panel Functions
        function toggleAdvancedPanel() {
            if (ImmersiveMenu.advancedPanelOpen) {
                closeAdvancedPanel();
            } else {
                openAdvancedPanel();
            }
        }

        function openAdvancedPanel() {
            const panel = document.getElementById('advanced-controls-panel');
            if (panel) {
                ImmersiveMenu.advancedPanelOpen = true;
                panel.classList.add('active');
                if (ImmersiveMenu.isOpen) ImmersiveMenu.toggle();
            }
        }

        function closeAdvancedPanel() {
            const panel = document.getElementById('advanced-controls-panel');
            if (panel) {
                panel.classList.remove('active');
                ImmersiveMenu.advancedPanelOpen = false;
            }
        }

        // Initialize file dialog
        function initFileDialog() {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-drop-input');
            const urlInput = document.getElementById('pdb-url-input');
            const idInput = document.getElementById('pdb-id-input');

            if (dropZone && fileInput) {
                dropZone.addEventListener('click', () => fileInput.click());
                dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
                dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('drag-over');
                    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
                });
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
                });
            }

            if (urlInput) {
                urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleURLUpload(); });
            }
            if (idInput) {
                idInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handlePDBIDUpload(); });
            }
        }

        // Add our own keyboard handler (ImmersiveMenu already has one, so we add separately)
        document.addEventListener('keydown', function (e) {
            if (e.code === 'KeyM') {
                console.log('[ImmersiveMenuExt] M key pressed');
                e.preventDefault();
                e.stopPropagation();

                // Toggle CanvasUI panel if available (for both VR and Desktop testing)
                if (typeof CanvasUI !== 'undefined') {
                    console.log('[ImmersiveMenuExt] Toggling CanvasUI');
                    CanvasUI.toggle();
                } else {
                    // Fallback to regular Advanced Panel
                    toggleAdvancedPanel();
                }
                return;
            }
            // Handle ESC key
            if (e.key === 'Escape') {
                if (ImmersiveMenu.advancedPanelOpen) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeAdvancedPanel();
                }
                // Also close CanvasUI panel if open
                if (typeof CanvasUI !== 'undefined') {
                    CanvasUI.hide();
                }
                return;
            }

            // CanvasUI Navigation (Keyboard Fallback)
            if (typeof CanvasUI !== 'undefined' && CanvasUI.mesh && CanvasUI.mesh.visible) {
                e.preventDefault();
                e.stopPropagation();

                // W/S Keys: Adjust menu distance
                if (e.code === 'KeyW') {
                    CanvasUI.menuDistance = Math.max(2, CanvasUI.menuDistance - 0.5);
                    CanvasUI.show();
                    console.log('[CanvasUI] Menu distance:', CanvasUI.menuDistance);
                    return;
                } else if (e.code === 'KeyS') {
                    CanvasUI.menuDistance = Math.min(15, CanvasUI.menuDistance + 0.5);
                    CanvasUI.show();
                    console.log('[CanvasUI] Menu distance:', CanvasUI.menuDistance);
                    return;
                }

                // Arrow Keys: Navigate menu buttons
                switch (e.code) {
                    case 'ArrowUp':
                        CanvasUI.navigate('up');
                        break;
                    case 'ArrowDown':
                        CanvasUI.navigate('down');
                        break;
                    case 'ArrowLeft':
                        CanvasUI.navigate('left');
                        break;
                    case 'ArrowRight':
                        CanvasUI.navigate('right');
                        break;
                    case 'Enter':
                        CanvasUI.selectCurrent();
                        break;
                }
            }
        });

        // Expose functions globally
        window.ImmersiveMenuExt = {
            showFileDialog,
            closeFileDialog,
            handleURLUpload,
            handlePDBIDUpload,
            loadRecentFile,
            toggleAdvancedPanel,
            openAdvancedPanel,
            closeAdvancedPanel
        };

        // Initialize
        initFileDialog();
        console.log('[ImmersiveMenuExt] Extensions loaded');
    }
})();
