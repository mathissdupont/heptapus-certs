"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Type, Underline, ChevronDown } from "lucide-react";

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
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden antialiased focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-300 transition-all">
      
      {/* Apple Notlar Tarzı Minimalist Araç Çubuğu (Toolbar) */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/50 px-2.5 py-2">
        
        {/* Stil Butonları Gruplaması */}
        <div className="flex items-center gap-0.5">
          {[
            { cmd: "bold", icon: Bold, label: "Kalın" },
            { cmd: "italic", icon: Italic, label: "İtalik" },
            { cmd: "underline", icon: Underline, label: "Altı Çizili" },
            { cmd: "insertUnorderedList", icon: List, label: "Madde İşaretli Liste" },
            { cmd: "insertOrderedList", icon: ListOrdered, label: "Numaralı Liste" },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.cmd}
                type="button"
                onClick={() => runCommand(btn.cmd)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm border border-transparent hover:border-gray-200/60 transition-all active:scale-95"
                aria-label={btn.label}
              >
                <Icon className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            );
          })}
        </div>

        {/* İnce Bölücü Dikey Çizgi */}
        <div className="h-4 w-px bg-gray-200 mx-1.5" />

        {/* Font Ailesi Seçici */}
        <div className="relative inline-flex items-center">
          <Type className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400 stroke-[1.8]" />
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("fontName", event.target.value);
              event.target.value = "";
            }}
            className="appearance-none rounded-xl border border-gray-200 bg-white pl-8 pr-7 py-1.5 text-11 font-semibold text-gray-600 outline-none hover:border-gray-300 transition-all cursor-pointer"
          >
            <option value="" disabled>Font</option>
            {FONT_FAMILY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-gray-400" />
        </div>

        {/* Font Boyutu Seçici */}
        <div className="relative inline-flex items-center">
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("fontSize", event.target.value);
              event.target.value = "";
            }}
            className="appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-7 py-1.5 text-11 font-semibold text-gray-600 outline-none hover:border-gray-300 transition-all cursor-pointer"
          >
            <option value="" disabled>16</option>
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-gray-400" />
        </div>

        {/* İnce Bölücü Dikey Çizgi */}
        <div className="h-4 w-px bg-gray-200 mx-1.5" />

        {/* Apple Tarzı Kusursuzlaştırılmış Renk Seçici Buton */}
        <div className="relative flex h-8 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-gray-300 shadow-sm overflow-hidden transition-all">
          <input
            type="color"
            aria-label="Metin Rengi"
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            defaultValue="#1f2937"
            onChange={(event) => runCommand("foreColor", event.target.value)}
          />
          {/* Renk Seçici İkon İllüstrasyonu */}
          <div className="h-3 w-5 rounded border border-gray-900/10 bg-gray-800" />
        </div>

        {/* Format Temizleme Butonu */}
        <button
          type="button"
          onClick={() => runCommand("removeFormat")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-sm border border-transparent hover:border-gray-200/60 transition-all active:scale-95 ml-auto"
          aria-label="Formatı Temizle"
        >
          <RemoveFormatting className="h-3.5 w-3.5 stroke-[2]" />
        </button>

      </div>

      {/* Yazı Yazma Alanı (ContentEditable) */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ""}
        className="rich-editor rich-text-content min-h-[180px] w-full px-4 py-3.5 text-xs font-medium text-gray-900 outline-none bg-white transition-all overflow-y-auto"
        onInput={syncValue}
        onBlur={syncValue}
        onPaste={handlePaste}
      />
    </div>
  );
}