import { Html } from '@react-three/drei'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Menu() {
    const [active, setActive] = useState('dashboard')

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'messages', label: 'Messages', icon: '💬' },
    ]

    return (
        <group position={[2, 0, 0]} rotation={[0, -0.3, 0]}>
            <Html transform occlude distanceFactor={1.5} position={[0, 0, 0]}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="menu-container"
                    style={{
                        background: 'rgba(20, 20, 20, 0.6)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        padding: '2rem',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        width: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        fontFamily: "'Inter', sans-serif",
                        userSelect: 'none',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>System</h2>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                    </div>

                    {menuItems.map((item) => (
                        <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActive(item.id)}
                            style={{
                                background: active === item.id ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))' : 'transparent',
                                border: '1px solid',
                                borderColor: active === item.id ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                                borderRadius: '16px',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                cursor: 'pointer',
                                color: active === item.id ? 'white' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '1rem',
                                fontWeight: 500,
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                        >
                            <span style={{ fontSize: '1.2rem', filter: active === item.id ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'none' }}>{item.icon}</span>
                            {item.label}
                            {active === item.id && (
                                <motion.div
                                    layoutId="active-indicator"
                                    style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}
                                />
                            )}
                        </motion.button>
                    ))}
                </motion.div>
            </Html>
        </group>
    )
}
