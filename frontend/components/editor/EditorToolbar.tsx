'use client';

import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline, Strikethrough, Code, Code2,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote,
  Undo2, Redo2, Minus,
} from 'lucide-react';

interface Props { editor: Editor | null }

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  const ToolBtn = ({
    label, onClick, active, disabled = false, icon: Icon,
  }: {
    label: string; onClick: () => void;
    active?: boolean; disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onMouseDown={e => { e.preventDefault(); onClick(); }}
          disabled={disabled}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded transition-colors',
            'hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed',
            active && 'bg-accent text-accent-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const Sep = () => <Separator orientation="vertical" className="h-5 mx-0.5" />;

  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 flex-wrap">
      {/* History */}
      <ToolBtn label="Undo (⌘Z)"  onClick={() => editor.chain().focus().undo().run()}
        icon={Undo2}  disabled={!editor.can().undo()} />
      <ToolBtn label="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()}
        icon={Redo2}  disabled={!editor.can().redo()} />
      <Sep />

      {/* Headings */}
      <ToolBtn label="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        icon={Heading1} active={editor.isActive('heading', { level: 1 })} />
      <ToolBtn label="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        icon={Heading2} active={editor.isActive('heading', { level: 2 })} />
      <ToolBtn label="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        icon={Heading3} active={editor.isActive('heading', { level: 3 })} />
      <Sep />

      {/* Inline marks */}
      <ToolBtn label="Bold (⌘B)"        onClick={() => editor.chain().focus().toggleBold().run()}
        icon={Bold}           active={editor.isActive('bold')} />
      <ToolBtn label="Italic (⌘I)"      onClick={() => editor.chain().focus().toggleItalic().run()}
        icon={Italic}         active={editor.isActive('italic')} />
      <ToolBtn label="Underline (⌘U)"   onClick={() => editor.chain().focus().toggleUnderline().run()}
        icon={Underline}      active={editor.isActive('underline')} />
      <ToolBtn label="Strikethrough"    onClick={() => editor.chain().focus().toggleStrike().run()}
        icon={Strikethrough}  active={editor.isActive('strike')} />
      <ToolBtn label="Inline code"      onClick={() => editor.chain().focus().toggleCode().run()}
        icon={Code}           active={editor.isActive('code')} />
      <Sep />

      {/* Blocks */}
      <ToolBtn label="Bullet list"    onClick={() => editor.chain().focus().toggleBulletList().run()}
        icon={List}        active={editor.isActive('bulletList')} />
      <ToolBtn label="Ordered list"   onClick={() => editor.chain().focus().toggleOrderedList().run()}
        icon={ListOrdered} active={editor.isActive('orderedList')} />
      <ToolBtn label="Task list"      onClick={() => editor.chain().focus().toggleTaskList().run()}
        icon={CheckSquare} active={editor.isActive('taskList')} />
      <ToolBtn label="Blockquote"     onClick={() => editor.chain().focus().toggleBlockquote().run()}
        icon={Quote}       active={editor.isActive('blockquote')} />
      <ToolBtn label="Code block"     onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        icon={Code2}       active={editor.isActive('codeBlock')} />
      <ToolBtn label="Divider"        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus} />
    </div>
  );
}
