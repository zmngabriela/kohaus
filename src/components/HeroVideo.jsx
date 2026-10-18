import { useEffect, useRef, useState } from 'react'

export default function HeroVideo() {
  const video = useRef(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const element = video.current
    let disposed = false
    let pending = false
    const play = async () => {
      if (disposed || pending || document.hidden || !element.paused) return
      pending = true
      element.muted = true
      element.defaultMuted = true
      try { await element.play() } catch { /* Keep the still image if autoplay is blocked. */ }
      finally { pending = false }
    }
    element.muted = true
    element.defaultMuted = true
    element.setAttribute('muted', '')
    element.setAttribute('playsinline', '')
    element.addEventListener('canplay', play)
    document.addEventListener('visibilitychange', play)
    window.addEventListener('pageshow', play)
    // A normal interaction can unlock playback without a separate play button.
    document.addEventListener('pointerdown', play, true)
    document.addEventListener('touchend', play, true)
    document.addEventListener('keydown', play, true)
    play()
    return () => {
      disposed = true
      element.removeEventListener('canplay', play)
      document.removeEventListener('visibilitychange', play)
      window.removeEventListener('pageshow', play)
      document.removeEventListener('pointerdown', play, true)
      document.removeEventListener('touchend', play, true)
      document.removeEventListener('keydown', play, true)
    }
  }, [])
  return <div className="hero-video-media" aria-hidden="true">
    <img className="hero-video-poster" src="/media/kohaus-hero-poster.jpg" alt="" />
    <video ref={video} autoPlay muted loop playsInline controls={false} preload="auto" style={{opacity: playing ? 1 : 0}} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)}>
      <source src="/media/kohaus-hero-loop-compatible.mp4" type="video/mp4" />
    </video>
  </div>
}
