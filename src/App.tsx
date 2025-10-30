import { useState } from 'react'
import './App.css'
import { GameBoard } from './ui/GameBoard'
import { Hud } from './ui/Hud'
import { Controls } from './ui/Controls'
import { HelpModal } from './ui/HelpModal'

function App() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cut the Plane!</h1>
        <p>Divide the board without hitting the room limit.</p>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowHelp(true)}
          aria-haspopup="dialog"
        >
          Help
        </button>
      </header>
      <main className="app-main">
        <GameBoard />
        <aside className="side-panel">
          <Hud />
          <Controls />
        </aside>
      </main>
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

export default App
