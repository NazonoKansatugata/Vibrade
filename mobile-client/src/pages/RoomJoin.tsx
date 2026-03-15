import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QrCode, ArrowRight } from 'lucide-react'

const RoomJoin = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [manualRoomId, setManualRoomId] = useState('')

  useEffect(() => {
    // QRコードから自動抽出した roomId
    const roomId = searchParams.get('room')
    
    if (roomId) {
      // 自動的に次ステップへ
      navigate('/enter-name', { state: { roomId } })
    }
  }, [searchParams, navigate])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualRoomId.trim()) {
      navigate('/enter-name', { state: { roomId: manualRoomId.trim().toUpperCase() } })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl overflow-hidden transform transition-all border border-slate-700">
        
        <div className="p-8 pb-6 bg-gradient-to-br from-indigo-900 to-slate-800 text-center">
          <div className="mx-auto bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-indigo-400/30">
            <QrCode className="w-8 h-8 text-indigo-300" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-white">ルームに参加</h1>
        </div>

        <div className="p-8 border-t border-slate-700">
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-slate-300 mb-2">
                ルームIDを手動で入力
              </label>
              <input
                id="roomId"
                type="text"
                value={manualRoomId}
                onChange={(e) => setManualRoomId(e.target.value.toUpperCase())}
                placeholder="例: ABCD12"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all tracking-wider text-center text-lg font-mono uppercase"
              />
            </div>
            
            <button
              type="submit"
              disabled={!manualRoomId.trim()}
              className="w-full group bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <span>次へ</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              または、PC側のQRコードを<br/>スマホカメラで読み込んでください
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomJoin
