import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

interface QRDisplayProps {
  roomId: string
  serverUrl?: string
}

// .env.local に VITE_MOBILE_URL=https://... を設定すれば本番 URL に切り替わる
const BASE_URL = import.meta.env.VITE_MOBILE_URL ?? 'http://localhost:5173'

const QRDisplay = ({ roomId, serverUrl = BASE_URL }: QRDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null)

  // スマホのデフォルト QR リーダーがブラウザで開く URL
  const joinUrl = `${serverUrl}/join?room=${roomId}`

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `vibrade-room-${roomId}.png`
    link.click()
  }

  return (
    <div className="qr-display">
      <h2>プレイヤーを招待</h2>

      <div className="qr-display__code" ref={qrRef}>
        <QRCodeCanvas
          value={joinUrl}
          size={256}
          level="H"
          marginSize={2}
        />
      </div>

      <div className="qr-display__info">
        <p>
          <strong>ルームID:</strong>{' '}
          <span className="qr-display__room-id">{roomId}</span>
        </p>
        <p className="qr-display__hint">
          📱 スマホのカメラでこの QR を読み取ってください
        </p>
      </div>

      <button className="btn btn--secondary" onClick={handleDownload}>
        QR をダウンロード
      </button>
    </div>
  )
}

export default QRDisplay
