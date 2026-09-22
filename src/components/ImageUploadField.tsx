import React, { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  helperText?: string;
  required?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  helperText = "PNG, JPG or WebP up to 5 MB",
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-neutral-600 font-semibold mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50"
      >
        {value ? (
          <span className="flex items-center gap-3">
            <img
              src={value}
              alt="Selected preview"
              className="h-16 w-24 rounded object-cover border border-neutral-200"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-neutral-800">
                Replace image
              </span>
              <span className="block text-[11px] text-neutral-500">
                Click to choose another file
              </span>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs text-neutral-600">
            <ImagePlus className="h-5 w-5 text-amber-600" />
            <span>
              <strong className="text-neutral-800">Upload image</strong>
              <span className="block text-[11px] text-neutral-500">
                {helperText}
              </span>
            </span>
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700"
        >
          <X className="h-3 w-3" /> Remove image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        required={required && !value}
        onChange={(event) => handleFile(event.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
};
