import { useEffect } from "react";
import { defaultTitle } from "../../seo.config.js";

// Sets <title> and the meta description while a page is mounted; on unmount it
// restores the default title and removes the description. This keeps the login
// meta from lingering after login / when moving to another page without a reload.
export default function usePageMeta({ title, description }) {
  useEffect(() => {
    document.title = title;

    let tag = document.head.querySelector('meta[name="description"]');
    if (description) {
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }

    return () => {
      document.title = defaultTitle;
      document.head.querySelector('meta[name="description"]')?.remove();
    };
  }, [title, description]);
}
