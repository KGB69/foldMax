import Scene from './components/Scene'
import RadialMenu from './components/RadialMenu'
import Ground from './components/Ground'
import PlayerControls from './components/PlayerControls'
import { Float, Text } from '@react-three/drei'

import { useState } from 'react'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <Scene>
      <PlayerControls isLocked={!isMenuOpen} />
      <Ground />

      {/* Menu floating in front of start position */}
      <RadialMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
    </Scene>
  )
}

export default App
