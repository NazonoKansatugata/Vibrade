import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RoomCreate from './pages/RoomCreate'
import Game from './pages/Game'
import HowToPlay from './pages/HowToPlay'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoomCreate />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
