import DocsButton from "./DocsButton";
import "./SchoolPageHeader.css";

function SchoolPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  titleIcon,
  titleAs = "h1",
  className = "",
  actionsClassName = "",
}) {
  const Title = titleAs;
  return (
    <section
      className={`school-page-heading ${className}`.trim()}
      aria-label={title}
    >
      <div className="school-page-heading-copy">
        {eyebrow ? <p className="page-kicker">{eyebrow}</p> : null}
        <div className="school-page-heading-title">
          {titleIcon}
          <Title>{title}</Title>
        </div>
        {description ? <p>{description}</p> : null}
        {meta}
      </div>
      <div className={`school-page-heading-actions ${actionsClassName}`.trim()}>
        <DocsButton />
        {actions}
      </div>
    </section>
  );
}

export default SchoolPageHeader;
