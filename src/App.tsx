import { useEffect, useState } from 'react'
import './App.css'
import { GameBoard } from './ui/GameBoard'
import { Hud } from './ui/Hud'
import { Controls } from './ui/Controls'
import { HelpModal } from './ui/HelpModal'
import { GameOverModal } from './ui/GameOverModal'
import { useGameStore } from './hooks/useGameStore'

function App() {
  const [showHelp, setShowHelp] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const game = useGameStore((state) => state.game)
  const startNewGame = useGameStore((state) => state.startNewGame)

  useEffect(() => {
    if (game.status === 'finished') {
      setShowGameOver(true)
    } else {
      setShowGameOver(false)
    }
  }, [game.status])

  const handleRestart = () => {
    startNewGame()
    setShowGameOver(false)
  }

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
      <footer className="app-footer">
        <span>
          View the project on{' '}
          <a href="https://github.com/shizuo-kaji/CutThePlane" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </span>
      </footer>
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      <GameOverModal
        open={showGameOver}
        loser={game.loser}
        rooms={game.rooms}
        target={game.config.targetRooms}
        onClose={() => setShowGameOver(false)}
        onRestart={handleRestart}
      />
    </div>
  )
}

export default App
