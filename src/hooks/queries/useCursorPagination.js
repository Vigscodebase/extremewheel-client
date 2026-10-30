import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

export const PAGE_SIZE = 10;
const EMPTY = [];

// The server answers 400 { code: "INVALID_CURSOR" } when a cursor has expired or
// doesn't belong to this list any more; CURSOR_MISSING is the same situation
// detected locally (the previous page was evicted from the cache).
const isCursorProblem = (err) => err?.code === "CURSOR_MISSING" || err?.response?.data?.code === "INVALID_CURSOR";

/**
 * Cursor-paginated list with TanStack Query.
 *
 * Only ONE page (10 rows) is ever held on screen and fetched at a time — never
 * the whole collection. Behind that:
 *
 *  - Every page is its own cached query:  [...queryKey, "page", params, pageIndex].
 *    Going back to a page already visited is instant (stale-while-revalidate:
 *    the cached rows show immediately and refresh in the background once they
 *    are older than `staleTime`).
 *  - `placeholderData: keepPreviousData` keeps the current rows on screen while
 *    the next page / new search is loading, so the list never flashes empty.
 *  - The next page is prefetched in the background, so "Next" is usually instant.
 *  - The cursor for page N is the opaque `nextCursor` the server returned with
 *    page N-1 (read straight from the query cache), so nothing extra is stored.
 *  - Changing `params` (search text, filters) starts again from page 1.
 *  - Mutations that invalidate `queryKey` (e.g. ["vehicle-notes"]) refresh only
 *    the page being viewed; the other cached pages are just marked stale.
 *
 * @param {object}   o
 * @param {Array}    o.queryKey   base key of the resource, e.g. ["vehicle-notes"]
 * @param {Function} o.fetchPage  (params & { cursor, limit }, signal) => Promise<{ items, nextCursor, hasMore, total, searchMode }>
 * @param {object}   o.params     search / filter values (anything that changes the result set)
 */
export default function useCursorPagination({
  queryKey,
  fetchPage,
  params: rawParams = {},
  pageSize = PAGE_SIZE,
  staleTime = 30_000,
  prefetchNext = true,
  enabled = true,
}) {
  const queryClient = useQueryClient();

  // Page position lives next to the params it belongs to, so a changed search /
  // filter is automatically "page 1" without an effect or a second render.
  const paramsHash = JSON.stringify(rawParams);
  // Same content => same object, so callers can pass a fresh literal every render.
  const params = useMemo(() => JSON.parse(paramsHash), [paramsHash]);
  const [position, setPosition] = useState({ hash: paramsHash, index: 0 });
  const pageIndex = position.hash === paramsHash ? position.index : 0;

  const keyFor = useCallback((index) => [...queryKey, "page", params, index], [queryKey, params]);

  const load = useCallback(
    (index, cursor, signal) => {
      if (index > 0 && !cursor) {
        throw Object.assign(new Error("The cursor for this page is no longer cached."), { code: "CURSOR_MISSING" });
      }
      return fetchPage({ ...params, cursor, limit: pageSize }, signal);
    },
    [fetchPage, params, pageSize]
  );

  const query = useQuery({
    queryKey: keyFor(pageIndex),
    queryFn: ({ signal }) => {
      const cursor = pageIndex === 0 ? undefined : queryClient.getQueryData(keyFor(pageIndex - 1))?.nextCursor;
      return load(pageIndex, cursor, signal);
    },
    placeholderData: keepPreviousData,
    staleTime,
    gcTime: 30 * 60_000, // keep visited pages around long enough to page back through them
    enabled,
    retry: (count, err) => !isCursorProblem(err) && count < 2 && !(err?.response?.status >= 400 && err.response.status < 500),
  });

  const { data, isPlaceholderData, error, refetch } = query;

  // Next page: fetch it quietly as soon as this one has landed.
  const nextCursor = !isPlaceholderData ? data?.nextCursor : null;
  useEffect(() => {
    if (!prefetchNext || !nextCursor) return;
    queryClient.prefetchQuery({
      queryKey: keyFor(pageIndex + 1),
      queryFn: ({ signal }) => load(pageIndex + 1, nextCursor, signal),
      staleTime,
    });
  }, [prefetchNext, nextCursor, pageIndex, keyFor, load, queryClient, staleTime]);

  const goToFirstPage = useCallback(() => {
    setPosition({ hash: paramsHash, index: 0 });
    queryClient.invalidateQueries({ queryKey: [...queryKey, "page", params] });
  }, [paramsHash, queryClient, queryKey, params]);

  // An expired / foreign cursor isn't the person's problem: go back to page 1.
  useEffect(() => {
    if (pageIndex > 0 && isCursorProblem(error)) goToFirstPage();
  }, [error, pageIndex, goToFirstPage]);

  const goNext = useCallback(() => {
    if (!data?.hasMore || isPlaceholderData) return;
    setPosition({ hash: paramsHash, index: pageIndex + 1 });
  }, [data?.hasMore, isPlaceholderData, paramsHash, pageIndex]);

  const goPrev = useCallback(() => {
    if (pageIndex === 0 || isPlaceholderData) return;
    setPosition({ hash: paramsHash, index: pageIndex - 1 });
  }, [isPlaceholderData, paramsHash, pageIndex]);

  const items = data?.items ?? EMPTY;
  const firstRow = pageIndex * pageSize + 1;

  return {
    items,
    total: data?.total ?? null, // only known (estimated) while nothing is searched / filtered
    searchMode: data?.searchMode ?? null, // "text" => no exact matches, these are related results
    page: pageIndex + 1,
    firstRow,
    lastRow: firstRow + items.length - 1,
    pageSize,
    hasNext: Boolean(data?.hasMore) && !isPlaceholderData,
    hasPrev: pageIndex > 0 && !isPlaceholderData,
    goNext,
    goPrev,
    goToFirstPage,
    refetch,
    isLoading: query.isLoading, // first load, nothing to show yet
    isFetching: query.isFetching,
    isPageChanging: isPlaceholderData, // showing the previous rows while the new ones load
    isError: query.isError && !isCursorProblem(error),
  };
}
