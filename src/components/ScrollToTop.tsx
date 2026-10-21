import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Also scroll all scrollable elements to top
    setTimeout(() => {
      document.querySelectorAll('.overflow-y-auto').forEach(el => {
        el.scrollTo(0, 0);
      });
    }, 0);
  }, [pathname]);

  return null;
}
