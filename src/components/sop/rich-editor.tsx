"use client";

import { useCallback, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { Extension, mergeAttributes, type CommandProps } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type ReactNodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eraser,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Table as TableIcon,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolveAssetUrl, uploadContentImage } from "@/lib/api";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

type RichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  fillHeight?: boolean;
};

type ResizableImageAttrs = {
  src?: string;
  alt?: string;
  title?: string;
  width?: number | string | null;
  height?: number | string | null;
};

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
];

const fontFamilies = [
  { label: "Default", value: "" },
  { label: "Inter", value: "Inter, Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "Mono", value: "'Courier New', Courier, monospace" },
];

const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: CommandProps) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: CommandProps) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const ResizableImage = Image.extend({
  name: "resizableImage",

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("width") ||
          element.style.width ||
          element.parentElement?.style.width ||
          null,
        renderHTML: () => ({}),
      },
      height: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("height") ||
          element.style.height ||
          element.parentElement?.style.height ||
          null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }, { tag: "figure[data-image-block] img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const width = normalizeDimension(HTMLAttributes.width);
    const height = normalizeDimension(HTMLAttributes.height);
    const src = resolveAssetUrl(String(HTMLAttributes.src || ""));
    const style = [
      width ? `width: ${width}` : null,
      height ? `height: ${height}` : null,
      "max-width: 100%",
      "object-fit: contain",
    ]
      .filter(Boolean)
      .join("; ");

    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        src,
        class: cn("editor-image", HTMLAttributes.class),
        style,
        width: null,
        height: null,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

function normalizeDimension(value: unknown) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return /^\d+(\.\d+)?$/.test(text) ? `${text}px` : text;
}

function dimensionNumber(value: unknown, fallback: number) {
  const normalized = normalizeDimension(value);
  if (!normalized) return fallback;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ResizableImageView(props: ReactNodeViewProps) {
  const { node, selected, updateAttributes } = props;
  const attrs = node.attrs as ResizableImageAttrs;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [draftSize, setDraftSize] = useState({
    width: dimensionNumber(attrs.width, 320),
    height: dimensionNumber(attrs.height, 220),
  });

  useEffect(() => {
    setDraftSize({
      width: dimensionNumber(attrs.width, 320),
      height: dimensionNumber(attrs.height, 220),
    });
  }, [attrs.width, attrs.height]);

  const imageSrc = resolveAssetUrl(attrs.src);

  function startResize(handle: string, event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = draftSize.width;
    const startHeight = draftSize.height;

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let width = startWidth;
      let height = startHeight;

      if (handle.includes("e")) width = startWidth + dx;
      if (handle.includes("w")) width = startWidth - dx;
      if (handle.includes("s")) height = startHeight + dy;
      if (handle.includes("n")) height = startHeight - dy;

      width = Math.min(960, Math.max(120, width));
      height = Math.min(720, Math.max(90, height));

      setDraftSize({ width, height });
    }

    function onEnd() {
      document.body.style.userSelect = "";
      updateAttributes({
        width: `${Math.round(draftSizeRef.current.width)}px`,
        height: `${Math.round(draftSizeRef.current.height)}px`,
      });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    }

    const draftSizeRef = {
      get current() {
        const rect = wrapperRef.current?.getBoundingClientRect();
        return {
          width: rect?.width || startWidth,
          height: rect?.height || startHeight,
        };
      },
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  return (
    <NodeViewWrapper
      as="figure"
      ref={wrapperRef}
      className={cn("editor-image-block", selected && "is-selected")}
      data-image-block
      data-size={`${Math.round(draftSize.width)} x ${Math.round(draftSize.height)}`}
      style={{
        width: `${draftSize.width}px`,
        height: `${draftSize.height}px`,
      }}
    >
      <img src={imageSrc} alt={attrs.alt || ""} className="editor-image" draggable={false} />
      {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
        <span
          key={handle}
          className={`editor-image-handle editor-image-handle-${handle}`}
          data-resize-handle={handle}
          onPointerDown={(event) => startResize(handle, event)}
          aria-hidden="true"
        />
      ))}
    </NodeViewWrapper>
  );
}

