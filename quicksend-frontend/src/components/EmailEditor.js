import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

const EmailEditor = ({ content, onChange }) => {
    // Initialiser l'éditeur Tiptap
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
            TextStyle,
            Color,
        ],
        content: content || '<p>Contenu de l\'email ici...</p>', // Contenu initial passé en prop
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(editor.getHTML()); // Appeler la fonction onChange avec le contenu HTML
            }
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div style={{
            textAlign: 'center',
            marginTop: '50px',
            maxWidth: '800px',
            margin: '0 auto',
            height: '50vh', // Hauteur fixe pour que l'éditeur ait un espace à remplir
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Barre d'outils */}
            <div style={{ border: '1px solid #ddd', padding: '5px', background: '#f9f9f9', marginBottom: '10px' }}>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().toggleBold()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Gras
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().toggleItalic()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Italique
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={!editor.can().toggleUnderline()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Souligner
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Gauche
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Centre
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Droite
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Justifié
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    H1
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Liste
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setColor('#ff0000').run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Rouge
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    style={{ padding: '5px 10px', margin: '0 5px' }}
                >
                    Normal
                </button>
            </div>

            {/* Contenu de l'éditeur */}
            <EditorContent
                editor={editor}
                style={{
                    border: '1px solid #ddd',
                    padding: '10px',
                    flex: 1, // L'éditeur prend tout l'espace restant
                    textAlign: 'left',
                    overflow: 'auto', // Ajoute une scrollbar si le contenu dépasse
                }}
            />
        </div>
    );
};

export default EmailEditor;