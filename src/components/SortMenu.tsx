import { useState } from "react";
import { SORT_OPTIONS } from "../lib/useFilters";

interface Props {
  sortKey: string;
  onChange: (key: string) => void;
}

export function SortMenu({ sortKey, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((s) => s.key === sortKey) ?? SORT_OPTIONS[0];

  return (
    <div className="sort-menu">
      <button className="sort-menu__trigger" onClick={() => setOpen((o) => !o)}>
        Sort: {current.label.split(":")[0]}
        {current.option.dir === "asc" ? " ↑" : " ↓"}
      </button>
      {open && (
        <>
          <div className="sort-menu__backdrop" onClick={() => setOpen(false)} />
          <div className="sort-menu__list">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                className={`sort-menu__item ${s.key === sortKey ? "sort-menu__item--active" : ""}`}
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
