// Native lazy loading keeps images in the initial HTML for accessibility and SEO,
// while the browser starts downloads as they approach the viewport.
export default function PropertyMedia({ src, loading = 'lazy', alt = '', className = '', children, ...props }) {
  return <div className={`${className} deferred-property-media`} {...props}>
    {src && <img className="deferred-property-image" src={src} alt={alt} loading={loading} decoding="async" />}
    {children}
  </div>
}
