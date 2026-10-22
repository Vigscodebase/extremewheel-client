export default function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="field-error" style={{ color: "var(--color-danger, #d93025)", fontSize: 12, marginTop: 4 }}>
      {message}
    </p>
  );
}
