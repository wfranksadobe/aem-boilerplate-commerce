# UoA news images — AEM Assets DAM export

Article images migrated from auckland.ac.nz news (2024–2026), packaged for upload
to **AEM Assets** under `content/dam/University of Auckland/news`.

- **4,631 images**, organised as `news/<year>/<article-slug>/image-N.jpg`
  (year for browsability, article slug as the folder — no `yyyy/mm/dd` nesting).
- The archive is split into ≤90 MB parts (`parts/`) so each file stays under
  GitHub's 100 MB limit. The full `.tar` itself is git-ignored.

## Reassemble the archive

```sh
cat parts/uoa-news-images.tar.*.part > uoa-news-images.tar
tar -xf uoa-news-images.tar          # extracts the news/ tree
```

Expected checksum of the reassembled tar:

```
107d09b567be5c1b4b8a40d3228dbc7a  uoa-news-images.tar
```

## Upload to AEM

Extract, then upload the `news/` folder into
`content/dam/University of Auckland/` (create the `news` subfolder there if it
does not already exist). The per-year / per-article subfolders are created from
the archive structure.
