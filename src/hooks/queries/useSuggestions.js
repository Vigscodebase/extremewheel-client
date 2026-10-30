import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const MIN_SUGGEST_CHARS = 2;

/**
 * Type-ahead suggestions for a search box, cached per typed text
 * (stale-while-revalidate) and cancelled automatically when the text changes.
 * Pass the DEBOUNCED text so one request goes out per pause, not per keystroke.
 */
export default function useSuggestions({ queryKey, fetchSuggestions, text, enabled = true }) {
  const q = text.trim();
  const active = enabled && q.length >= MIN_SUGGEST_CHARS;
  const query = useQuery({
    queryKey: [...queryKey, "suggest", q.toLowerCase()],
    queryFn: ({ signal }) => fetchSuggestions(q, signal),
    enabled: active,
    placeholderData: keepPreviousData, // keep the old list visible while the next one loads
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
  return {
    suggestions: active ? query.data ?? [] : [],
    isFetching: active && query.isFetching,
  };
}
