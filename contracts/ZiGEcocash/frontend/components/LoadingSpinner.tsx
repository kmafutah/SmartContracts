import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'gold' | 'green' | 'black';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'white',
  text 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colorClasses = {
    white: 'border-white',
    gold: 'border-panAfrican-gold',
    green: 'border-panAfrican-green',
    black: 'border-black',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className="mt-2 text-sm text-gray-400">{text}</p>
      )}
    </div>
  );
};

export const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-panAfrican-black text-white flex items-center justify-center">
    <LoadingSpinner size="lg" color="gold" text="Loading ZiGVerse..." />
  </div>
);

export const CardLoader: React.FC = () => (
  <div className="bg-panAfrican-black rounded-xl p-6 flex items-center justify-center">
    <LoadingSpinner size="md" color="white" />
  </div>
); 