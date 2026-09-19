import { useEffect, useState } from "react";
import { headingDomId } from "../services/navigation";

export function useScrollTracking(headingSlugs: string[]): string | undefined {
  const [activeSlug, setActiveSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (headingSlugs.length === 0) {
      setActiveSlug(undefined);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const rawId = entry.target.id;
            const slug = rawId.replace(/^user-content-/, "");
            setActiveSlug(slug);
            break;
          }
        }
      },
      {
        rootMargin: "0px 0px -70% 0px",
        threshold: 0.1,
      },
    );

    for (const slug of headingSlugs) {
      const el = document.getElementById(headingDomId(slug));
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headingSlugs]);

  return activeSlug;
}
