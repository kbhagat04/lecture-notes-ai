import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface NotesProps {
    notes: string;
}

const Notes: React.FC<NotesProps> = ({ notes }) => {
    // Simple component to render the markdown content without the problematic plugins
    return (
        <div className="notes-container">
            <h2>Cleaned Notes</h2>
            <div className="notes-content">
                {/* Using a simpler configuration to avoid plugin compatibility issues */}
                <ReactMarkdown 
                    className="markdown-content"
                    rehypePlugins={[rehypeSanitize]}
                >
                    {notes}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default Notes;