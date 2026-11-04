import useProtectedImage from "../hooks/useProtectedImage";

// A 1x1 transparent GIF: keeps the <img> (and the layout CSS that targets it)
// in place while a photo is loading or if it couldn't be loaded.
const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Drop-in replacement for <img> wherever a vehicle photo from the server is
 * shown. The API only serves /uploads/* to a signed-in user, which a plain
 * <img src> can't prove, so the photo is fetched with the login token and
 * displayed from memory (see utils/protectedImage.js). Photos that are not on
 * the server (a just-picked data: URL, for instance) are shown as is.
 *
 * Accepts every <img> prop (className, onClick, loading, …).
 */
export default function AuthImage({ src, alt = "", ...rest }) {
  const { url, failed } = useProtectedImage(src);
  const state = !src ? "empty" : failed ? "error" : url ? "ready" : "loading";
  return <img src={url || BLANK_PIXEL} alt={alt} data-image-state={state} {...rest} />;
}
