export default function BrandMark({ title, className = '' }) {
  return (
    <span className={`topbar-brand ${className}`.trim()}>
      <img src="/step-solar-logo.png" alt="Step Solar" />
      {title ? <span>{title}</span> : null}
    </span>
  );
}
