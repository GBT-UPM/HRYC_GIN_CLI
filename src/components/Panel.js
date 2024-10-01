export default function Panel({
  title,
  body,
  children,
  alignCenter = false,
  color = "#4E4D4D",
  backgroundColor = "none",
  isResponseEmpty,
  className,
}) {
  return (
    <div  className={className}>
      <div
        className="panelWrapper"
        style={{
          alignItems: alignCenter ? "center" : "flex-start",
          backgroundColor,
          borderStyle: isResponseEmpty ? "solid" : "none",
          borderColor: isResponseEmpty ? "#F74141" : "",
        }}>
        {!!title && <h1 className="title f-bold">{title}</h1>}
        {!!body && (
          <span className="strap" style={{ color }}>
            {body}
          </span>
        )}
        {children}
      </div>
      {isResponseEmpty && (
        <div className="errorText">This question requires an answer</div>
      )}
    </div>
  );
}
