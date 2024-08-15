import React from 'react';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  type?: 'circle' | 'rectangle';
};

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '100%',
  borderRadius = '4px',
  className = '',
  type = 'rectangle',
}) => {
  const styles = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: type === 'circle' ? '50%' : borderRadius,
  };

  return (
    <div
      style={styles}
      className={`bg-blue-200 animate-pulse ${className}`}
    ></div>
  );
};

export default Skeleton;
