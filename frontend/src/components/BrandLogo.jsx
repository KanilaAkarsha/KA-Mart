export default function BrandLogo({ className = "" }) {
  return (
    <img
      src="/ka-mart-logo.jpg"
      alt="KA Mart - Your One Stop Shopping Store"
      className={`object-contain ${className}`}
    />
  );
}
