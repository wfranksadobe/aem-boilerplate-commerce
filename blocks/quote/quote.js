// University of Auckland pull-quote.
// Content model (two rows):
//   row 1: the quotation text
//   row 2 (optional): attribution — first line the name, second line the org
// Renders a <figure><blockquote>…</blockquote><figcaption>…</figcaption></figure>.

export default function decorate(block) {
  const rows = [...block.children];
  const quoteText = rows[0];
  const attribution = rows[1];

  const figure = document.createElement('figure');
  figure.className = 'quote-figure';

  const blockquote = document.createElement('blockquote');
  blockquote.className = 'quote-text';
  // Move the authored quote content (paragraphs) into the blockquote.
  const quoteCell = quoteText?.firstElementChild || quoteText;
  if (quoteCell) {
    while (quoteCell.firstChild) blockquote.append(quoteCell.firstChild);
  }
  figure.append(blockquote);

  if (attribution) {
    const cell = attribution.firstElementChild || attribution;
    const caption = document.createElement('figcaption');
    caption.className = 'quote-attribution';
    // Each line/paragraph becomes a span; the first is the name (emphasised).
    const lines = [...cell.querySelectorAll('p')];
    const parts = lines.length ? lines : [cell];
    parts.forEach((line, i) => {
      const span = document.createElement('span');
      span.className = i === 0 ? 'quote-name' : 'quote-source';
      span.textContent = line.textContent.trim();
      if (span.textContent) caption.append(span);
    });
    if (caption.childNodes.length) figure.append(caption);
  }

  block.replaceChildren(figure);
}
