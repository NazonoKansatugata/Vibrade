import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RoomJoin from './pages/RoomJoin'
import NameInputPage from './pages/NameInputPage'
import GameController from './pages/GameController'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<RoomJoin />} />
        <Route path="/enter-name" element={<NameInputPage />} />
        <Route path="/game" element={<GameController />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
