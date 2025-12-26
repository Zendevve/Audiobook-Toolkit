# ADR-003: Open Library Integration

**Status**: Accepted
**Date**: 2025-12-26
**Owner**: Zendevve
**Related Features**: [MetadataStep](../../src/components/wizard/MetadataStep.tsx)
**Supersedes**: N/A
**Superseded by**: N/A

---

## Context

Audiobook Toolkit needs to help users fill in book metadata (title, author, description, cover art, etc.) without manual typing. This improves user experience and ensures consistent, accurate metadata in the final audiobook.

We needed to choose a metadata source API that:
- Is free to use without API keys
- Provides book information (title, author, year, description)
- Provides cover art images
- Has reasonable rate limits for occasional usage

---

## Decision

Use **Open Library API** as the primary metadata source.

Key points:

- No API key required
- Free and open source (part of Internet Archive)
- Provides: title, subtitle, author, publish year, description, subjects, cover images
- Cover images available in multiple sizes (S, M, L)
- Search by title or ISBN

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/search.json?q={query}` | Search books by title |
| `/works/{id}.json` | Get detailed book info |
| `covers.openlibrary.org/b/id/{id}-{size}.jpg` | Fetch cover images |

### Implementation

```typescript
// lib/open-library.ts
export async function autoFillBookMetadata(query: string) {
  const results = await searchBooks(query);
  const details = await getBookDetails(results[0].key);
  const cover = await fetchCoverImage(results[0].coverId);
  return { ...results[0], ...details, coverData: cover };
}
```

---

## Alternatives Considered

### Google Books API

- Pros: Comprehensive data, high-quality covers
- Cons: API key required, rate limits, Terms of Service restrictions
- Rejected because: Requires API key management, complex OAuth for higher limits

### Audible/Amazon API

- Pros: Best audiobook-specific data
- Cons: No public API, requires affiliate account, legal concerns
- Rejected because: Not publicly accessible

### Goodreads API

- Pros: Community-driven data, ratings
- Cons: API deprecated (2020), no new access
- Rejected because: API is no longer available

### MusicBrainz / AcoustID

- Pros: Audio fingerprinting for identification
- Cons: Designed for music, not audiobooks
- Rejected because: Poor audiobook coverage

---

## Consequences

### Positive

- Zero cost, no API key management
- Works offline for UI (API calls only when user clicks "Auto-fill")
- Good coverage of popular books
- Cover images are high quality
- Aligns with open-source philosophy of the project

### Negative / Risks

- Data quality varies (community-edited)
  - Mitigation: User can edit all fields after auto-fill
- No audiobook-specific data (narrator, series number)
  - Mitigation: User must fill these manually
- Rate limiting possible under heavy use
  - Mitigation: Add retry logic, cache results
- Cover images may be missing for some books
  - Mitigation: Fall back to manual upload

---

## Impact

### Code

- New service: `src/lib/open-library.ts`
- UI integration: `MetadataStep.tsx` calls `autoFillBookMetadata()`
- Network requests: Renderer process makes fetch calls directly

### Data / Configuration

- No API keys or configuration needed
- Results are not persisted/cached (could be added later)

### Documentation

- Feature docs should mention Open Library as data source
- README credits Open Library / Internet Archive

---

## Verification

### Objectives

- Search returns relevant results for common book titles
- Cover images are fetched and displayed correctly
- Metadata fields are populated in the UI
- Errors are handled gracefully (no crash on network failure)

### Test Commands

```bash
# Manual testing (no automated tests yet)
npm run dev
# Enter book title, click Auto-fill, verify fields populate
```

### Future Test Cases

| Test | Expected Result |
|------|-----------------|
| Search "The Hobbit" | Returns Tolkien's book |
| Search "1984" | Returns Orwell's book |
| Search nonsense string | Returns empty array, no crash |
| Network offline | Returns null, shows error gracefully |

---

## References

- [Open Library API Documentation](https://openlibrary.org/developers/api)
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)
- [Internet Archive](https://archive.org/) (parent organization)
