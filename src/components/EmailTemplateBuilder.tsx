'use client';

import { useEffect, useRef, useState } from 'react';
import 'grapesjs/dist/css/grapes.min.css';

interface EmailTemplateBuilderProps {
  initialHtml: string;
  onChange: (html: string) => void;
}

interface ImportCodeEditor {
  setContent: (content: string) => void;
  editor?: { refresh: () => void };
}

interface NewsletterImportCommand {
  codeEditorHtml?: ImportCodeEditor;
}

function parseEmailDocument(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const styles = Array.from(document.head.querySelectorAll('style'))
    .map((style) => style.textContent || '')
    .filter(Boolean)
    .join('\n');
  const head = Array.from(document.head.children)
    .filter((element) => element.tagName !== 'STYLE')
    .map((element) => element.outerHTML)
    .join('\n');
  const attributes = Array.from(document.body.attributes)
    .map(({ name, value }) => {
      const escapedValue = value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
      return `${name}="${escapedValue}"`;
    })
    .join(' ');
  const lang = /^[a-zA-Z-]+$/.test(document.documentElement.lang)
    ? document.documentElement.lang
    : 'id';

  return {
    body: document.body.innerHTML || html,
    bodyAttributes: attributes ? ` ${attributes}` : '',
    head,
    lang,
    styles,
  };
}

export default function EmailTemplateBuilder({
  initialHtml,
  onChange,
}: EmailTemplateBuilderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<import('grapesjs').Editor | null>(null);
  const initialHtmlRef = useRef(initialHtml);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let editor: import('grapesjs').Editor | undefined;

    const initialize = async () => {
      try {
        const [{ default: grapesjs }, { default: newsletter }] = await Promise.all([
          import('grapesjs'),
          import('grapesjs-preset-newsletter'),
        ]);
        if (disposed) return;

        const parsed = parseEmailDocument(initialHtmlRef.current);
        editor = grapesjs.init({
          container,
          height: '100%',
          width: 'auto',
          fromElement: false,
          storageManager: false,
          plugins: [
            (grapesEditor) => newsletter(grapesEditor, {
              modalTitleImport: 'Edit HTML source',
              modalLabelImport: 'Edit the email HTML, then select Apply HTML to update the visual design.',
              modalBtnImport: 'Apply HTML',
              importPlaceholder: `${parsed.body}<style>${parsed.styles}</style>`,
            }),
          ],
        });
        editorRef.current = editor;

        editor.setComponents(parsed.body);
        editor.setStyle(parsed.styles);
        const initialProject = JSON.stringify(editor.getProjectData());

        editor.on('update', () => {
          if (JSON.stringify(editor?.getProjectData()) === initialProject) return;

          try {
            const rendered = editor?.runCommand('gjs-get-inlined-html');
            if (typeof rendered !== 'string') {
              setError('Email builder did not return HTML output.');
              return;
            }

            const outputDocument = new DOMParser().parseFromString(rendered, 'text/html');
            const exportedStyles = Array.from(outputDocument.querySelectorAll('style'))
              .map((style) => style.outerHTML)
              .join('\n');
            outputDocument.querySelectorAll('style').forEach((style) => style.remove());

            const head = [
              parsed.head || [
                '<meta charset="utf-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1">',
                '<meta name="x-apple-disable-message-reformatting">',
              ].join('\n'),
              exportedStyles,
            ].filter(Boolean).join('\n');

            onChangeRef.current(
              `<!doctype html>\n<html lang="${parsed.lang}">\n<head>\n${head}\n</head>\n<body${parsed.bodyAttributes}>${outputDocument.body.innerHTML}</body>\n</html>`,
            );
            setError(null);
          } catch (renderError) {
            setError(
              renderError instanceof Error
                ? renderError.message
                : 'Failed to export email HTML.',
            );
          }
        });

      } catch (initializationError) {
        setError(
          initializationError instanceof Error
            ? initializationError.message
            : 'Failed to initialize the email builder.',
        );
      }
    };

    void initialize();

    return () => {
      disposed = true;
      editorRef.current = null;
      editor?.destroy();
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-white">
      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-600">
          Email builder error: {error}
        </div>
      )}
      <div className="flex shrink-0 justify-end border-b border-gray-200 bg-gray-50 px-3 py-2">
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          onClick={() => {
            const editor = editorRef.current;
            if (!editor) return;

            const command = editor.Commands.get('gjs-open-import-template') as
              | (ReturnType<typeof editor.Commands.get> & NewsletterImportCommand)
              | undefined;
            editor.runCommand('gjs-open-import-template');

            window.requestAnimationFrame(() => {
              const html = `${editor.getHtml()}<style>${editor.getCss()}</style>`;
              command?.codeEditorHtml?.setContent(html);
              command?.codeEditorHtml?.editor?.refresh();
            });
          }}
        >
          Edit HTML Source
        </button>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />
    </div>
  );
}
