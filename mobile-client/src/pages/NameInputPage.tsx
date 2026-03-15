import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Rocket, AlertTriangle } from 'lucide-react'

// Request device motion permission for iOS 13+
const requestSensorPermission = async (): Promise<boolean> => {
  try {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission: () => Promise<PermissionState> }).requestPermission === 'function'
    ) {
      const permissionState = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<PermissionState> }).requestPermission()
      return permissionState === 'granted'
    }
    // Android or older iOS, browser automatically grants
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
  const [isRequesting, setIsRequesting] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // ルームIDがない場合はルーム参加ページへ戻す
  if (!roomId) {
    return <Navigate to="/join" replace />
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim() || isRequesting) return

    setIsRequesting(true)
    setPermissionDenied(false)

    // リクエスト許可 (iOSでポップアップが出る)
    const granted = await requestSensorPermission()
    if (granted) {
      navigate('/game', { state: { roomId, playerName: playerName.trim() } })
    } else {
      setPermissionDenied(true)
      setIsRequesting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl overflow-hidden transform transition-all border border-slate-700">
        
        <div className="p-8 pb-6 bg-gradient-to-br from-indigo-900 to-slate-800 text-center">
          <div className="mb-2">
            <span className="inline-block bg-slate-900 text-indigo-300 font-mono px-3 py-1 rounded-full text-sm border border-slate-700">
              Room: <strong className="text-white">{roomId}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">プレイヤー名を入力</h1>
        </div>

        <div className="p-8 border-t border-slate-700">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前 (最大10文字)"
                maxLength={10}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-sm text-indigo-200">
              <p className="mb-2 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-indigo-400" />
                <span>
                  <strong>重要:</strong> 次の画面に進む際、センサーへのアクセス許可を求めるメッセージが表示されます。
                </span>
              </p>
              <p className="pl-7 text-indigo-300">
                『"xxx"が動作と方向へのアクセスを求めています』と出たら、必ず「許可」を選択してください。ゲームの操作に必要です。
              </p>
            </div>

            {permissionDenied && (
              <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">
                センサーの使用が許可されませんでした。設定を確認して再度お試しください。
              </div>
            )}

            <button
              type="submit"
              disabled={!playerName.trim() || isRequesting}
              className="w-full group bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
            >
              <span>{isRequesting ? '確認中...' : 'センサーを有効にして入室'}</span>
              <Rocket className={`w-5 h-5 ${isRequesting ? 'animate-pulse' : 'group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform'}`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default NameInputPage
