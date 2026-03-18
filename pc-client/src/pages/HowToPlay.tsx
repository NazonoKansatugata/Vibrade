import { useNavigate } from 'react-router-dom'
import '../styles/ui.css'

const HowToPlay = () => {
  const navigate = useNavigate()

  return (
    <div className="room-create how-to-play">
      <header className="room-create__header">
        <h1>遊び方</h1>
        <p className="room-create__subtitle">爆転振動！バイブレードの世界へようこそ</p>
      </header>

      <main className="how-to-play__content">
        <section className="how-to-card">
          <div className="how-to-card__icon">📱</div>
          <div className="how-to-card__text">
            <h3>1. 準備・参加</h3>
            <p>PCでルームを作成し、表示されたQRコードをスマホで読み取ります。名前を入力して参加完了！</p>
          </div>
        </section>

        <section className="how-to-card">
          <div className="how-to-card__icon">🔥</div>
          <div className="how-to-card__text">
            <h3>2. ゴー・シュート！</h3>
            <p>カウントダウンに合わせてスマホを力強く振ると、ベイ（コマ）がスタジアムに射出されます。</p>
          </div>
        </section>

        <section className="how-to-card">
          <div className="how-to-card__icon">🌀</div>
          <div className="how-to-card__text">
            <h3>3. 操作方法</h3>
            <p>射出後、スマホを傾けることでベイを自在に操ることができます。相手に体当たりして弾き飛ばせ！</p>
          </div>
        </section>

        <section className="how-to-card">
          <div className="how-to-card__icon">🏆</div>
          <div className="how-to-card__text">
            <h3>4. 勝利条件</h3>
            <p>最後までスタジアム内で回り続けたプレイヤーの勝利です。場外に押し出されないよう注意！</p>
          </div>
        </section>

        <div className="how-to-play__actions">
          <button className="btn btn--secondary btn--large" onClick={() => navigate('/')}>
            タイトルに戻る
          </button>
        </div>
      </main>
    </div>
  )
}

export default HowToPlay
