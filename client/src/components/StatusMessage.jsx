export default function StatusMessage({ message }) {
  if (!message) return null;
  return <div className={`status ${message.kind || 'info'}`} role="status">{message.text}</div>;
}
