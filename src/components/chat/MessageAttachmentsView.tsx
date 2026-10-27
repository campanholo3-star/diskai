import React, { useState } from 'react';
import {
  FileText,
  File,
  Download,
  Image as ImageIcon,
  Film,
  Music,
  ExternalLink,
  Eye,
  X
} from 'lucide-react';
import { MessageAttachment } from '../../types';

interface MessageAttachmentsViewProps {
  attachments?: MessageAttachment[];
}

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Comprime imagens para no máximo 1200px e JPEG 0.78, reduzindo fotos de 5MB para ~80KB.
 * Mantém outros arquivos intactos via FileReader.
 */
export const compressFileAttachment = (file: File): Promise<{ url: string; size: number }> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target?.result as string) || '';
        resolve({ url: result, size: file.size });
      };
      reader.onerror = () => resolve({ url: '', size: file.size });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          const approxSize = Math.round((compressedDataUrl.length * 3) / 4);
          resolve({ url: compressedDataUrl, size: approxSize });
        } else {
          resolve({ url: (e.target?.result as string) || '', size: file.size });
        }
      };
      img.onerror = () => resolve({ url: (e.target?.result as string) || '', size: file.size });
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve({ url: '', size: file.size });
    reader.readAsDataURL(file);
  });
};

export const MessageAttachmentsView: React.FC<MessageAttachmentsViewProps> = ({ attachments }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const isImage = (att: MessageAttachment) =>
    att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);

  const isVideo = (att: MessageAttachment) =>
    att.type?.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(att.name);

  const isAudio = (att: MessageAttachment) =>
    att.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(att.name);

  const isPdf = (att: MessageAttachment) =>
    att.type === 'application/pdf' || /\.pdf$/i.test(att.name);

  const isDoc = (att: MessageAttachment) =>
    /\.(docx?|odt|rtf|txt|md)$/i.test(att.name);

  return (
    <div className="mt-2.5 flex flex-wrap gap-2.5 max-w-3xl">
      {attachments.map(att => {
        // Image attachment
        if (isImage(att)) {
          return (
            <div
              key={att.id}
              className="relative group rounded-xl overflow-hidden border border-[#3e4047] bg-[#232428] max-w-sm shadow-md"
            >
              <img
                src={att.url}
                alt={att.name}
                onClick={() => setPreviewImage(att.url)}
                className="max-h-64 w-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
              />
              <div className="p-2 bg-[#2b2d31]/95 border-t border-[#3e4047] flex items-center justify-between gap-2 text-xs">
                <div className="truncate flex items-center gap-1.5 text-[#dbdee1]">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5865F2] flex-shrink-0" />
                  <span className="truncate max-w-[180px] font-medium" title={att.name}>
                    {att.name}
                  </span>
                  <span className="text-[#949ba4] text-[10px]">({formatFileSize(att.size)})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewImage(att.url)}
                    title="Ampliar Imagem"
                    className="p-1 hover:bg-[#35373c] text-[#949ba4] hover:text-white rounded"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={att.url}
                    download={att.name}
                    title="Baixar Foto"
                    className="p-1 hover:bg-[#35373c] text-[#949ba4] hover:text-white rounded"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        }

        // Video attachment
        if (isVideo(att)) {
          return (
            <div
              key={att.id}
              className="rounded-xl overflow-hidden border border-[#3e4047] bg-[#1e1f22] max-w-md shadow-md p-1 space-y-1.5"
            >
              <video
                src={att.url}
                controls
                className="w-full max-h-72 rounded-lg bg-black object-contain"
              />
              <div className="px-2 py-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#dbdee1] truncate">
                  <Film className="w-4 h-4 text-[#f0b232] flex-shrink-0" />
                  <span className="truncate max-w-[220px] font-medium">{att.name}</span>
                  <span className="text-[#949ba4] text-[10px]">({formatFileSize(att.size)})</span>
                </div>
                <a
                  href={att.url}
                  download={att.name}
                  title="Baixar Vídeo"
                  className="p-1 hover:bg-[#35373c] text-[#949ba4] hover:text-white rounded"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        }

        // Audio attachment
        if (isAudio(att)) {
          return (
            <div
              key={att.id}
              className="rounded-xl border border-[#3e4047] bg-[#2b2d31] p-3 w-full max-w-md shadow-md space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-lg bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
                    <Music className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-white truncate max-w-[240px]">{att.name}</span>
                </div>
                <span className="text-[#949ba4] text-[11px]">{formatFileSize(att.size)}</span>
              </div>
              <audio src={att.url} controls className="w-full h-9 rounded" />
            </div>
          );
        }

        // PDF, Word/Docs or General File attachment card
        const isPdfFile = isPdf(att);
        const isDocFile = isDoc(att);

        return (
          <div
            key={att.id}
            className="flex items-center justify-between gap-3 bg-[#2b2d31] hover:bg-[#35373c] border border-[#3e4047] rounded-xl p-3 min-w-[260px] max-w-md shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isPdfFile
                    ? 'bg-[#f23f43]/20 text-[#f23f43]'
                    : isDocFile
                    ? 'bg-[#5865F2]/20 text-[#5865F2]'
                    : 'bg-[#23a55a]/20 text-[#23a55a]'
                }`}
              >
                {isPdfFile ? (
                  <FileText className="w-5 h-5" />
                ) : isDocFile ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <File className="w-5 h-5" />
                )}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate group-hover:underline">
                  {att.name}
                </div>
                <div className="text-[11px] text-[#949ba4] flex items-center gap-1.5 mt-0.5">
                  <span className="uppercase font-bold text-[9px] px-1 py-0.2 rounded bg-[#1e1f22]">
                    {att.name.split('.').pop() || 'ARQUIVO'}
                  </span>
                  <span>{formatFileSize(att.size)}</span>
                </div>
              </div>
            </div>

            <a
              href={att.url}
              download={att.name}
              title={`Baixar ${att.name}`}
              className="p-2 bg-[#1e1f22] hover:bg-[#5865F2] text-[#dbdee1] hover:text-white rounded-lg transition-colors flex-shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        );
      })}

      {/* Fullscreen Image Preview Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
