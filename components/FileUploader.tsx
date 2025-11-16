
import React, { useState, useCallback, useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept: string;
  label: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, accept, label }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith(accept.replace('/*', ''))) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
      setFileName(file.name);
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [accept, onFileSelect]);

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        className="relative cursor-pointer bg-gray-700 hover:bg-gray-600 rounded-lg focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-cyan-500 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-1 text-center p-8 border-2 border-dashed border-gray-500 rounded-lg">
          {preview ? (
            accept.startsWith('image/') ? (
              <img src={preview} alt="Preview" className="mx-auto h-48 w-auto object-contain rounded-md" />
            ) : (
              <video src={preview} controls className="mx-auto h-48 w-auto rounded-md" />
            )
          ) : (
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <div className="flex text-sm text-gray-400 justify-center">
            <span>{fileName || label}</span>
            <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" accept={accept} onChange={handleFileChange} />
          </div>
          <p className="text-xs text-gray-500">Drag and drop or click to upload</p>
        </div>
      </label>
    </div>
  );
};

export default FileUploader;
