import { useEffect } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useSensor } from '../hooks/useSensor'
import { useSocket } from '../hooks/useSocket'
import { GestureState } from '../sensors/gestureDetector'
import { Wifi, WifiOff } from 'lucide-react'

const GameController = () => {
  const location = useLocation()
  const { roomId, playerName } = location.state || {}

  const sensorData = useSensor()
  const { isConnected, gameState, sendInput } = useSocket(roomId || '', playerName || '')

  // 30fps (約33ms) で操作情報をサーバーに送信
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      sendInput(sensorData.tiltX, sensorData.tiltY, sensorData.shakePower)
    }, 33)

    return () => clearInterval(interval)
  }, [isConnected, sendInput, sensorData.tiltX, sensorData.tiltY, sensorData.shakePower])

  if (!roomId || !playerName) {
    return <Navigate to="/join" replace />
  }

  // 状態に応じたカラー
  const getGestureColor = (state: GestureState) => {
    switch(state) {
      case GestureState.PULLING: return 'text-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] bg-yellow-400/10'
      case GestureState.LAUNCH: return 'text-red-500 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] bg-red-500/20 scale-110 transition-transform'
      case GestureState.COOLDOWN: return 'text-slate-500 border-slate-500 bg-slate-800'
      default: return 'text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)] bg-indigo-500/5'
    }
  }

  // 傾きを視覚化するためのスタイル計算 (max 40px移動)
  const tiltDotStyle = {
    transform: `translate(${sensorData.tiltX * 40}px, ${sensorData.tiltY * 40}px)`,
    transition: 'transform 0.1s ease-out'
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white p-4 select-none touch-none overflow-hidden">
      
      {/* Header Info */}
      <div className="w-full max-w-md mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700 shadow-lg flex justify-between items-center z-10 relative">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Player</span>
          <span className="font-bold text-lg leading-tight">{playerName}</span>
        </div>
        
        <div className="flex flex-col items-center">
          {isConnected ? (
             <div className="flex items-center gap-1 text-emerald-400">
               <Wifi className="w-4 h-4" />
               <span className="text-xs font-bold font-mono">ON</span>
             </div>
          ) : (
             <div className="flex items-center gap-1 text-slate-500">
               <WifiOff className="w-4 h-4" />
               <span className="text-xs font-bold font-mono">OFF</span>
             </div>
          )}
        </div>

        <div className="flex flex-col text-right">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Room</span>
          <span className="font-mono text-indigo-400 font-bold leading-tight">{roomId}</span>
        </div>
      </div>

      {/* Main Controller Area */}
      <div className="flex-1 w-full max-w-md mx-auto my-4 bg-slate-800/40 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden">
        
        {/* Background glow based on game state */ }
        <div className={`absolute inset-0 transition-colors duration-500 ${gameState.state === 'playing' ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]' : 'bg-slate-900/50'}`}></div>

        <div className="z-10 w-full px-8 flex flex-col items-center gap-12">
          
          {/* Game Status or Instructional Text */}
          <div className="text-center h-12 flex items-center justify-center">
             {gameState.state === 'waiting' && <p className="text-indigo-300 font-medium animate-pulse text-lg tracking-wide">PCでゲーム開始を待っています...</p>}
             {gameState.state === 'playing' && <p className="text-white font-bold text-2xl tracking-widest drop-shadow-md">BATTLE STAGE</p>}
          </div>
          
          {/* Tilt Indicator */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-2 border-slate-700 bg-slate-900/50 flex items-center justify-center shadow-inner relative overflow-hidden">
               {/* Center crosshair */}
               <div className="absolute w-full h-[1px] bg-slate-700/50"></div>
               <div className="absolute h-full w-[1px] bg-slate-700/50"></div>
               
               {/* Moving Dot */}
               <div 
                 className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-400 shadow-[0_0_15px_rgba(99,102,241,0.6)] border border-indigo-300 relative"
                 style={tiltDotStyle}
               >
                 <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/30 to-transparent"></div>
               </div>
            </div>
            <p className="text-center text-xs text-slate-500 mt-4 uppercase tracking-widest font-semibold">Tilt Control</p>
          </div>

          {/* Shake/Shoot Indicator */}
          <div className="w-full">
            <div className={`w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-200 ${getGestureColor(sensorData.gestureState)}`}>
               <span className="font-bold text-xl tracking-wider">
                 {sensorData.gestureState === GestureState.IDLE && 'IDLE'}
                 {sensorData.gestureState === GestureState.PULLING && 'PULL'}
                 {sensorData.gestureState === GestureState.LAUNCH && 'FIRE!'}
                 {sensorData.gestureState === GestureState.COOLDOWN && 'WAIT'}
               </span>
            </div>
            
            <div className="mt-8">
              <div className="flex justify-between text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                <span>Power</span>
                <span>{(sensorData.shakePower * 100).toFixed(0)}%</span>
              </div>
              <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 transition-all duration-75"
                  style={{ width: `${sensorData.shakePower * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default GameController
