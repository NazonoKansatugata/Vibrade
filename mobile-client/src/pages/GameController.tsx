import { useEffect, useRef } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useSensor } from '../hooks/useSensor'
import { useSocket } from '../hooks/useSocket'
import { useHapticFeedback, getHapticMode } from '../hooks/useHapticFeedback'
import { GestureState } from '../sensors/gestureDetector'
import { Wifi, WifiOff } from 'lucide-react'

const GameController = () => {
  const location = useLocation()
  const { roomId, playerName, beyType } = location.state || {}

  const sensorData = useSensor()
  const { isConnected, gameState, sendInput, isVibrationSupported } = useSocket(
    roomId || '',
    playerName || '',
    beyType || 'balance'
  )
  const { triggerFeedback, isSupported: isHapticOrSoundSupported } = useHapticFeedback()
  const hapticMode = getHapticMode()
  const latestSensorRef = useRef({ tiltX: 0, tiltY: 0, shakePower: 0 })
  const sendInputRef = useRef(sendInput)

  useEffect(() => {
    latestSensorRef.current = {
      tiltX: sensorData.tiltX,
      tiltY: sensorData.tiltY,
      shakePower: sensorData.shakePower,
    }
  }, [sensorData.tiltX, sensorData.tiltY, sensorData.shakePower])

  useEffect(() => {
    sendInputRef.current = sendInput
  }, [sendInput])

  // 30fps で操作情報をサーバーに送信
  useEffect(() => {
    if (!isConnected) return
    const interval = setInterval(() => {
      const { tiltX, tiltY, shakePower } = latestSensorRef.current
      sendInputRef.current(tiltX, tiltY, shakePower)
    }, 33)
    return () => clearInterval(interval)
  }, [isConnected])

  if (!roomId || !playerName) {
    return <Navigate to="/join" replace />
  }

  // ジェスチャー状態に合わせたスタイル
  const gestureConfig = {
    [GestureState.IDLE]: {
      label: 'READY',
      ring: 'border-violet-500/40',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]',
      dot: 'bg-violet-500',
      text: 'text-violet-400',
      bg: 'bg-violet-500/5',
    },
    [GestureState.PULLING]: {
      label: 'PULLING',
      ring: 'border-yellow-400',
      glow: 'shadow-[0_0_30px_rgba(250,204,21,0.4)]',
      dot: 'bg-yellow-400',
      text: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    [GestureState.LAUNCH]: {
      label: 'FIRE!!',
      ring: 'border-red-500',
      glow: 'shadow-[0_0_40px_rgba(239,68,68,0.7)]',
      dot: 'bg-red-500',
      text: 'text-red-400',
      bg: 'bg-red-500/15',
    },
    [GestureState.COOLDOWN]: {
      label: 'RELOAD',
      ring: 'border-slate-600',
      glow: '',
      dot: 'bg-slate-600',
      text: 'text-slate-500',
      bg: 'bg-slate-800/50',
    },
  }

  const gc = gestureConfig[sensorData.gestureState]

  const tiltDotStyle = {
    transform: `translate(${sensorData.tiltX * 45}px, ${sensorData.tiltY * 45}px)`,
    transition: 'transform 0.08s ease-out',
  }

  const powerPct = Math.round(sensorData.shakePower * 100)
  const isLaunchReady = gameState?.status === 'armed'

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a12] text-white select-none touch-none overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-500 ${
          sensorData.gestureState === GestureState.LAUNCH ? 'bg-red-700/25' :
          sensorData.gestureState === GestureState.PULLING ? 'bg-yellow-700/15' :
          'bg-violet-700/10'
        }`} />
      </div>

      {/* ── Header ── */}
      <div className="w-full px-4 pt-4 pb-3 flex items-center justify-between z-10">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Player</span>
          <span className="font-black text-base leading-tight">{playerName}</span>
        </div>

        {isConnected ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Connected</span>
            </div>
            <span className={`text-[8px] uppercase tracking-tighter ${isVibrationSupported ? 'text-emerald-500/50' : 'text-red-500/50'}`}>
              Vibrate: {isVibrationSupported ? 'OK' : 'NO'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
            <WifiOff className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Offline</span>
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Room</span>
          <span className="font-mono font-black text-base text-violet-300 leading-tight">{roomId}</span>
        </div>
      </div>

      {/* ── Game Status Banner ── */}
      <div className="px-4 z-10">
        <div className={`rounded-2xl border px-4 py-2.5 text-center transition-all duration-500 ${
          gameState?.isGameActive
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-white/5 border-white/5'
        }`}>
          {!gameState && (
            <p className="text-xs text-slate-400 animate-pulse tracking-widest uppercase">Connecting to Room...</p>
          )}
          {gameState?.status === 'waiting' && !gameState.winnerId && (
            <p className="text-xs text-slate-400 animate-pulse tracking-widest uppercase">Waiting for host to start...</p>
          )}
          {isLaunchReady && !gameState?.winnerId && (
            <p className="text-xs text-yellow-400 font-bold tracking-widest uppercase">Ready to Launch</p>
          )}
          {gameState?.isGameActive && (
            <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase">● Battle in Progress</p>
          )}
          {gameState && !gameState.isGameActive && gameState.winnerId && (
            <p className="text-xs text-violet-400 font-bold tracking-widest uppercase">Game Over</p>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-6 z-10">

        {/* Tilt Joystick */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-44 h-44 rounded-full bg-black/50 border border-white/10 shadow-inner flex items-center justify-center">
            {/* Grid lines */}
            <div className="absolute w-full h-[1px] bg-white/5" />
            <div className="absolute h-full w-[1px] bg-white/5" />
            {/* Outer ring */}
            <div className="absolute inset-3 rounded-full border border-white/5" />

            {/* Moving dot */}
            <div className="w-12 h-12 rounded-full relative z-10" style={tiltDotStyle}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-blue-600 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">傾きで方向制御</p>
        </div>

        {/* Shake / Gesture indicator */}
        <div className={`w-full rounded-3xl border-2 p-5 transition-all duration-200 ${gc.ring} ${gc.glow} ${gc.bg}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Action</p>
              <p className={`text-2xl font-black tracking-widest ${gc.text}`}>{gc.label}</p>
            </div>
            {/* Animated dot */}
            <div className={`w-4 h-4 rounded-full ${gc.dot} ${sensorData.gestureState === GestureState.PULLING || sensorData.gestureState === GestureState.LAUNCH ? 'animate-ping' : ''}`} />
          </div>

          {/* Power bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">
              <span>Power</span>
              <span className="font-mono font-bold text-white">{powerPct}%</span>
            </div>
            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${powerPct}%`,
                  background: `linear-gradient(90deg, #6d28d9, ${
                    powerPct > 70 ? '#ef4444' : powerPct > 40 ? '#eab308' : '#7c3aed'
                  })`,
                  boxShadow: powerPct > 0 ? '0 0 8px rgba(139,92,246,0.5)' : 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-[11px] text-slate-600 text-center leading-relaxed">
          スマホを<strong className="text-slate-400">強く振る</strong>とベイを発射 ／ <strong className="text-slate-400">傾ける</strong>と移動
        </p>

        {/* Haptic Test */}
        <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.18em]">Haptic Test</p>
            <span className={`text-[9px] uppercase tracking-widest ${isHapticOrSoundSupported ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
              {hapticMode === 'vibration-api' && 'VIBRATE API'}
              {hapticMode === 'ios-checkbox' && '✦ iOS HAPTIC'}
              {hapticMode === 'none' && 'UNAVAILABLE'}
            </span>
          </div>
          <button
            className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-colors"
            onClick={() => triggerFeedback([100])}
          >
            Test Vibration
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameController
