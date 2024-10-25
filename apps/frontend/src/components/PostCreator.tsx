import React, { useState } from 'react';
import MediaPopup from './MediaPopup'; // Import the MediaPopup component

const PostCreator: React.FC = () => {
  const [showMediaPopup, setShowMediaPopup] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const imageGallery = [
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image4.jpg',
    // Add more image URLs or file paths here
  ];

  // Callback to handle the images selected from the media popup
  const handleAddImages = (images: string[]) => {
    setSelectedImages((prevImages) => [...prevImages, ...images]); // Add the selected images to the existing list
    setShowMediaPopup(false); // Close the popup after adding
  };

  return (
    <div>
      <h1>Create a Post</h1>
      <button onClick={() => setShowMediaPopup(true)}>Add Images</button>

      {/* Display selected images */}
      <div className="selected-images">
        {selectedImages.map((image) => (
          <img
            key={image}
            src={image}
            alt="Selected"
            className="selected-image"
          />
        ))}
      </div>

      {/* Media popup */}
      {showMediaPopup && (
        <MediaPopup images={imageGallery} onAddImages={handleAddImages} />
      )}

      <style jsx>{`
        .selected-images {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }
        .selected-image {
          max-width: 100px;
          height: auto;
          border: 2px solid #ddd;
        }
      `}</style>
    </div>
  );
};

export default PostCreator;
