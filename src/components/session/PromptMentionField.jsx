import { useRef, useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { getCaretCoordinates } from "@/lib/caretCoordinates";

// Wraps the plain shadcn Textarea and adds an "@mention" dropdown so the user can
// insert the EXACT name of a reference they've added. This matters: the scene
// generator looks references up by exact name match, so an inserted "@Barista"
// keeps that character consistent where a hand-typed variant would be dropped.
//
// No rich-text editor - it's a real <textarea>. We detect the active "@token"
// from the caret, anchor a popover at the caret (via getCaretCoordinates), and
// on select splice the exact name back into the value the parent controls.

const MAX_RESULTS = 6;
const DROPDOWN_WIDTH = 264;

const TYPE_LABEL = {
  character: 'Character',
  setting: 'Setting',
  logo: 'Logo',
  product: 'Product',
  image: 'Scene',
  // Intro uploads are whatever the business happens to have: a product shot, a
  // screenshot, a photo of a van. "Scene" and "Product" both misname most of them.
  upload: 'Upload',
  // An intro beat: a scene type the user is asking for by name.
  beat: 'Beat',
};

const TYPE_DOT = {
  character: '#C1440E',
  setting: '#7C3AED',
  logo: '#2563EB',
  product: '#059669',
  image: '#C1440E',
  upload: '#C1440E',
  beat: '#7C3AED',
};

export default function PromptMentionField({ value = "", onChange, references = [], title = "Your references", ...props }) {
  const taRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, height: 0 });
  const [flipUp, setFlipUp] = useState(false);

  const namedRefs = references.filter((r) => r?.name?.trim());

  const results = open
    ? namedRefs
        .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, MAX_RESULTS)
    : [];

  // Inspect the text immediately left of the caret for an "@token". The token is
  // "@" preceded by start-of-string or whitespace, followed by non-space chars.
  const syncMention = useCallback((el) => {
    if (!el || namedRefs.length === 0) { setOpen(false); return; }
    const pos = el.selectionStart;
    const upto = el.value.slice(0, pos);
    const match = upto.match(/(^|\s)@([^\s@]*)$/);
    if (!match) { setOpen(false); return; }

    const q = match[2];
    const start = pos - q.length - 1;
    setQuery(q);
    setMentionStart(start);
    setActiveIndex(0);

    const c = getCaretCoordinates(el, pos);
    setCoords(c);
    // Flip the popover above the caret when there isn't room below it.
    const spaceBelow = el.offsetHeight - (c.top + c.height);
    setFlipUp(spaceBelow < 200 && c.top > 160);
    setOpen(true);
  }, [namedRefs.length]);

  const handleChange = (e) => {
    onChange?.(e);
    syncMention(e.target);
  };

  const insert = (ref) => {
    const el = taRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const name = ref.name.trim();
    const before = value.slice(0, mentionStart);
    const after = value.slice(pos);
    const insertText = `@${name} `;
    const newValue = before + insertText + after;

    onChange?.({ target: { value: newValue } });
    setOpen(false);

    const caret = before.length + insertText.length;
    // Restore focus + caret after the controlled value re-renders.
    requestAnimationFrame(() => {
      const node = taRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insert(results[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Clamp the popover so it never spills past the textarea's right edge.
  const taWidth = taRef.current?.offsetWidth ?? 0;
  const left = taWidth ? Math.min(coords.left, Math.max(8, taWidth - DROPDOWN_WIDTH - 8)) : coords.left;
  const dropdownStyle = flipUp
    ? { top: coords.top - 6, left, transform: 'translateY(-100%)' }
    : { top: coords.top + coords.height + 6, left };

  return (
    <>
      <Textarea
        {...props}
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => syncMention(e.target)}
        onClick={(e) => syncMention(e.target)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute z-50 rounded-xl overflow-hidden"
          style={{
            ...dropdownStyle,
            width: DROPDOWN_WIDTH,
            background: '#ffffff',
            border: '1px solid rgba(193,68,14,0.16)',
            boxShadow: '0 8px 28px rgba(28,25,23,0.16), 0 0 0 1px rgba(193,68,14,0.04)',
          }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#B09A8A', borderBottom: '1px solid rgba(193,68,14,0.08)' }}>
            {title}
          </div>
          {results.map((ref, i) => {
            const active = i === activeIndex;
            const type = ref.id?.startsWith?.('set_') ? 'setting'
              : ref.id?.startsWith?.('logo_') ? 'logo'
              : ref.id?.startsWith?.('prod_') ? 'product'
              : ref.type || 'character';
            return (
              <button
                key={ref.id || ref.name}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => insert(ref)}
                className="w-full text-left px-3 py-2 flex items-start gap-2.5"
                style={{ background: active ? 'rgba(193,68,14,0.08)' : 'transparent', transition: 'background 0.12s ease' }}
              >
                {ref.preview ? (
                  <img src={ref.preview} alt="" className="mt-0.5 flex-shrink-0 rounded object-cover" style={{ width: 22, height: 22 }} />
                ) : (
                  <span className="mt-1.5 flex-shrink-0 rounded-full" style={{ width: 7, height: 7, background: TYPE_DOT[type] || '#C1440E' }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[13px] truncate" style={{ color: 'var(--ink-warm)' }}>{ref.name}</span>
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#9C8F85' }}>{TYPE_LABEL[type] || 'Reference'}</span>
                  </span>
                  {ref.description?.trim() && (
                    <span className="block text-[11px] truncate" style={{ color: '#9C8F85' }}>{ref.description.trim()}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
