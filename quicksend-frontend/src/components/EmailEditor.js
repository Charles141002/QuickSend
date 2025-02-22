import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { 
    FaBold, FaItalic, FaUnderline, 
    FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify, 
    FaHeading, FaListUl, FaPaintBrush, FaEraser 
} from 'react-icons/fa'; // Icônes de react-icons

const EmailEditor = ({ content, onChange, variables = [] }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
            TextStyle,
            Color,
        ],
        content: content || '<p>Contenu de l\'email ici...</p>',
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(editor.getHTML());
            }
        },
    });

    if (!editor) {
        return null;
    }

    const insertVariable = (variable) => {
        editor.chain().focus().insertContent(`{{${variable}}}`).run();
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '400px',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
        }}>
            <div style={{
                padding: '10px',
                backgroundColor: '#f1f3f5',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
            }}>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().toggleBold()}
                    className="editor-button"
                    title="Gras"
                >
                    <FaBold />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().toggleItalic()}
                    className="editor-button"
                    title="Italique"
                >
                    <FaItalic />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={!editor.can().toggleUnderline()}
                    className="editor-button"
                    title="Souligner"
                >
                    <FaUnderline />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className="editor-button"
                    title="Aligner à gauche"
                >
                    <FaAlignLeft />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className="editor-button"
                    title="Centrer"
                >
                    <FaAlignCenter />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className="editor-button"
                    title="Aligner à droite"
                >
                    <FaAlignRight />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className="editor-button"
                    title="Justifier"
                >
                    <FaAlignJustify />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className="editor-button"
                    title="Titre H1"
                >
                    <FaHeading />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className="editor-button"
                    title="Liste à puces"
                >
                    <FaListUl />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setColor('#ff0000').run()}
                    className="editor-button"
                    title="Couleur rouge"
                >
                    <FaPaintBrush style={{ color: '#ff0000' }} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    className="editor-button"
                    title="Supprimer couleur"
                >
                    <FaEraser />
                </button>
                {variables.length > 0 && (
                    <select
                        onChange={(e) => insertVariable(e.target.value)}
                        className="editor-select"
                    >
                        <option value="">Insérer une variable</option>
                        {variables.map((variable) => (
                            <option key={variable} value={variable}>{variable}</option>
                        ))}
                    </select>
                )}
            </div>
            <EditorContent
                editor={editor}
                style={{
                    flex: 1,
                    padding: '15px',
                    overflow: 'auto',
                    fontSize: '1rem',
                    color: '#333',
                    backgroundColor: '#fff',
                }}
            />
        </div>
    );
};

export default EmailEditor;