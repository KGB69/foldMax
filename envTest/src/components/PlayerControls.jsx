import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function PlayerControls({ isLocked = true }) {
    const { camera } = useThree()
    const [moveForward, setMoveForward] = useState(false)
    const [moveBackward, setMoveBackward] = useState(false)
    const [moveLeft, setMoveLeft] = useState(false)
    const [moveRight, setMoveRight] = useState(false)
    const velocity = useRef(new THREE.Vector3())
    const direction = useRef(new THREE.Vector3())

    useEffect(() => {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    setMoveForward(true)
                    break
                case 'ArrowLeft':
                case 'KeyA':
                    setMoveLeft(true)
                    break
                case 'ArrowDown':
                case 'KeyS':
                    setMoveBackward(true)
                    break
                case 'ArrowRight':
                case 'KeyD':
                    setMoveRight(true)
                    break
            }
        }

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    setMoveForward(false)
                    break
                case 'ArrowLeft':
                case 'KeyA':
                    setMoveLeft(false)
                    break
                case 'ArrowDown':
                case 'KeyS':
                    setMoveBackward(false)
                    break
                case 'ArrowRight':
                case 'KeyD':
                    setMoveRight(false)
                    break
            }
        }

        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('keyup', onKeyUp)

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.removeEventListener('keyup', onKeyUp)
        }
    }, [])

    useFrame((state, delta) => {
        // Allow movement if controls are locked OR if we are in menu mode (isLocked is false)
        // We check state.controls.isLocked for the active lock state when in Play Mode
        const shouldMove = !isLocked || state.controls?.isLocked === true

        if (shouldMove) {
            const { forward, backward, left, right } = {
                forward: moveForward,
                backward: moveBackward,
                left: moveLeft,
                right: moveRight
            }

            direction.current.z = Number(forward) - Number(backward)
            direction.current.x = Number(right) - Number(left)
            direction.current.normalize()

            if (forward || backward) velocity.current.z += direction.current.z * 80.0 * delta
            if (left || right) velocity.current.x += direction.current.x * 80.0 * delta

            // Friction
            velocity.current.x -= velocity.current.x * 10.0 * delta
            velocity.current.z -= velocity.current.z * 10.0 * delta

            // Move camera on XZ plane only (constrained to ground)
            // Get camera's forward direction but project it onto XZ plane
            const forward3D = new THREE.Vector3()
            camera.getWorldDirection(forward3D)
            forward3D.y = 0 // Flatten to XZ plane
            forward3D.normalize()

            const right3D = new THREE.Vector3()
            right3D.crossVectors(forward3D, new THREE.Vector3(0, 1, 0))
            right3D.normalize()

            // Apply movement in world space
            camera.position.x += (forward3D.x * velocity.current.z + right3D.x * velocity.current.x) * delta
            camera.position.z += (forward3D.z * velocity.current.z + right3D.z * velocity.current.x) * delta

            // Floor constraint
            if (camera.position.y < 1.5) camera.position.y = 1.5 // Eye level

            // Boundary constraint with gentle pushback (Ground size is 50x50, so limits are +/- 25)
            const limit = 23
            const pushbackStrength = 0.8 // Stronger pushback force

            if (camera.position.x > limit) {
                const overshoot = camera.position.x - limit
                camera.position.x -= overshoot * pushbackStrength
                velocity.current.x *= -0.3 // Bounce back
            }
            if (camera.position.x < -limit) {
                const overshoot = -limit - camera.position.x
                camera.position.x += overshoot * pushbackStrength
                velocity.current.x *= -0.3
            }
            if (camera.position.z > limit) {
                const overshoot = camera.position.z - limit
                camera.position.z -= overshoot * pushbackStrength
                velocity.current.z *= -0.3
            }
            if (camera.position.z < -limit) {
                const overshoot = -limit - camera.position.z
                camera.position.z += overshoot * pushbackStrength
                velocity.current.z *= -0.3
            }
        }
    })

    return isLocked ? <PointerLockControls makeDefault /> : null
}
