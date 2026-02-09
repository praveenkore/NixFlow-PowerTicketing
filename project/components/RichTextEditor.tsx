import React, { useRef, useEffect } from 'react';
import { BoldIcon, ItalicIcon, ListBulletIcon, ListNumberedIcon } from './icons';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EditorButton: React.FC<{ onClick: () => void; children: React.ReactNode; title: string }> = ({ onClick, children, title }) => (
    <button
        type="button"
        title={title}
        onMouseDown={(e) => { // use onMouseDown to prevent the editor from losing focus
            e.preventDefault();
            onClick();
        }}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
    >
        {children}
    </button>
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCmd = (command: string) => {
        document.execCommand(command, false, undefined);
        editorRef.current?.focus();
        handleInput(); // Ensure state is updated after command
    };
    
    useEffect(() => {
        // Synchronize the editor's content with the `value` prop if they differ.
        // This is important for cases where the ticket is loaded for editing.
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);


    return (
        <div className="rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white dark:bg-gray-700">
            <div className="toolbar p-1 flex items-center gap-1 border-b border-gray-200 dark:border-gray-600">
                <EditorButton onClick={() => execCmd('bold')} title="Bold"><BoldIcon className="w-5 h-5" /></EditorButton>
                <EditorButton onClick={() => execCmd('italic')} title="Italic"><ItalicIcon className="w-5 h-5" /></EditorButton>
                <EditorButton onClick={() => execCmd('insertUnorderedList')} title="Bulleted List"><ListBulletIcon className="w-5 h-5" /></EditorButton>
                <EditorButton onClick={() => execCmd('insertOrderedList')} title="Numbered List"><ListNumberedIcon className="w-5 h-5" /></EditorButton>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="prose dark:prose-invert max-w-none p-3 min-h-[120px] w-full text-gray-900 dark:text-gray-100 outline-none"
                data-placeholder={placeholder}
            />
        </div>
    );
};