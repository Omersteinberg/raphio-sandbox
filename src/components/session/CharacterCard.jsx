import { useState, useRef } from 'react';

export default function CharacterCard({ character, onChange, disabled }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Please upload a JPEG or PNG image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    onChange({ ...character, referenceImage: previewUrl, referenceFile: file });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragActive(true);
  };

  const removeImage = () => {
    if (character.referenceImage) URL.revokeObjectURL(character.referenceImage);
    onChange({ ...character, referenceImage: null, referenceFile: null });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Character Name</label>
          <input
            type="text"
            value={character.name}
            onChange={(e) => onChange({ ...character, name: e.target.value })}
            placeholder="e.g., Luna"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            disabled={disabled}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={character.description}
            onChange={(e) => onChange({ ...character, description: e.target.value })}
            placeholder="Describe appearance, personality, clothing... e.g., 'Young woman with long silver hair, blue eyes, wearing a black turtleneck and silver necklace. Adventurous and curious.'"
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
            disabled={disabled}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference Image</label>
          {character.referenceImage ? (
            <div className="relative">
              <img
                src={character.referenceImage}
                alt="Character reference"
                className="w-full max-h-64 object-contain rounded-lg"
              />
              <button
                onClick={removeImage}
                disabled={disabled}
                className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragActive(false)}
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <p className="text-gray-500 text-sm">
                Drag & drop an image or click to upload
              </p>
              <p className="text-gray-400 text-xs mt-1">JPEG or PNG, min 512x512, max 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
