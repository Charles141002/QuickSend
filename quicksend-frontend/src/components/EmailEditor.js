import React, { useEffect, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import OrderedList from '@tiptap/extension-ordered-list';
import { 
    FaBold, FaItalic, FaUnderline, FaLink, 
    FaAlignLeft, FaAlignCenter, FaAlignRight, 
    FaListUl, FaListOl 
} from 'react-icons/fa';

import 'tippy.js/dist/tippy.css';
import './EmailEditor.css';

const EmailEditor = ({ content, onChange, variables = [] }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'left' }), // Alignement par défaut à gauche
            Underline,
            Link.configure({ openOnClick: false }),
            OrderedList,
        ],
        content: content || '<p>Écrivez votre email ici...</p>',
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(editor.getHTML());
            }
        },
        editorProps: {
            attributes: {
                class: 'gmail-editor-content',
            },
        },
    });

    // Synchroniser l'éditeur avec la prop content
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '<p>Écrivez votre email ici...</p>');
        }
    }, [editor, content]);

    // Focus automatique sur l'éditeur au chargement
    useEffect(() => {
        if (editor) {
            editor.chain().focus().run();
        }
    }, [editor]);

    // useCallback pour insérer une variable
    const insertVariable = useCallback((variable) => {
        if (editor) {
            editor.chain().focus().insertContent(`{{${variable}}}`).run();
        }
    }, [editor]);

    if (!editor) {
        return <div className="editor-loading">Chargement de l'éditeur...</div>;
    }

    // Gestion des liens
    const handleLink = () => {
        const url = prompt('Entrez l’URL du lien :');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <div className="gmail-editor-container">
            {/* Barre d’outils (style Gmail) */}
            <div className="gmail-editor-toolbar">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().toggleBold()}
                    className={`gmail-editor-button ${editor.isActive('bold') ? 'active' : ''}`}
                    title="Gras"
                >
                    <FaBold />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().toggleItalic()}
                    className={`gmail-editor-button ${editor.isActive('italic') ? 'active' : ''}`}
                    title="Italique"
                >
                    <FaItalic />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={!editor.can().toggleUnderline()}
                    className={`gmail-editor-button ${editor.isActive('underline') ? 'active' : ''}`}
                    title="Souligner"
                >
                    <FaUnderline />
                </button>
                <button
                    type="button"
                    onClick={handleLink}
                    className={`gmail-editor-button ${editor.isActive('link') ? 'active' : ''}`}
                    title="Ajouter un lien"
                >
                    <FaLink />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`gmail-editor-button ${editor.isActive('bulletList') ? 'active' : ''}`}
                    title="Liste à puces"
                >
                    <FaListUl />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`gmail-editor-button ${editor.isActive('orderedList') ? 'active' : ''}`}
                    title="Liste numérotée"
                >
                    <FaListOl />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`gmail-editor-button ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
                    title="Aligner à gauche"
                >
                    <FaAlignLeft />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`gmail-editor-button ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
                    title="Centrer"
                >
                    <FaAlignCenter />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`gmail-editor-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
                    title="Aligner à droite"
                >
                    <FaAlignRight />
                </button>
                {variables.length > 0 && (
                    <div className="variable-selector">
                        <select
                            onChange={(e) => {
                                insertVariable(e.target.value);
                                e.target.selectedIndex = 0; // Réinitialiser après insertion
                            }}
                            className="gmail-editor-select"
                        >
                            <option value="">Insérer une variable</option>
                            {variables.map((variable) => (
                                <option key={variable} value={variable}>
                                    {variable}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Zone d'édition (style Gmail, prenant toute la place) */}
            <EditorContent
                editor={editor}
                className="gmail-editor-content"
            />
        </div>
    );
};

export default EmailEditor;