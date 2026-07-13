export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}