export function RichEditor({ value, onChange, className, fillHeight = false }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ResizableImage.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: fillHeight
          ? "sop-editor h-full min-h-0 w-full px-5 py-5 text-sm leading-7 text-slate-800 outline-none dark:text-slate-100"
          : "sop-editor min-h-[360px] w-full px-5 py-5 text-sm leading-7 text-slate-800 outline-none dark:text-slate-100",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const insertImage = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/") || !editor) {
        return;
      }

      setUploading(true);

      try {
        const { url } = await uploadContentImage(file);
        if (!url) return;
        const imageUrl = resolveAssetUrl(url);

        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: "resizableImage",
              attrs: { src: imageUrl, alt: file.name, width: "320px", height: "220px" },
            },
            { type: "paragraph" },
          ])
          .focus()
          .run();
      } catch {
        window.alert("Unable to upload image. Please try a smaller image or check your connection.");
      } finally {
        setUploading(false);
      }
    },
    [editor],
  );

  function setBlock(value: string) {
    if (!editor) return;

    if (value === "paragraph") editor.chain().focus().setParagraph().run();
    if (value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
    if (value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
  }

  function currentBlock() {
    if (!editor) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  }

  function currentFontSize() {
    return (editor?.getAttributes("textStyle").fontSize as string | undefined) || "";
  }

  function changeFontSize(direction: "up" | "down") {
    if (!editor) return;
    const current = currentFontSize();
    const index = Math.max(0, fontSizes.indexOf(current));
    const nextIndex =
      direction === "up"
        ? Math.min(fontSizes.length - 1, index + 1)
        : Math.max(0, index - 1);
    editor.chain().focus().setFontSize(fontSizes[nextIndex]).run();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm dark:border-[#242424] dark:bg-[#101010]",
        fillHeight && "flex min-h-0 flex-col",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-orange-100 bg-orange-50/80 p-2 dark:border-[#f47920]/20 dark:bg-[#f47920]/10">
        <ToolbarSelect label="Block style" value={currentBlock()} onChange={setBlock}>
          <option value="paragraph">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </ToolbarSelect>
        <ToolbarSelect
          label="Font"
          value={(editor?.getAttributes("textStyle").fontFamily as string | undefined) || ""}
          onChange={(font) => {
            if (!editor) return;
            font
              ? editor.chain().focus().setFontFamily(font).run()
              : editor.chain().focus().unsetFontFamily().run();
          }}
        >
          {fontFamilies.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          label="Font size"
          value={currentFontSize()}
          onChange={(size) => {
            if (!editor) return;
            size
              ? editor.chain().focus().setFontSize(size).run()
              : editor.chain().focus().unsetFontSize().run();
          }}
        >
          <option value="">Size</option>
          {fontSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </ToolbarSelect>
        <ToolButton label="Decrease font size" icon={Minus} onClick={() => changeFontSize("down")} />
        <ToolButton label="Increase font size" icon={Plus} onClick={() => changeFontSize("up")} />
        <Divider />
        <ToolButton
          label="Bold"
          icon={Bold}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolButton
          label="Italic"
          icon={Italic}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolButton
          label="Underline"
          icon={UnderlineIcon}
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
        <ToolButton
          label="Heading"
          icon={Heading2}
          active={editor?.isActive("heading")}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <Divider />
        <ToolButton
          label="Bullets"
          icon={List}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          label="Numbers"
          icon={ListOrdered}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolButton
          label="Quote"
          icon={Quote}
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <ToolButton
          label="Image"
          icon={ImageIcon}
          active={uploading}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        />
        <Divider />
        <ToolButton
          label="Insert table"
          icon={TableIcon}
          active={editor?.isActive("table")}
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        />
        <ToolButton
          label="Add column"
          icon={TableColumnsSplit}
          disabled={!editor?.isActive("table")}
          onClick={() => editor?.chain().focus().addColumnAfter().run()}
        />
        <ToolButton
          label="Add row"
          icon={TableRowsSplit}
          disabled={!editor?.isActive("table")}
          onClick={() => editor?.chain().focus().addRowAfter().run()}
        />
        <ToolButton
          label="Delete column"
          icon={Rows3}
          disabled={!editor?.isActive("table")}
          onClick={() => editor?.chain().focus().deleteColumn().run()}
        />
        <ToolButton
          label="Delete row"
          icon={Minus}
          disabled={!editor?.isActive("table")}
          onClick={() => editor?.chain().focus().deleteRow().run()}
        />
        <ToolButton
          label="Delete table"
          icon={Trash2}
          disabled={!editor?.isActive("table")}
          onClick={() => editor?.chain().focus().deleteTable().run()}
        />
        <Divider />
        <ToolButton
          label="Align left"
          icon={AlignLeft}
          active={editor?.isActive({ textAlign: "left" })}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        />
        <ToolButton
          label="Align center"
          icon={AlignCenter}
          active={editor?.isActive({ textAlign: "center" })}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        />
        <ToolButton
          label="Align right"
          icon={AlignRight}
          active={editor?.isActive({ textAlign: "right" })}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        />
        <ToolButton
          label="Justify"
          icon={AlignJustify}
          active={editor?.isActive({ textAlign: "justify" })}
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
        />
        <Divider />
        <ColorMenu
          label="Text color"
          icon={Palette}
          colors={textColors}
          onSelect={(color) => editor?.chain().focus().setColor(color).run()}
        />
        <ColorMenu
          label="Highlight"
          icon={Highlighter}
          colors={highlightColors}
          onSelect={(color) => editor?.chain().focus().toggleHighlight({ color }).run()}
        />
        <ToolButton label="Clear highlight" icon={Eraser} onClick={() => editor?.chain().focus().unsetHighlight().run()} />
        <Divider />
        <ToolButton
          label="Clear formatting"
          icon={RemoveFormatting}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        />
        <ToolButton label="Undo" icon={Undo2} onClick={() => editor?.chain().focus().undo().run()} />
        <ToolButton label="Redo" icon={Redo2} onClick={() => editor?.chain().focus().redo().run()} />
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
      <div className={cn(fillHeight && "min-h-0 flex-1 overflow-auto")}>
        <EditorContent editor={editor} className={cn(fillHeight && "h-full [&_.sop-editor]:min-h-full")} />
      </div>
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: ElementType;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      aria-pressed={Boolean(active)}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-9 w-9",
        active &&
          "bg-[#f47920] text-white hover:bg-[#cf5f0d] hover:text-white dark:bg-[#f47920] dark:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function ToolbarSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-md border border-orange-100 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#f47920] focus:ring-2 focus:ring-[#f47920]/20 dark:border-white/10 dark:bg-[#111111] dark:text-slate-100"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-orange-200 dark:bg-white/10" />;
}

function ColorMenu({
  label,
  icon: Icon,
  colors,
  onSelect,
}: {
  label: string;
  icon: ElementType;
  colors: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="group relative">
      <Button type="button" variant="ghost" size="icon" title={label} aria-label={label} className="h-9 w-9">
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
            style={{ background: color.value }}
            title={color.label}
            aria-label={`${label}: ${color.label}`}
          />
        ))}
      </div>
    </div>
  );
}
