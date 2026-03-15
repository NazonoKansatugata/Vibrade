import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

interface QRDisplayProps {
  roomId: string
  serverUrl?: string
}

const MOBILE_PROD_URL = 'https://vibrade-mobile.vercel.app'

// 本番 URL をデフォルトとする。必要に応じて VITE_MOBILE_URL で上書きする
const getBaseUrl = () => {
  if (import.meta.env.VITE_MOBILE_URL) {
    return import.meta.env.VITE_MOBILE_URL;
  }
  return MOBILE_PROD_URL;
}

const QRDisplay = ({ roomId }: QRDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null)

  const serverUrl = getBaseUrl()
  const shouldWarnLocalhost = /localhost|127\.0\.0\.1/.test(serverUrl)
  
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

        {shouldWarnLocalhost ? (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
            <p>⚠️ <strong>ローカルテスト時の注意</strong></p>
            <p className="mt-1">
              現在 <code>localhost</code> で開かれているため、スマホからQRコードを読み取っても正しくアクセスできません。<br/>
              PCのブラウザで <code>http://&lt;PCのIPアドレス&gt;:5173</code> を開き直すと、スマホ用の正しいQRコードが生成されます。
            </p>
          </div>
        ) : (
          <p className="qr-display__hint">
            📱 スマホのカメラでこの QR を読み取ってください
          </p>
        )}
      </div>

      <button className="btn btn--secondary" onClick={handleDownload}>
        QR をダウンロード
      </button>
    </div>
  )
}

export default QRDisplay
