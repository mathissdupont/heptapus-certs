"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type LanguageMenuProps = {
  value: string;
  options: readonly string[];
  labels: Record<string, string>;
  label: string;
  onChange: (value: string) => void;
  className?: string;
  /** Show only the globe + language code below the `sm` breakpoint. */
  compactOnMobile?: boolean;
};

// Presentational language picker shared by the public (next-intl) switcher and the
// application toggle. A button + listbox popover replaces the native <select>, whose
// OS-drawn option list could not be styled or themed.
export default function LanguageMenu({
  value,
  options,
  labels,
  label,
  onChange,
  className,
  compactOnMobile = false,
}: LanguageMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.indexOf(value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    listRef.current?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openMenu = () => {
    setActiveIndex(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const choose = (next: string) => {
    close(true);
    if (next !== value) onChange(next);
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(options[activeIndex]);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
      default: {
        // Type-ahead: jump to the first language whose native name starts with the key.
        if (event.key.length !== 1) return;
        const key = event.key.toLocaleLowerCase();
        const hit = options.findIndex((o) => (labels[o] ?? o).toLocaleLowerCase().startsWith(key));
        if (hit >= 0) setActiveIndex(hit);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${labels[value] ?? value}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={
          className ??
          "inline-flex min-h-9 items-center gap-2 rounded-lg border border-outline-subtle bg-raised px-2.5 text-xs font-bold text-content-secondary shadow-sm transition-colors hover:bg-sunken hover:text-content-primary"
        }
      >
        <Globe className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
        <span className="text-11 font-extrabold uppercase tracking-[0.14em]">{value}</span>
        <span className={compactOnMobile ? "hidden sm:inline" : undefined}>{labels[value] ?? value}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-content-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${options[activeIndex]}`}
          onKeyDown={onListKeyDown}
          className="absolute right-0 top-full z-[60] mt-2 max-h-[min(24rem,70vh)] w-56 overflow-y-auto rounded-xl border border-outline-subtle bg-raised p-1.5 text-sm shadow-float outline-none"
        >
          {options.map((option, index) => {
            const selected = option === value;
            const active = index === activeIndex;
            return (
              <li
                key={option}
                id={`${listId}-${option}`}
                role="option"
                aria-selected={selected}
                lang={option}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                  active ? "bg-sunken text-content-primary" : "text-content-secondary"
                } ${selected ? "font-semibold text-content-primary" : "font-medium"}`}
              >
                <span
                  className={`inline-flex w-8 justify-center rounded-md py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                    selected ? "bg-content-primary text-content-inverted" : "bg-sunken text-content-muted"
                  }`}
                >
                  {option}
                </span>
                <span className="flex-1 truncate">{labels[option] ?? option}</span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-content-primary" aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
