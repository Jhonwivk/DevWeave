import { useEffect } from "react";

export type InspectorDetail = {
  category: string;
  title: string;
  record: Record<string, unknown>;
};

export function RecordInspector({
  detail,
  onClose,
}: {
  detail: InspectorDetail;
  onClose: () => void;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="inspector-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="record-inspector"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-inspector-title"
      >
        <header className="inspector-header">
          <div>
            <span>{detail.category}</span>
            <h2 id="record-inspector-title">{detail.title}</h2>
          </div>
          <button type="button" aria-label="关闭详情" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="inspector-body">
          {Object.entries(detail.record).map(([key, value]) => (
            <section className="inspector-field" key={key}>
              <h3>{humanize(key)}</h3>
              <DetailValue value={value} />
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

function DetailValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <p className="inspector-empty">—</p>;
  }
  if (typeof value === "object") {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }
  if (typeof value === "boolean") {
    return <p>{value ? "true" : "false"}</p>;
  }
  return <p>{String(value)}</p>;
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
