// Plays a local video file, or embeds a YouTube / Bilibili player URL.
// Local demo clips are silent, so they autoplay muted and loop like a GIF,
// with controls kept for pausing or going full screen.
export default function MediaEmbed({ src, title, poster }) {
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(src)) {
    return (
      <div className="media-frame">
        <video src={src} poster={poster || undefined} autoPlay muted loop playsInline controls preload="metadata" aria-label={title} />
      </div>
    )
  }
  return (
    <div className="media-frame">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
