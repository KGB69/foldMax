import { Html } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'

const MENU_DATA = {
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
}

export default function RadialMenu({ isOpen, setIsOpen }) {
    const [history, setHistory] = useState([MENU_DATA])
    // const [isOpen, setIsOpen] = useState(false) // Lifted to App.jsx
    const currentMenu = history[history.length - 1]
    const group = useRef()
    const { camera } = useThree()

    const { menuX, menuY, menuZ } = useControls('Menu Position', {
        menuX: { value: 0, min: -30, max: 30, step: 0.1 },
        menuY: { value: 0, min: -30, max: 30, step: 0.1 },
        menuZ: { value: 16.5, min: 1, max: 30, step: 0.1 },
    })

    // Toggle menu with 'M' key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'KeyM') {
                setIsOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Ensure pointer is unlocked when menu is open
    useEffect(() => {
        if (isOpen) {
            document.exitPointerLock()
        }
    }, [isOpen])

    // Follow camera logic
    useFrame(() => {
        if (group.current) {
            // Calculate target position relative to camera
            const targetPos = new THREE.Vector3(menuX, menuY, -menuZ)
            targetPos.applyMatrix4(camera.matrixWorld)

            // Smoothly interpolate position
            group.current.position.lerp(targetPos, 0.1)
            group.current.lookAt(camera.position)
        }
    })

    const handleItemClick = (item) => {
        if (item.items) {
            setHistory([...history, item])
        } else {
            console.log('Action triggered:', item.id)
            // Here you would trigger the actual app logic
        }
    }

    const handleBack = () => {
        if (history.length > 1) {
            setHistory(history.slice(0, -1))
        }
    }

    return (
        <group ref={group}>
            <AnimatePresence>
                {isOpen && (
                    <Html transform occlude distanceFactor={8} position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
                        <div style={{
                            position: 'relative',
                            width: '600px',
                            height: '600px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            pointerEvents: 'none', // Let clicks pass through to buttons
                        }}>
                            {/* Center Back Button */}
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleBack}
                                style={{
                                    position: 'absolute',
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: 'rgba(0, 0, 0, 0.8)',
                                    border: '2px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    cursor: history.length > 1 ? 'pointer' : 'default',
                                    pointerEvents: 'auto',
                                    zIndex: 10,
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                                }}
                            >
                                {history.length > 1 ? '↩' : 'MENU'}
                                <span style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.7 }}>
                                    {currentMenu.label}
                                </span>
                            </motion.button>

                            {/* Radial Items */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentMenu.id}
                                    initial={{ opacity: 0, rotate: -20, scale: 0.8 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: 20, scale: 0.8 }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {currentMenu.items?.map((item, index) => {
                                        const totalItems = currentMenu.items.length
                                        const angleStep = (2 * Math.PI) / totalItems
                                        const angle = index * angleStep - Math.PI / 2 // Start from top
                                        const radius = 200 // Distance from center

                                        const x = Math.cos(angle) * radius
                                        const y = Math.sin(angle) * radius

                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    position: 'absolute',
                                                    left: '50%',
                                                    top: '50%',
                                                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                                                    width: '90px',
                                                    height: '90px',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleItemClick(item)}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '24px',
                                                        background: 'rgba(30, 30, 30, 0.6)',
                                                        backdropFilter: 'blur(12px)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        pointerEvents: 'auto',
                                                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', maxWidth: '100%' }}>
                                                        {item.label}
                                                    </span>
                                                    {item.items && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '-8px',
                                                            width: '4px',
                                                            height: '4px',
                                                            borderRadius: '50%',
                                                            background: 'white',
                                                            boxShadow: '0 0 5px white'
                                                        }} />
                                                    )}
                                                </motion.button>
                                            </div>
                                        )
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </Html>
                )}
            </AnimatePresence>
        </group>
    )
}
