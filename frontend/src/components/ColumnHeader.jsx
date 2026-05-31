import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ColumnHeader({ label, hint }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const popoverId = useId();

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function updatePosition() {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 32);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - width - 16));

      setPosition({
        top: rect.bottom + 8,
        left,
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (buttonRef.current?.contains(event.target)) return;
      if (event.target.closest?.(".col-hint-popover")) return;
      setOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <th scope="col" className="col-head-cell">
      <span className="col-head">
        <span className="col-head__label">{label}</span>
        {hint ? (
          <>
            <button
              ref={buttonRef}
              type="button"
              className="col-head__info"
              aria-label={`About ${label}`}
              aria-expanded={open}
              aria-controls={popoverId}
              onClick={() => setOpen((value) => !value)}
            >
              i
            </button>
            {open
              ? createPortal(
                  <div
                    id={popoverId}
                    className="col-hint-popover"
                    role="tooltip"
                    style={{
                      top: position.top,
                      left: position.left,
                      width: position.width,
                    }}
                  >
                    <span className="col-hint-popover__title">{label}</span>
                    {hint}
                  </div>,
                  document.body,
                )
              : null}
          </>
        ) : null}
      </span>
    </th>
  );
}
