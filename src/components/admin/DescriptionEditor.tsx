import { useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Heading2,
    Heading3,
    Bold,
    Italic,
    List,
    ListOrdered,
    Minus,
} from '@/icons/iconsax';
import { FormatSuggestionsButton } from './FormatSuggestionsButton';
import type { JSONContent } from '@/lib/tiptap-utils';
import { analyzeContent } from '@/lib/tiptap-utils';

interface DescriptionEditorProps {
    content: JSONContent | null;
    onChange: (json: JSONContent) => void;
    error?: string;
    placeholder?: string;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
    title: string;
}

function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`gh-rte-tool p-1.5 rounded-lg transition-colors ${
                isActive
                    ? 'bg-[#17382e]/10 text-[#17382e]'
                    : 'text-muted-foreground hover:bg-secondary/10 hover:text-foreground'
            }`}
        >
            {children}
        </button>
    );
}

function ToolbarSeparator() {
    return <div className="w-px h-5 bg-border/50 mx-1" />;
}

export function DescriptionEditor({
    content,
    onChange,
    error,
    placeholder = "Describe the property's unique features, floors, and vibe...",
}: DescriptionEditorProps) {
    const lastContentRef = useRef<string>('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                code: false,
                codeBlock: false,
                blockquote: false,
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
        onUpdate: ({ editor }) => {
            const json = editor.getJSON() as JSONContent;
            lastContentRef.current = JSON.stringify(json);
            onChange(json);
        },
        editorProps: {
            attributes: {
                class: 'outline-none min-h-[200px] p-6 font-medium',
            },
        },
    });

    // Sync external content changes (draft load, edit mode load, format suggestions)
    // Guarded by JSON comparison to prevent cursor jumps during typing
    useEffect(() => {
        if (!editor || !content) return;
        const incoming = JSON.stringify(content);
        if (incoming !== lastContentRef.current) {
            lastContentRef.current = incoming;
            editor.commands.setContent(content);
        }
    }, [editor, content]);

    // Content analysis for stats + quality hints
    const analysis = useMemo(() => analyzeContent(content), [content]);
    const readingMinutes = Math.max(1, Math.ceil(analysis.wordCount / 200));

    // Quality hints — non-blocking signals
    const hints = useMemo(() => {
        if (analysis.charCount === 0) return [];
        const h: string[] = [];
        if (analysis.charCount < 300) h.push('Aim for 300+ characters');
        if (analysis.paragraphCount < 2) h.push('Add a second paragraph');
        if (analysis.headingCount === 0) h.push('Use headings to structure');
        return h;
    }, [analysis]);

    if (!editor) return null;

    return (
        <div
            className={`tiptap-editor rounded-[2rem] bg-secondary/5 border overflow-hidden transition-colors ${
                error ? 'border-brand-danger ring-1 ring-brand-danger' : 'border-border'
            }`}
        >
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border/50 bg-secondary/5">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                >
                    <Heading3 size={16} />
                </ToolbarButton>

                <ToolbarSeparator />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold"
                >
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic"
                >
                    <Italic size={16} />
                </ToolbarButton>

                <ToolbarSeparator />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </ToolbarButton>

                <ToolbarSeparator />

                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    isActive={false}
                    title="Divider"
                >
                    <Minus size={16} />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />

            {/* Footer: Format Button + Hints + Stats */}
            <div className="flex items-center justify-between px-6 py-2 border-t border-border/30">
                <div className="flex items-center gap-4">
                    <FormatSuggestionsButton editor={editor} />
                    {hints.length > 0 && (
                        <div className="flex items-center gap-2">
                            {hints.map((hint) => (
                                <span key={hint} className="text-[11px] text-amber-600/70 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {hint}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground/60 shrink-0">
                    <span>{analysis.charCount.toLocaleString()} characters</span>
                    <span>~{readingMinutes} min read</span>
                </div>
            </div>
        </div>
    );
}
