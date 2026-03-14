import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Bold, Italic, Link2, List, Table2, Palette, Image, Video } from 'lucide-react';

const TEXT_COLORS = [
  { name: 'Černá', value: '#2F3441' },
  { name: 'Šedá', value: '#5D6472' },
  { name: 'Fialová', value: '#8A7CFF' },
  { name: 'Růžová', value: '#F5A9B8' },
  { name: 'Modrá', value: '#5BCEFA' },
  { name: 'Zelená', value: '#6FE3C1' },
  { name: 'Červená', value: '#E53935' },
  { name: 'Oranžová', value: '#F57C00' },
];

/**
 * RichTextEditor — contentEditable-based rich text editor.
 * Supports: H1, H2, H3, P, Bold, Italic, Bullet list, Link, Table, Image, Video.
 * Outputs / accepts sanitized HTML string.
 * onUploadImage: async (file) => url — optional, for uploading images from file picker.
 */
export const RichTextEditor = ({ value, onChange, placeholder = 'Napište obsah...', rows = 8, onUploadImage }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  // Track the last value we set externally (to detect parent-driven resets)
  const lastExternalValue = useRef(value);
  const isComposingInput = useRef(false);

  // Only update innerHTML when the value is changed externally (e.g. form reset)
  // Never during user typing — that would jump the cursor to the start.
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const incomingValue = value || '';
    // If value was reset to '' externally, clear the editor
    if (incomingValue !== lastExternalValue.current && !isComposingInput.current) {
      if (incomingValue !== currentHtml) {
        editorRef.current.innerHTML = incomingValue;
        lastExternalValue.current = incomingValue;
      }
    }
  }, [value]);

  const exec = useCallback((cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
  }, [onChange]);

  const handleInput = useCallback(() => {
    isComposingInput.current = true;
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
    // Reset flag after the current event cycle
    requestAnimationFrame(() => { isComposingInput.current = false; });
  }, [onChange]);

  const insertLink = useCallback(() => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    const url = window.prompt('URL odkazu (např. https://example.com):', 'https://');
    if (!url) return;
    editorRef.current?.focus();
    if (selectedText) {
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand('insertHTML', false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
  }, [onChange]);

  const doInsertImage = useCallback((url) => {
    if (!url?.trim()) return;
    const escaped = url.trim().replace(/"/g, '&quot;');
    const imgHtml = `<img src="${escaped}" alt="Obrázek" class="max-w-full h-auto rounded-lg my-2" style="max-width:100%;height:auto;border-radius:0.5rem;margin:0.5rem 0;" />`;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, imgHtml);
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
    setImageUrl('');
    setShowImagePicker(false);
  }, [onChange]);

  const handleImageFileChange = useCallback(async (e) => {
    const file = e.target?.files?.[0];
    e.target.value = '';
    if (!file || !onUploadImage) return;
    setImageUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) doInsertImage(url);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setImageUploading(false);
    }
  }, [onUploadImage, doInsertImage]);

  const insertImage = useCallback(() => {
    setShowVideoPicker(false);
    setShowTablePicker(false);
    setShowColorPicker(false);
    setShowImagePicker(v => !v);
  }, []);

  const doInsertVideo = useCallback((url) => {
    if (!url?.trim()) return;
    const u = url.trim();
    const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
    const vimeoMatch = u.match(/vimeo\.com\/(\d+)/);
    const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(u);
    let embedHtml = '';
    if (ytMatch) {
      embedHtml = `<div class="embed-video my-4" contenteditable="false" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>`;
    } else if (vimeoMatch) {
      embedHtml = `<div class="embed-video my-4" contenteditable="false" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>`;
    } else if (isDirectVideo) {
      embedHtml = `<div class="embed-video my-4" contenteditable="false"><video controls src="${u.replace(/"/g, '&quot;')}" style="max-width:100%;max-height:400px;"></video></div>`;
    } else {
      embedHtml = `<p><a href="${u.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${u}</a></p>`;
    }
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, embedHtml);
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
    setVideoUrl('');
    setShowVideoPicker(false);
  }, [onChange]);

  const insertVideo = useCallback(() => {
    setShowImagePicker(false);
    setShowTablePicker(false);
    setShowColorPicker(false);
    setShowVideoPicker(v => !v);
  }, []);

  const insertTable = useCallback(() => {
    const r = Math.min(Math.max(parseInt(tableRows) || 3, 1), 10);
    const c = Math.min(Math.max(parseInt(tableCols) || 3, 1), 10);
    const headers = Array.from({ length: c }, (_, i) =>
      `<th style="border:1px solid #d1d5db;padding:6px 10px;background:#f5f3ff;font-weight:600;text-align:left">Sloupec ${i + 1}</th>`
    ).join('');
    const cells = Array.from({ length: c }, () =>
      `<td style="border:1px solid #d1d5db;padding:6px 10px">&nbsp;</td>`
    ).join('');
    const bodyRows = Array.from({ length: r }, () => `<tr>${cells}</tr>`).join('');
    const tableHtml =
      `<table style="border-collapse:collapse;width:100%;margin:0.75rem 0">` +
      `<thead><tr>${headers}</tr></thead>` +
      `<tbody>${bodyRows}</tbody></table><p></p>`;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, tableHtml);
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
    setShowTablePicker(false);
  }, [tableRows, tableCols, onChange]);

  const applyTextColor = useCallback((color) => {
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
    const newVal = editorRef.current?.innerHTML || '';
    lastExternalValue.current = newVal;
    if (onChange) onChange(newVal);
    setShowColorPicker(false);
  }, [onChange]);

  const minHeight = `${Math.max(rows * 1.5, 6)}rem`;
  const maxHeight = `${Math.max(rows * 2.5, 15)}rem`;

  // Set initial content on mount only (avoids cursor-reset on re-render)
  React.useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = value;
      lastExternalValue.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Sep = () => <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

  const ToolBtn = ({ title, onAction, children, testId }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onAction(); }}
      data-testid={testId}
      className="px-1.5 h-7 min-w-[1.75rem] rounded text-xs font-semibold transition-colors hover:bg-muted text-bloom-text flex items-center justify-center"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-input rounded-md overflow-visible focus-within:ring-1 focus-within:ring-ring relative">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-muted/50 border-b border-border/50">
        {/* Block formatting */}
        <ToolBtn title="Nadpis 1" onAction={() => exec('formatBlock', 'h1')} testId="editor-h1">H1</ToolBtn>
        <ToolBtn title="Nadpis 2" onAction={() => exec('formatBlock', 'h2')} testId="editor-h2">H2</ToolBtn>
        <ToolBtn title="Nadpis 3" onAction={() => exec('formatBlock', 'h3')} testId="editor-h3">H3</ToolBtn>
        <ToolBtn title="Odstavec" onAction={() => exec('formatBlock', 'p')} testId="editor-p">P</ToolBtn>
        <Sep />
        {/* Inline formatting */}
        <ToolBtn title="Tučné (Ctrl+B)" onAction={() => exec('bold')} testId="editor-bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Kurzíva (Ctrl+I)" onAction={() => exec('italic')} testId="editor-italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <Sep />
        {/* List */}
        <ToolBtn title="Odrážkový seznam" onAction={() => exec('insertUnorderedList')} testId="editor-ul">
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <Sep />
        {/* Link */}
        <ToolBtn title="Vložit odkaz" onAction={insertLink} testId="editor-link">
          <Link2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <Sep />
        {/* Image with popup */}
        <div className="relative">
          <ToolBtn title="Vložit obrázek (náhled v textu)" onAction={insertImage} testId="editor-image">
            <Image className="w-3.5 h-3.5" />
          </ToolBtn>
          {showImagePicker && (
            <div
              className="absolute top-9 left-0 z-50 bg-white border border-border rounded-lg shadow-xl p-3 w-56"
              onMouseDown={e => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-bloom-text mb-2">Vložit obrázek</p>
              {onUploadImage && (
                <label className="flex items-center gap-2 px-2 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 mb-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={imageUploading}
                  />
                  <span className="text-xs text-bloom-sub">{imageUploading ? 'Nahrávám...' : 'Vybrat soubor'}</span>
                </label>
              )}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="URL obrázku"
                  className="flex-1 border border-border rounded px-2 py-1 text-xs"
                  data-testid="editor-image-url"
                />
                <button
                  type="button"
                  onClick={() => doInsertImage(imageUrl)}
                  className="px-2 py-1 bg-bloom-violet text-white text-xs rounded hover:bg-bloom-violet/90"
                  data-testid="editor-image-insert"
                >
                  Vložit
                </button>
              </div>
              <p className="text-[10px] text-bloom-sub/70">Obrázek se zobrazí jako náhled</p>
            </div>
          )}
        </div>
        <Sep />
        {/* Video with popup */}
        <div className="relative">
          <ToolBtn title="Vložit video" onAction={insertVideo} testId="editor-video">
            <Video className="w-3.5 h-3.5" />
          </ToolBtn>
          {showVideoPicker && (
            <div
              className="absolute top-9 left-0 z-50 bg-white border border-border rounded-lg shadow-xl p-3 w-64"
              onMouseDown={e => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-bloom-text mb-2">Vložit video</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="YouTube, Vimeo nebo URL videa"
                  className="flex-1 border border-border rounded px-2 py-1 text-xs"
                  data-testid="editor-video-url"
                />
                <button
                  type="button"
                  onClick={() => doInsertVideo(videoUrl)}
                  className="px-2 py-1 bg-bloom-violet text-white text-xs rounded hover:bg-bloom-violet/90"
                  data-testid="editor-video-insert"
                >
                  Vložit
                </button>
              </div>
            </div>
          )}
        </div>
        <Sep />
        {/* Text color */}
        <div className="relative">
          <ToolBtn
            title="Barva textu"
            onAction={() => { setShowTablePicker(false); setShowColorPicker(v => !v); }}
            testId="editor-color"
          >
            <Palette className="w-3.5 h-3.5" />
          </ToolBtn>
          {showColorPicker && (
            <div
              className="absolute top-9 left-0 z-50 bg-white border border-border rounded-lg shadow-xl p-2 w-40"
              onMouseDown={e => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-bloom-text mb-2">Barva textu</p>
              <div className="grid grid-cols-4 gap-1">
                {TEXT_COLORS.map(({ name, value }) => (
                  <button
                    key={value}
                    type="button"
                    title={name}
                    onClick={() => applyTextColor(value)}
                    className="w-8 h-8 rounded border border-border hover:ring-2 hover:ring-bloom-violet transition-all"
                    style={{ backgroundColor: value }}
                    data-testid={`color-${value.replace('#', '')}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <Sep />
        {/* Table with mini popup */}
        <div className="relative">
          <ToolBtn
            title="Vložit tabulku"
            onAction={() => { setShowColorPicker(false); setShowTablePicker(v => !v); }}
            testId="editor-table"
          >
            <Table2 className="w-3.5 h-3.5" />
          </ToolBtn>
          {showTablePicker && (
            <div
              className="absolute top-9 left-0 z-50 bg-white border border-border rounded-lg shadow-xl p-3 w-48"
              onMouseDown={e => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-bloom-text mb-2">Vložit tabulku</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-bloom-sub block mb-0.5">Řádky</label>
                  <input
                    type="number" min="1" max="10"
                    value={tableRows}
                    onChange={e => setTableRows(e.target.value)}
                    className="w-full border border-border rounded px-2 py-1 text-sm"
                    data-testid="table-rows-input"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-bloom-sub block mb-0.5">Sloupce</label>
                  <input
                    type="number" min="1" max="10"
                    value={tableCols}
                    onChange={e => setTableCols(e.target.value)}
                    className="w-full border border-border rounded px-2 py-1 text-sm"
                    data-testid="table-cols-input"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={insertTable}
                className="w-full bg-bloom-violet text-white text-xs py-1.5 rounded hover:bg-bloom-violet/90 transition-colors"
                data-testid="table-insert-btn"
              >
                Vložit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor content area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        data-testid="rich-editor-area"
        className="px-3 py-2 text-sm text-bloom-text outline-none overflow-y-auto leading-relaxed rich-editor"
        style={{ minHeight, maxHeight }}
      />
    </div>
  );
};
