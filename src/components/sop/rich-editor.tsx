"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Highlighter,
  Italic,
  Image as ImageIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadContentImage } from "@/lib/api";
import { cn } from "@/lib/utils";

type RichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const tools = [
  { label: "Bold", command: "bold", icon: Bold },
  { label: "Italic", command: "italic", icon: Italic },
  { label: "Heading", command: "formatBlock", value: "h2", icon: Heading2 },
  { label: "Bullets", command: "insertUnorderedList", icon: List },
  { label: "Numbers", command: "insertOrderedList", icon: ListOrdered },
  { label: "Quote", command: "formatBlock", value: "blockquote", icon: Quote },
  { label: "Image", command: "image", icon: ImageIcon },
  { label: "Clear", command: "removeFormat", icon: RemoveFormatting },
  { label: "Undo", command: "undo", icon: Undo2 },
  { label: "Redo", command: "redo", icon: Redo2 },
];

const textColors = [
  { label: "Slate", value: "#0f172a" },
  { label: "Orange", value: "#f47920" },
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#059669" },
  { label: "Rose", value: "#e11d48" },
  { label: "White", value: "#f8fafc" },
];

const highlightColors = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Rose", value: "#fecdd3" },
  { label: "Clear", value: "transparent" },
];

const alignmentTools = [
  { label: "Align left", command: "justifyLeft", icon: AlignLeft },
  { label: "Align center", command: "justifyCenter", icon: AlignCenter },
  { label: "Align right", command: "justifyRight", icon: AlignRight },
  { label: "Justify", command: "justifyFull", icon: AlignJustify },
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function RichEditor({ value, onChange, className }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const resizeSessionRef = useRef<{
    block: HTMLElement;
    handle: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  const clearSelectedImageBlocks = useCallback(() => {
    editorRef.current
      ?.querySelectorAll(".editor-image-block.is-selected")
      .forEach((block) => block.classList.remove("is-selected"));
  }, []);

  const selectImageBlock = useCallback(
    (block: HTMLElement | null) => {
      clearSelectedImageBlocks();
      if (block) {
        block.classList.add("is-selected");
      }
    },
    [clearSelectedImageBlocks],
  );

  const cursorForHandle = useCallback((handle: string) => {
    switch (handle) {
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      case "nw":
      case "se":
        return "nwse-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      default:
        return "default";
    }
  }, []);

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range;
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }

  function run(command: string, commandValue?: string) {
    if (command === "image") {
      fileInputRef.current?.click();
      return;
    }

    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function applyInlineStyle(command: string, value: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    emitChange();
    saveSelection();
  }

  async function insertImage(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    try {
      const { url } = await uploadContentImage(file);
      if (!url) return;

      editorRef.current?.focus();
      restoreSelection();
      document.execCommand(
        "insertHTML",
        false,
        `<figure contenteditable="false" class="editor-image-block is-selected" data-image-block data-size="320 x 240" style="width:320px;height:240px;">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(file.name)}" class="editor-image" style="width:100%;height:100%;object-fit:contain;" />
          <span class="editor-image-handle editor-image-handle-nw" data-resize-handle="nw" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-n" data-resize-handle="n" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-ne" data-resize-handle="ne" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-e" data-resize-handle="e" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-se" data-resize-handle="se" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-s" data-resize-handle="s" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-sw" data-resize-handle="sw" aria-hidden="true"></span>
          <span class="editor-image-handle editor-image-handle-w" data-resize-handle="w" aria-hidden="true"></span>
        </figure>`,
      );
      emitChange();
      savedRangeRef.current = null;
    } catch {
      window.alert("Unable to upload image. Please try a smaller image or check your connection.");
    }
  }

  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) {
      return;
    }
    const editor = currentEditor;

    function stopResize() {
      const session = resizeSessionRef.current;
      if (!session) {
        return;
      }

      resizeSessionRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      emitChange();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const handle = target.closest("[data-resize-handle]") as HTMLElement | null;
      const block = target.closest("[data-image-block]") as HTMLElement | null;

      if (handle && block) {
        event.preventDefault();
        event.stopPropagation();
        selectImageBlock(block);
        const rect = block.getBoundingClientRect();
        resizeSessionRef.current = {
          block,
          handle: String(handle.dataset.resizeHandle || ""),
          startX: event.clientX,
          startY: event.clientY,
          startWidth: rect.width,
          startHeight: rect.height,
        };
        document.body.style.userSelect = "none";
        document.body.style.cursor = cursorForHandle(String(handle.dataset.resizeHandle || ""));
        return;
      }

      if (block) {
        selectImageBlock(block);
        return;
      }

      if (!editor.contains(target)) {
        return;
      }

      clearSelectedImageBlocks();
    }

    function onPointerMove(event: PointerEvent) {
      const session = resizeSessionRef.current;
      if (!session) {
        return;
      }

      const { block, handle, startX, startY, startWidth, startHeight } = session;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      let nextWidth = startWidth;
      let nextHeight = startHeight;

      if (handle.includes("e")) {
        nextWidth = startWidth + dx;
      }
      if (handle.includes("w")) {
        nextWidth = startWidth - dx;
      }
      if (handle.includes("s")) {
        nextHeight = startHeight + dy;
      }
      if (handle.includes("n")) {
        nextHeight = startHeight - dy;
      }

      nextWidth = Math.max(120, nextWidth);
      nextHeight = Math.max(90, nextHeight);

      block.style.width = `${nextWidth}px`;
      block.style.height = `${nextHeight}px`;
      block.dataset.size = `${Math.round(nextWidth)} x ${Math.round(nextHeight)}`;
    }

    editor.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      editor.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [clearSelectedImageBlocks, cursorForHandle, emitChange, selectImageBlock]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm dark:border-[#242424] dark:bg-[#101010]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-orange-100 bg-orange-50/70 p-2 dark:border-[#f47920]/20 dark:bg-[#f47920]/10">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Button
              key={tool.label}
              type="button"
              variant="ghost"
              size="icon"
              title={tool.label}
              aria-label={tool.label}
              onClick={() => run(tool.command, tool.value)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-orange-200 dark:bg-white/10" />
        {alignmentTools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Button
              key={tool.label}
              type="button"
              variant="ghost"
              size="icon"
              title={tool.label}
              aria-label={tool.label}
              onClick={() => run(tool.command)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-orange-200 dark:bg-white/10" />
        <ColorMenu
          label="Text color"
          icon={Palette}
          colors={textColors}
          onSelect={(color) => applyInlineStyle("foreColor", color)}
        />
        <ColorMenu
          label="Highlight color"
          icon={Highlighter}
          colors={highlightColors}
          onSelect={(color) => applyInlineStyle("hiliteColor", color)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            insertImage(event.target.files?.[0] || null);
            event.currentTarget.value = "";
          }}
        />
      </div>
      <div className="relative">
        {!value ? (
          <div className="pointer-events-none absolute left-5 top-5 text-sm text-slate-400">
            Write the procedure, acceptance checks, notes, and escalation path.
          </div>
        ) : null}
        <div
          ref={editorRef}
          className="sop-editor min-h-[360px] w-full px-5 py-5 text-sm leading-7 text-slate-800 outline-none dark:text-slate-100"
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={saveSelection}
        />
      </div>
    </div>
  );
}

function ColorMenu({
  label,
  icon: Icon,
  colors,
  onSelect,
}: {
  label: string;
  icon: React.ElementType;
  colors: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="group relative">
      <Button type="button" variant="ghost" size="icon" title={label} aria-label={label}>
        <Icon className="h-4 w-4" />
      </Button>
      <div className="invisible absolute left-0 top-full z-20 mt-1 grid w-40 grid-cols-6 gap-1 rounded-lg border border-orange-100 bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:border-white/10 dark:bg-[#151515]">
        {colors.map((color) => (
          <button
            key={`${label}-${color.label}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(color.value);
            }}
            className="h-5 w-5 rounded-full border border-slate-300 shadow-sm transition hover:scale-110 dark:border-white/20"
            style={{ background: color.value === "transparent" ? "transparent" : color.value }}
            title={color.label}
            aria-label={`${label}: ${color.label}`}
          />
        ))}
      </div>
    </div>
  );
}
