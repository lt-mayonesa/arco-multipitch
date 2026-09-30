import { createPortal } from "react-dom";

/** Portalled to <body>: the sheet is transformed, which would trap position:fixed. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return createPortal(
    <div className="toast" role="status">
      {message}
    </div>,
    document.body,
  );
}
