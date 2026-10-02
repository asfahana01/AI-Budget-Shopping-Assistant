export default function KnowledgeAnswerPanel({ message }) {
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-clay">Answer from product knowledge base</p>
      <p className="whitespace-pre-line">{message.content}</p>
      {message.status === "insufficient_context" ? (
        <p className="mt-2 text-xs font-medium text-clay">No reliable matching source was found.</p>
      ) : null}
      {message.sources?.length ? (
        <div className="mt-3 border-t border-sand/70 pt-2 text-xs">
          <p className="font-medium">Sources · {message.retrievedChunks ?? message.sources.length} chunks retrieved</p>
          {message.sources.map((source) => (
            <p key={source.source} className="mt-1 text-ink/70">
              {source.source} · Score: {Number(source.score).toFixed(2)}
            </p>
          ))}
        </div>
      ) : null}
    </>
  );
}
