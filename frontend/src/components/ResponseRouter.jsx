import GraphResultPanel from "./GraphResultPanel.jsx";
import KnowledgeAnswerPanel from "./KnowledgeAnswerPanel.jsx";
import PreviewPanel from "./PreviewPanel.jsx";
import ToolResultPanel from "./ToolResultPanel.jsx";

export default function ResponseRouter({ message }) {
  if (message.route === "knowledge") return <KnowledgeAnswerPanel message={message} />;
  if (message.route === "graph") return <GraphResultPanel message={message} />;
  if (message.route === "tool") return <ToolResultPanel message={message} />;
  if (message.route === "image_generation") return <PreviewPanel message={message} />;

  if (message.route === "shopping") {
    return (
      <>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-clay">Verified shopping recommendation</p>
        <p className="whitespace-pre-line">{message.content}</p>
      </>
    );
  }

  const heading = message.status === "error"
    ? "Request failed"
    : message.status === "insufficient_context"
    ? "Insufficient context"
    : message.status === "needs_clarification" || message.route === "unknown"
      ? "A bit more detail needed"
      : "Assistant response";
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-clay">{heading}</p>
      <p className="whitespace-pre-line">{message.content}</p>
    </>
  );
}
