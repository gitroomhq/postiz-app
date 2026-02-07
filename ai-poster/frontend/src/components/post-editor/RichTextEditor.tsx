import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import {
  Bold,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  Heading1,
  Heading2,
  Heading3,
  Smile,
} from 'lucide-react';

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string, plainText: string) => void;
  maxChars?: number;
  placeholder?: string;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        isActive
          ? 'bg-brand-100 text-brand-700'
          : 'text-text-muted hover:bg-surface-tertiary hover:text-text-primary'
      )}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  maxChars,
  placeholder = 'Write your post content...',
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-600 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertEmoji = useCallback(() => {
    if (!editor) return;
    // Simple emoji insertion - in production this would open a picker
    const emojis = ['👍', '🎉', '🔥', '💡', '⭐', '🚀', '❤️', '✨'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    editor.chain().focus().insertContent(randomEmoji).run();
  }, [editor]);

  if (!editor) return null;

  const charCount = editor.getText().length;
  const charPercentage = maxChars ? (charCount / maxChars) * 100 : 0;

  return (
    <div className={cn('border border-surface-tertiary rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1.5 border-b border-surface-tertiary bg-surface-secondary/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-surface-tertiary mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-surface-tertiary mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-surface-tertiary mx-1" />

        <ToolbarButton onClick={insertEmoji} title="Emoji">
          <Smile className="w-4 h-4" />
        </ToolbarButton>

        {/* Character count */}
        <div className="ml-auto flex items-center">
          <span
            className={cn(
              'text-xs font-mono',
              !maxChars && 'text-text-muted',
              maxChars && charPercentage < 80 && 'text-text-muted',
              maxChars && charPercentage >= 80 && charPercentage < 100 && 'text-status-generated',
              maxChars && charPercentage >= 100 && 'text-status-failed font-semibold'
            )}
          >
            {charCount}
            {maxChars && <span>/{maxChars}</span>}
          </span>
        </div>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-3 min-h-[10rem] focus:outline-none',
          'text-text-primary',
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[8rem]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-text-muted',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none'
        )}
      />
    </div>
  );
}
