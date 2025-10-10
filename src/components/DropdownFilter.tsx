import { useEffect, useMemo, useRef, useState } from 'react';

export type DropdownOption = { value: string; label: string };

type Props = {
  label: string;
  options: DropdownOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  multi?: boolean;
  searchable?: boolean;
};

export default function DropdownFilter({ label, options, selectedValues, onChange, placeholder, multi = true, searchable = true }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  const title = useMemo(() => {
    if (selectedValues.length === 0) return label;
    if (selectedValues.length === 1) {
      const opt = options.find(o => o.value === selectedValues[0]);
      return `${label}: ${opt?.label ?? selectedValues[0]}`;
    }
    return `${label}: ${selectedValues.length}`;
  }, [label, options, selectedValues]);

  function toggleValue(v: string) {
    if (!multi) {
      onChange([v]);
      setOpen(false);
      return;
    }
    const set = new Set(selectedValues);
    if (set.has(v)) set.delete(v); else set.add(v);
    onChange(Array.from(set));
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  return (
    <div ref={containerRef} className="dropdown" style={{ position: 'relative' }}>
      <button type="button" className="dropdown-trigger" onClick={() => setOpen(v => !v)}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        {selectedValues.length > 0 && (
          <span className="badge">{selectedValues.length}</span>
        )}
      </button>
      {open && (
        <div className="dropdown-menu card" style={{ position: 'absolute', zIndex: 20, marginTop: 8, minWidth: 220 }}>
          {searchable && (
            <input
              className="input"
              placeholder={placeholder || `Search ${label.toLowerCase()}...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          )}
          <div className="dropdown-options" style={{ maxHeight: 220, overflow: 'auto', marginTop: 8, display: 'grid', gap: 4 }}>
            {filtered.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: 6 }}>No options</div>
            )}
            {filtered.map(opt => {
              const active = selectedValues.includes(opt.value);
              return (
                <label key={opt.value} className={`dropdown-option${active ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  {multi ? (
                    <input type="checkbox" checked={active} onChange={() => toggleValue(opt.value)} />
                  ) : (
                    <input type="radio" name={label} checked={active} onChange={() => toggleValue(opt.value)} />
                  )}
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
            <button type="button" onClick={clearAll} style={{ background: '#f2f2ed', color: 'var(--fg)' }}>Clear</button>
            <button type="button" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}


