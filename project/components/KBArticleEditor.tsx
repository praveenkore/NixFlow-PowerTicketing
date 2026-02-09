/**
 * KBArticleEditor - Rich text editor wrapper component
 * 
 * Integrates with existing RichTextEditor for
 * article content editing.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import RichTextEditor from './RichTextEditor';

interface KBArticleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  minHeight?: string;
}

/**
 * KBArticleEditor component
 */
export function KBArticleEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  error,
  minHeight = '300px',
}: KBArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  /**
   * Handle editor change
   */
  const handleEditorChange = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  /**
   * Handle insert image
   */
  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target as FileReader).result as string;
          const imgTag = `<img src="${base64}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
          // This would be inserted into the editor content
          // For now, we'll just log it
          console.log('Image ready to insert:', file.name);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, []);

  /**
   * Handle insert link
   */
  const handleInsertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      const linkTag = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      // This would be inserted into the editor content
      console.log('Link ready to insert:', url);
    }
  }, []);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
        <button
          type="button"
          onClick={() => document.execCommand('bold', false, undefined)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4v4a4 4 0 01-4 4H6a4 4 0 00-4 4v-4a4 4 0 014-4z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => document.execCommand('italic', false, undefined)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4a2 2 0 00-2-2V6a2 2 0 012-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => document.execCommand('underline', false, undefined)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 8v4m0 4h10M5 8h14a2 2 0 012-2v12a2 2 0 01-2 2H5a2 2 0 00-2 2v12a2 2 0 012-2z" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        <button
          type="button"
          onClick={() => document.execCommand('insertUnorderedList', false, undefined)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => document.execCommand('insertOrderedList', false, undefined)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        <button
          type="button"
          onClick={handleInsertLink}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656-5.656l-1.414-1.414L9 9.172l-2.828-2.828a2 2 0 01-2.828-2.828l-1.414 1.414a4 4 0 00-5.656 5.656l5.656 5.656a2 2 0 012 2h1.414l-1.414 1.414a2 2 0 01-2.828 2.828l1.414-1.414L11 16.172l2.828 2.828a2 2 0 012-2h-1.414l1.414 1.414a2 2 0 012-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleInsertImage}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Image"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012-2v10a2 2 0 01-2-2H6a2 2 0 00-2 2V6a2 2 0 012-2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2h2" />
          </svg>
        </button>

        <div className="flex-1"></div>

        <div className="text-xs text-gray-500">
          {value.length} characters
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className={`border rounded-b-lg overflow-hidden ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        style={{ minHeight }}
      >
        <RichTextEditor
          value={value}
          onChange={handleEditorChange}
          placeholder={placeholder}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 mt-2">
        <p>Tip: Use the toolbar above for quick formatting options</p>
      </div>
    </div>
  );
}

export default KBArticleEditor;
