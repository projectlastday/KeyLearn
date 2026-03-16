import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import markdownItMark from 'markdown-it-mark';

const markdownParser = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
}).use(markdownItMark);

export const renderNoteMarkdown = (content) => {
    const rendered = markdownParser.render(String(content ?? ''));

    return DOMPurify.sanitize(rendered, {
        USE_PROFILES: { html: true },
    });
};

