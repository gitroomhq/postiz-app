import React, { useState } from 'react';

interface MediaPopupProps {
  images: string[]; // List of image URLs or file references
  onAddImages: (selectedImages: string[]) => void; // Callback for selected images
}

const MediaPopup: React.FC<MediaPopupProps> = ({ images, onAddImages }) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Toggle the selection of an image
  const toggleImageSelection = (image: string) => {
    if (selectedImages.includes(image)) {
      setSelectedImages(selectedImages.filter((img) => img !== image)); // Remove if already selected
    } else {
      setSelectedImages([...selectedImages, image]); // Add to selected images
    }
  };

  // Handle the add button click
  const handleAddClick = () => {
    onAddImages(selectedImages); // Pass selected images back to the parent
    setSelectedImages([]); // Clear selection after adding
  };

  return (
    <div className="media-popup">
      <h3>Select Images</h3>
      <div className="image-grid">
        {images.map((image) => (
          <div
            key={image}
            className={`image-item ${
              selectedImages.includes(image) ? 'selected' : ''
            }`}
            onClick={() => toggleImageSelection(image)}
          >
            <img src={image} alt="media" />
          </div>
        ))}
      </div>
      <button onClick={handleAddClick} disabled={selectedImages.length === 0}>
        Add {selectedImages.length > 0 ? `(${selectedImages.length})` : ''}{' '}
        Images
      </button>

      <style jsx>{`
        .media-popup {
          padding: 20px;
        }
        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
        }
        .image-item {
          cursor: pointer;
          border: 2px solid transparent;
          transition: border-color 0.3s ease;
        }
        .image-item img {
          max-width: 100px;
          height: auto;
        }
        .image-item.selected {
          border-color: blue; /* Border for selected images */
        }
        button {
          margin-top: 20px;
          padding: 10px;
          background-color: #007bff;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 5px;
        }
        button:disabled {
          background-color: grey;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MediaPopup;
