export default function PreviewPanel({ message }) {
  const preview = message.preview || {};
  const unavailable = preview.status === "unavailable" || message.status === "unavailable";
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-clay">AI-generated preview</p>
      <p className="text-sm">{unavailable ? preview.message || message.content : message.content}</p>
      <p className="mt-2 text-xs text-ink/60">Preview status: {preview.status || message.status || "unknown"}</p>
      {preview.imageUrl ? (
        <img src={preview.imageUrl} alt="AI-generated shopping bundle preview" className="mt-3 w-full rounded-lg" />
      ) : null}
      {preview.disclaimer ? (
        <p className="mt-3 border-t border-sand/70 pt-3 text-sm font-semibold text-clay">{preview.disclaimer}</p>
      ) : null}
    </>
  );
}
