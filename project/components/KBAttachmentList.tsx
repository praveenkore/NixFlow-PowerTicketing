/**
 * KBAttachmentList - File attachments component
 * 
 * Displays list of article attachments with download links
 * and file information.
 */

import React from 'react';
import type { ArticleAttachment } from '../types/kb';

interface KBAttachmentListProps {
  attachments: ArticleAttachment[];
  onDownload?: (attachment: ArticleAttachment) => void;
  onDelete?: (attachmentId: number) => void;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 */
function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  }
  if (mimeType.startsWith('video/')) {
    return '🎬';
  }
  if (mimeType.startsWith('audio/')) {
    return '🎵';
  }
  if (mimeType.includes('pdf')) {
    return '📄';
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return '📝';
  }
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return '📊';
  }
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
    return '📽️';
  }
  if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return '📦';
  }
  return '📎';
}

/**
 * KBAttachmentList component
 */
export function KBAttachmentList({ attachments, onDownload, onDelete }: KBAttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <p>No attachments</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* File icon */}
            <span className="text-2xl flex-shrink-0">{getFileIcon(attachment.mimeType)}</span>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{attachment.fileName}</p>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{formatFileSize(attachment.fileSize)}</span>
                <span>•</span>
                <span>{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Download button */}
            <button
              onClick={() => onDownload?.(attachment)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={() => onDelete(attachment.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KBAttachmentList;
