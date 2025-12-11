import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface NotesProps {
    notes: string;
}

const Notes: React.FC<NotesProps> = ({ notes }) => {
    // Simple component to render the markdown content
    return (
        <div className="notes-card">
            <div className="notes-header">
                <h2>📚 AI Generated Notes</h2>
            </div>
            <div className="markdown-body" id="notes-content">
                <ReactMarkdown 
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {notes}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default Notes;