'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X, Mail, AlertCircle, Info, Code2 } from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { ChannelType, CreateTemplateRequest, UpdateTemplateRequest } from '@/types';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-80 w-full bg-gray-900 animate-pulse rounded-xl border border-gray-800" />
});

import 'react-quill-new/dist/quill.snow.css';

interface MessageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest | UpdateTemplateRequest) => Promise<void>;
  channelType: ChannelType;
  initialData?: any;
}

export default function MessageTemplateModal({
  isOpen,
  onClose,
  onSubmit,
  channelType,
  initialData
}: MessageTemplateModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRawMode, setIsRawMode] = useState(false);

  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
    },
  }), []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setSubject(initialData.subject || '');
        setContent(initialData.content);
      } else {
        setName('');
        setSubject('');
        setContent('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        channelType,
        content: content.trim(),
      };

      if (channelType === ChannelType.EMAIL) {
        payload.subject = subject.trim();
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] relative overflow-hidden"
        style={{
          resize: 'both',
          width: '800px',
          height: '850px',
          minWidth: '500px',
          minHeight: '600px',
          maxWidth: '95vw'
        }}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Code2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {initialData ? 'Update Template' : `New ${channelType.charAt(0).toUpperCase() + channelType.slice(1)} Template`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 text-sm shrink-0">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="shrink-0">
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                Template Name
              </label>
              <Input
                placeholder="e.g. welcome-user"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!!initialData} // Usually name is the unique key
              />
              <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
                <Info className="h-3 w-3" />
                This name will be used to trigger the message via API.
              </p>
            </div>

            {channelType === ChannelType.EMAIL && (
              <div className="shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-[var(--text-primary)]">
                    Email Subject
                  </label>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Supports {"{{variable}}"}
                  </span>
                </div>
                <Input
                  placeholder="e.g. Welcome to Bagdja, {{name}}!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <div className="flex items-center justify-between shrink-0">
                <label className="text-sm font-bold text-[var(--text-primary)]">
                  Content {channelType === ChannelType.EMAIL ? '(Rich Text)' : '(Plain Text)'}
                </label>
                <div className="flex items-center gap-4">
                  {channelType === ChannelType.EMAIL && (
                    <button
                      type="button"
                      onClick={() => setIsRawMode(!isRawMode)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${isRawMode
                          ? 'bg-[var(--action-primary)] text-white'
                          : 'bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      <Code2 className="h-3 w-3" />
                      {isRawMode ? 'Exit Raw HTML' : 'Raw HTML'}
                    </button>
                  )}
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Use {"{{variable}}"} for dynamic values
                  </span>
                </div>
              </div>

              {channelType === ChannelType.EMAIL ? (
                <div className="quill-dark-theme flex-1 flex flex-col min-h-0">
                  {isRawMode ? (
                    <textarea
                      className="flex-1 w-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-xl border border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="<html>...</html>"
                    />
                  ) : (
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      placeholder="Write your email content here... Use {{username}} for dynamic data."
                      className="flex-1 flex flex-col min-h-0"
                    />
                  )}
                  <style jsx global>{`
                    .quill-dark-theme .ql-toolbar {
                      background-color: #1f2937;
                      border-color: #374151;
                      border-top-left-radius: 0.75rem;
                      border-top-right-radius: 0.75rem;
                      flex-shrink: 0;
                    }
                    .quill-dark-theme .ql-container {
                      background-color: #ffffff;
                      border-color: #374151;
                      border-bottom-left-radius: 0.75rem;
                      border-bottom-right-radius: 0.75rem;
                      font-family: inherit;
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                      min-height: 0;
                    }
                    .quill-dark-theme .ql-editor {
                      color: #111827;
                      flex: 1;
                      overflow-y: auto;
                    }
                    .quill-dark-theme .ql-stroke {
                      stroke: #9ca3af;
                    }
                    .quill-dark-theme .ql-fill {
                      fill: #9ca3af;
                    }
                    .quill-dark-theme .ql-picker {
                      color: #9ca3af;
                    }
                    .quill-dark-theme .ql-picker-options {
                      background-color: #1f2937;
                      border-color: #374151;
                    }
                  `}</style>
                </div>
              ) : (
                <textarea
                  className="flex-1 w-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-xl border border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hello {{username}}, welcome to our platform!"
                  required
                />
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-[var(--border-default)] flex gap-3 shrink-0 relative">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : (initialData ? 'Update Template' : 'Create Template')}
          </Button>

          {/* Resize Handle Icon */}
          <div className="absolute bottom-1 right-1 pointer-events-none opacity-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
              <line x1="21" y1="21" x2="9" y2="21" />
              <line x1="21" y1="21" x2="21" y2="9" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
