'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit     from '@tiptap/starter-kit';
import Placeholder    from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline      from '@tiptap/extension-underline';
import Link           from '@tiptap/extension-link';
import TaskList       from '@tiptap/extension-task-list';
import TaskItem       from '@tiptap/extension-task-item';
import Typography     from '@tiptap/extension-typography';
import { useEffect, useCallback } from 'react';
import { cn, debounce } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar';
import {
  Bold, Italic, Underline as UnderlineIcon,
  Code, Link as LinkIcon, List, ListOrdered,
} from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoSaveMs?: number;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing…  Type / for commands',
  editable = true,
  autoSaveMs = 1500,
}: Props) {

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(debounce(onChange, autoSaveMs), [onChange, autoSaveMs]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rounded-lg bg-muted p-4 font-mono text-sm' } },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Underline,
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'outline-none',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
  });

  // Sync content from outside (e.g. loading a different note)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== content) {
      editor.commands.setContent(content, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Fixed toolbar */}
      <EditorToolbar editor={editor} />

      {/* Floating bubble menu for selected text */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, placement: 'top' }}
          className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg"
        >
          {[
            { action: () => editor.chain().focus().toggleBold().run(),      icon: Bold,         active: editor.isActive('bold'),      label: 'Bold' },
            { action: () => editor.chain().focus().toggleItalic().run(),    icon: Italic,       active: editor.isActive('italic'),    label: 'Italic' },
            { action: () => editor.chain().focus().toggleUnderline().run(), icon: UnderlineIcon,active: editor.isActive('underline'), label: 'Underline' },
            { action: () => editor.chain().focus().toggleCode().run(),      icon: Code,         active: editor.isActive('code'),      label: 'Code' },
            { action: () => editor.chain().focus().toggleBulletList().run(),icon: List,         active: editor.isActive('bulletList'),label: 'List' },
            { action: () => editor.chain().focus().toggleOrderedList().run(),icon: ListOrdered, active: editor.isActive('orderedList'),label: 'Ordered' },
          ].map(({ action, icon: Icon, active, label }) => (
            <button
              key={label}
              onClick={action}
              title={label}
              className={cn(
                'p-1.5 rounded transition-colors hover:bg-accent',
                active && 'bg-accent text-accent-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </BubbleMenu>
      )}

      {/* Scrollable editor area */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-16 xl:px-24 py-6">
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-end gap-4 px-4 py-1.5 border-t border-border text-[11px] text-muted-foreground bg-background/50">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{charCount.toLocaleString()} characters</span>
      </div>
    </div>
  );
}
