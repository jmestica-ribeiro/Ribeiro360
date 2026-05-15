import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Pilcrow,
} from 'lucide-react';
import './RichTextEditor.css';

const ToolbarBtn = ({ onClick, active, title, children }) => (
  <button
    type="button"
    title={title}
    className={`rte-btn${active ? ' active' : ''}`}
    onMouseDown={e => { e.preventDefault(); onClick(); }}
  >
    {children}
  </button>
);

const Divider = () => <span className="rte-divider" />;

const RichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const run = useCallback((fn) => { if (editor) fn(editor.chain().focus()); }, [editor]);

  if (!editor) return null;

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        {/* Párrafo / Headings */}
        <ToolbarBtn title="Párrafo" active={editor.isActive('paragraph')} onClick={() => run(c => c.setParagraph().run())}>
          <Pilcrow size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => run(c => c.toggleHeading({ level: 1 }).run())}>
          <Heading1 size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => run(c => c.toggleHeading({ level: 2 }).run())}>
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => run(c => c.toggleHeading({ level: 3 }).run())}>
          <Heading3 size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Formato */}
        <ToolbarBtn title="Negrita" active={editor.isActive('bold')} onClick={() => run(c => c.toggleBold().run())}>
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Cursiva" active={editor.isActive('italic')} onClick={() => run(c => c.toggleItalic().run())}>
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Subrayado" active={editor.isActive('underline')} onClick={() => run(c => c.toggleUnderline().run())}>
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Tachado" active={editor.isActive('strike')} onClick={() => run(c => c.toggleStrike().run())}>
          <Strikethrough size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Listas */}
        <ToolbarBtn title="Lista con viñetas" active={editor.isActive('bulletList')} onClick={() => run(c => c.toggleBulletList().run())}>
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => run(c => c.toggleOrderedList().run())}>
          <ListOrdered size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Alineación */}
        <ToolbarBtn title="Alinear izquierda" active={editor.isActive({ textAlign: 'left' })} onClick={() => run(c => c.setTextAlign('left').run())}>
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Centrar" active={editor.isActive({ textAlign: 'center' })} onClick={() => run(c => c.setTextAlign('center').run())}>
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Alinear derecha" active={editor.isActive({ textAlign: 'right' })} onClick={() => run(c => c.setTextAlign('right').run())}>
          <AlignRight size={14} />
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
};

export default RichTextEditor;
