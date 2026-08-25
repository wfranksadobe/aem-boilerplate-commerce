// University of Auckland media contact — a grey callout box at the foot of an
// article. Content model (two rows):
//   row 1 (optional): heading (defaults to "Media contact")
//   row 2: the contact details (name, phone, email …)

export default function decorate(block) {
  const rows = [...block.children];
  let headingText = 'Media contact';
  let detailsRow = rows[0];

  // If two rows are authored, the first is the heading and the second details.
  if (rows.length > 1) {
    headingText = (rows[0].textContent || '').trim() || headingText;
    [, detailsRow] = rows;
  }

  const heading = document.createElement('h3');
  heading.className = 'media-contact-heading';
  heading.textContent = headingText;

  const details = document.createElement('div');
  details.className = 'media-contact-details';
  const cell = detailsRow?.firstElementChild || detailsRow;
  if (cell) {
    while (cell.firstChild) details.append(cell.firstChild);
  }

  block.replaceChildren(heading, details);
}
