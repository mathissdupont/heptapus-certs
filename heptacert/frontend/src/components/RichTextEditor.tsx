"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Type, Underline } from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const FONT_SIZE_OPTIONS = [
  { label: "12", value: "1" },
  { label: "14", value: "2" },
  { label: "16", value: "3" },
  { label: "18", value: "4" },
  { label: "24", value: "5" },
  { label: "30", value: "6" },
  { label: "36", value: "7" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "Sans", value: "Arial" },
  { label: "Serif", value: "Georgia" },
  { label: "Mono", value: "Courier New" },
  { label: "Classic", value: "Times New Roman" },
  { label: "Clean", value: "Verdana" },
];

function normalizeLegacyFontTags(root: HTMLElement) {
  const fontNodes = Array.from(root.querySelectorAll("font"));
  for (const fontNode of fontNodes) {
    const span = document.createElement("span");
    const size = fontNode.getAttribute("size");
    const face = fontNode.getAttribute("face");
    const color = fontNode.getAttribute("color");

    if (size) {
      const sizeMap: Record<string, string> = {
        "1": "12px",
        "2": "14px",
        "3": "16px",
        "4": "18px",
        "5": "24px",
        "6": "30px",
        "7": "36px",
      };
      if (sizeMap[size]) span.style.fontSize = sizeMap[size];
    }
    if (face) span.style.fontFamily = face;
    if (color) span.style.color = color;

    while (fontNode.firstChild) {
      span.appendChild(fontNode.firstChild);
    }
    fontNode.replaceWith(span);
  }
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  function syncValue() {
    const editor = editorRef.current;
    if (!editor) return;
    normalizeLegacyFontTags(editor);
    onChange(editor.innerHTML.trim());
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncValue();
  }

  return (
    <div className="rounded-3xl border border-surface-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-200 bg-surface-50/70 px-3 py-3">
        <button type="button" onClick={() => runCommand("bold")} className="btn-ghost" aria-label="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => runCommand("italic")} className="btn-ghost" aria-label="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => runCommand("underline")} className="btn-ghost" aria-label="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => runCommand("insertUnorderedList")} className="btn-ghost" aria-label="Bullet List">
          <List className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => runCommand("insertOrderedList")} className="btn-ghost" aria-label="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="h-6 w-px bg-surface-200" />
        <label className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-600">
          <Type className="h-3.5 w-3.5" />
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("fontName", event.target.value);
              event.target.value = "";
            }}
            className="bg-transparent outline-none"
          >
            <option value="" disabled>
              Font
            </option>
            {FONT_FAMILY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-600">
          <span>Size</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("fontSize", event.target.value);
              event.target.value = "";
            }}
            className="bg-transparent outline-none"
          >
            <option value="" disabled>
              16
            </option>
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <input
          type="color"
          aria-label="Text Color"
          className="h-10 w-12 cursor-pointer rounded-xl border border-surface-200 bg-white p-1"
          defaultValue="#1f2937"
          onChange={(event) => runCommand("foreColor", event.target.value)}
        />
        <button type="button" onClick={() => runCommand("removeFormat")} className="btn-ghost" aria-label="Clear Formatting">
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ""}
        className="rich-editor rich-text-content min-h-48 w-full px-4 py-4 text-sm text-surface-900 outline-none"
        onInput={syncValue}
        onBlur={syncValue}
        onPaste={handlePaste}
      />
    </div>
  );
}
