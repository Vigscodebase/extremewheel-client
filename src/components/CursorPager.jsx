import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Previous / Next controls for a cursor-paginated list (see
 * hooks/queries/useCursorPagination.js — pass it the object that hook returns).
 * Renders nothing while everything fits on one page.
 */
export default function CursorPager({ pager, noun = "items" }) {
  const { page, firstRow, lastRow, total, hasNext, hasPrev, goNext, goPrev, isPageChanging, items } = pager;
  if (items.length === 0 || (page === 1 && !hasNext)) return null;

  return (
    <div className="saved-pagination cursor-pager">
      <span className="text-muted fs-11" aria-live="polite">
        Showing {firstRow}–{lastRow}
        {total != null ? ` of about ${total.toLocaleString()}` : hasNext ? ` ${noun} · more available` : ` ${noun}`}
      </span>
      <div className="saved-pagination-controls">
        <button type="button" className="icon-btn" onClick={goPrev} disabled={!hasPrev} title="Previous page" aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        <span className="fs-11">Page {page}</span>
        <button
          type="button"
          className="btn btn-ghost cursor-pager-next"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next page"
          aria-busy={isPageChanging}
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
