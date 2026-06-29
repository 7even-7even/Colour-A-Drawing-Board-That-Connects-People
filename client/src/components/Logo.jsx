// "Colour" brand logo. Uses the official artwork in /public:
//   - logo-wordmark.png : full "Colour" script (use on the landing page)
//   - logo-icon.png     : square "C" mark (use in bars/sidebar/favicon)
//
// withWordmark=true  -> show the full wordmark image (no separate text).
// withWordmark=false -> show just the "C" icon.
export default function Logo({ size = 28, withWordmark = false }) {
  if (withWordmark) {
    return (
      <span className="brand-logo wordmark-img" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <img
          src="/logo-wordmark.png"
          alt="Colour"
          style={{ height: size, width: 'auto', display: 'block' }}
        />
      </span>
    );
  }
  return (
    <span className="brand-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img
        src="/logo-icon.png"
        alt="Colour"
        style={{ height: size, width: size, objectFit: 'contain', display: 'block' }}
      />
      <strong className="brand-wordmark">Colour</strong>
    </span>
  );
}
