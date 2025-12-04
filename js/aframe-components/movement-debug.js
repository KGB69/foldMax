// VR Movement Debug Logger
// Add this to index_aframe.html before </body> to monitor gamepad/movement

AFRAME.registerComponent('movement-debug', {
    init: function () {
        console.log('[MovementDebug] Initializing movement debug logger');

        var self = this;
        var rig = this.el;

        // Log rig setup
        console.log('[MovementDebug] Rig position:', rig.getAttribute('position'));
        console.log('[MovementDebug] Movement-controls:', rig.getAttribute('movement-controls'));

        // Check for gamepads
        setInterval(function () {
            var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            var activeGamepads = [];

            for (var i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    activeGamepads.push({
                        id: gamepads[i].id,
                        axes: gamepads[i].axes,
                        buttons: gamepads[i].buttons.map(b => b.pressed)
                    });
                }
            }

            if (activeGamepads.length > 0) {
                console.log('[MovementDebug] Active Gamepads:', activeGamepads);
            }
        }, 2000); // Log every 2 seconds

        // Monitor position changes
        this.lastPos = rig.getAttribute('position');
        setInterval(function () {
            var currentPos = rig.getAttribute('position');
            if (JSON.stringify(currentPos) !== JSON.stringify(self.lastPos)) {
                console.log('[ MovementDebug] Rig moved:', self.lastPos, '→', currentPos);
                self.lastPos = currentPos;
            }
        }, 500);

        console.log('[MovementDebug] Debug logger active');
    }
});
