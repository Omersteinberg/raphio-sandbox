// Measure the pixel position of the caret inside a <textarea>, so a popover
// (the @mention dropdown) can be anchored exactly at the cursor.
//
// A textarea gives us no native way to ask "where is character N on screen?",
// so we use the well-known mirror-div technique: build an off-screen <div> that
// copies every layout-affecting style of the textarea, fill it with the text up
// to the caret, put a marker <span> at the caret, and read the marker's offset.
// Adapted from component/textarea-caret-position (MIT).

// Properties that affect how text wraps/lays out. Copied verbatim onto the mirror.
const MIRRORED_PROPERTIES = [
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak',
];

/**
 * @param {HTMLTextAreaElement} element
 * @param {number} position - caret index (usually element.selectionStart)
 * @returns {{ top: number, left: number, height: number }} coordinates relative
 *   to the textarea's own top-left (i.e. offset within the element, before its
 *   own scroll). Callers should subtract element.scrollTop/scrollLeft if needed.
 */
export function getCaretCoordinates(element, position) {
  const div = document.createElement('div');
  div.id = '__raphio_caret_mirror__';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  MIRRORED_PROPERTIES.forEach((prop) => {
    style[prop] = computed[prop];
  });

  // Firefox reports the textarea's actual height as scrollHeight when it has a
  // fixed height; for auto-resizing textareas the copied height is fine.
  style.overflow = 'hidden';

  div.textContent = element.value.substring(0, position);

  const span = document.createElement('span');
  // The remaining text matters so the marker sits at a real wrap point; a single
  // character is enough to give the span a height.
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10),
    height: parseInt(computed.lineHeight, 10) || parseInt(computed.fontSize, 10),
  };

  document.body.removeChild(div);
  return coordinates;
}
