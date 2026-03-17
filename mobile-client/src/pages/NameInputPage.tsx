import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Rocket, ShieldAlert } from 'lucide-react'

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission: () => Promise<PermissionState>
}

const BEY_TYPES = [
  { id: 'balance', name: 'バランス', desc: '標準的な性能', color: 'from-slate-400 to-slate-600' },
  { id: 'power', name: 'パワー', desc: '攻撃力が高くダメージ大', color: 'from-orange-400 to-red-500' },
  { id: 'defense', name: 'ディフェンス', desc: '相手を遠くに吹き飛ばす', color: 'from-blue-400 to-cyan-500' },
  { id: 'weight', name: 'スタミナ', desc: '最大体力が20%多い', color: 'from-emerald-400 to-lime-500' },
] as const

const requestSensorPermission = async (): Promise<boolean> => {
  try {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as DeviceMotionEventWithPermission).requestPermission === 'function'
    ) {
      const permissionState = await (DeviceMotionEvent as unknown as DeviceMotionEventWithPermission).requestPermission()
      return permissionState === 'granted'
    }
    return true
  } catch (error) {
    console.error('Sensor permission denied or error:', error)
    return false
  }
}

const NameInputPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const roomId = location.state?.roomId
  const [playerName, setPlayerName] = useState('')
  const [selectedType, setSelectedType] = useState<typeof BEY_TYPES[number]['id'] | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  if (!roomId) {
    return <Navigate to="/join" replace />
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim() || !selectedType || isRequesting) return
    setIsRequesting(true)
    setPermissionDenied(false)
    const granted = await requestSensorPermission()
    if (granted) {
      navigate('/game', {
        state: {
          roomId,
          playerName: playerName.trim(),
          beyType: selectedType
        }
      })
    } else {
      setPermissionDenied(true)
      setIsRequesting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a12] text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-700/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm px-6 z-10">
        {/* Room Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
            <span className="text-slate-400">Room</span>
            <span className="font-mono font-bold text-violet-300 tracking-widest">{roomId}</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white">プレイヤー名を<br/>入力してください</h1>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <form onSubmit={handleJoin} className="p-6 space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="プレイヤー名（最大10文字）"
              maxLength={10}
              autoFocus
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all text-center text-lg"
            />

            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold ml-1">コマの種類を選択</p>
              <div className="grid grid-cols-2 gap-3">
                {BEY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                      selectedType === type.id
                        ? 'bg-white/10 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                        : 'bg-black/20 border-white/5 grayscale-[0.3]'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mb-1 bg-gradient-to-r ${type.color}`} />
                    <p className={`text-sm font-black tracking-tight ${selectedType === type.id ? 'text-white' : 'text-slate-400'}`}>
                      {type.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      {type.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* iOS permission notice */}
            <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 text-sm">
              <ShieldAlert className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <p className="text-violet-200 leading-relaxed">
                次の画面でセンサーの使用許可を求めるメッセージが表示されます。<strong>「許可」</strong>を選択してください。
              </p>
            </div>

            {permissionDenied && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 py-3 px-4 rounded-2xl border border-red-500/20">
                センサーの許可が得られませんでした。設定から許可して再度お試しください。
              </div>
            )}

            <button
              type="submit"
              disabled={!playerName.trim() || !selectedType || isRequesting}
              className="w-full group relative bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:from-slate-700/50 disabled:to-slate-700/50 disabled:border-white/5 disabled:text-slate-500 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:shadow-none"
            >
              {isRequesting ? (
                <span className="animate-pulse tracking-wider">確認中...</span>
              ) : (
                <>
                  <span className="tracking-wider">センサーを有効にして入室</span>
                  <Rocket className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default NameInputPage
