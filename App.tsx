
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { enhanceImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import type { Filter } from './types';
import { UploadIcon, WandIcon, SparklesIcon, SharpenIcon, VintageIcon, GrayscaleIcon, DownloadIcon, ResetIcon, RevertIcon } from './components/icons';

const FILTERS: Filter[] = [
  { id: 'enhance', name: 'Auto Enhance', prompt: 'Professionally enhance this image with balanced brightness, contrast, and color saturation. Make it look crisp and clear.', icon: WandIcon },
  { id: 'sharpen', name: 'Sharpen', prompt: 'Increase the sharpness and clarity of this image. Bring out the fine details without creating artifacts.', icon: SharpenIcon },
  { id: 'color_pop', name: 'Color Pop', prompt: 'Make the colors in this image more vibrant and saturated. Enhance the overall color pop, especially in the main subject.', icon: SparklesIcon },
  { id: 'vintage', name: 'Vintage', prompt: 'Apply a vintage film look to this image. Add a slight grain, desaturate the colors a bit, and give it a warm, nostalgic feel.', icon: VintageIcon },
  { id: 'grayscale', name: 'Grayscale', prompt: 'Convert this image to a high-contrast black and white.', icon: GrayscaleIcon },
];

// --- Helper Components (defined outside App to prevent re-renders) ---

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <label
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center w-full h-96 border-2 border-dashed rounded-lg cursor-pointer bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700 transition-colors"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
        </div>
        <input ref={fileInputRef} id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" disabled={isLoading} />
      </label>
    </div>
  );
};

const ProgressBar: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
    const [progress, setProgress] = useState(0);
  
    useEffect(() => {
      if (isLoading) {
        setProgress(0);
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 95) {
              clearInterval(interval);
              return 95;
            }
            const diff = (100 - prev) * 0.1;
            return prev + diff;
          });
        }, 200);
        return () => clearInterval(interval);
      } else {
        setProgress(100);
      }
    }, [isLoading]);
    
    if (!isLoading) return null;
  
    return (
      <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
              <SparklesIcon className="w-6 h-6 text-blue-400 animate-pulse"/>
              <p className="text-lg font-semibold text-gray-200">Enhancing Image...</p>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-teal-400 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">AI is working its magic. This may take a moment.</p>
        </div>
      </div>
    );
};

interface ImageViewerProps {
    originalImage: string;
    enhancedImage: string | null;
    isLoading: boolean;
}
  
const ImageViewer: React.FC<ImageViewerProps> = ({ originalImage, enhancedImage, isLoading }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col items-center">
                <h2 className="text-lg font-semibold text-gray-300 mb-3">Before</h2>
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-800 shadow-lg">
                    <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
                </div>
            </div>
            <div className="flex flex-col items-center">
                <h2 className="text-lg font-semibold text-gray-300 mb-3">After</h2>
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-800 shadow-lg relative">
                    <ProgressBar isLoading={isLoading} />
                    {enhancedImage && (
                        <img src={enhancedImage} alt="Enhanced" className="w-full h-full object-contain" />
                    )}
                    {!enhancedImage && !isLoading && (
                         <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-gray-500">Your enhanced image will appear here</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setOriginalImage(null);
    setEnhancedImage(null);
    try {
      const base64 = await fileToBase64(file);
      setOriginalImage(base64);
    } catch (e) {
      setError("Failed to load image. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runEnhancement = useCallback(async (prompt: string) => {
    const sourceImage = enhancedImage || originalImage;
    if (!sourceImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await enhanceImage(sourceImage, prompt);
      setEnhancedImage(result);
    } catch (e) {
      const err = e as Error;
      setError(`Enhancement failed: ${err.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, enhancedImage]);

  const handleFilterClick = (filter: Filter) => {
    setActiveFilter(filter.id);
    setCustomPrompt('');
    runEnhancement(filter.prompt);
  };
  
  const handleCustomEnhance = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      setActiveFilter(null);
      runEnhancement(customPrompt);
    }
  }
  
  const handleDownload = () => {
    if (!enhancedImage) return;
    const link = document.createElement('a');
    link.href = enhancedImage;
    link.download = 'enhanced-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleReset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    setError(null);
    setCustomPrompt('');
    setActiveFilter(null);
  }

  const handleRevert = () => {
    setEnhancedImage(null);
    setError(null);
    setActiveFilter(null);
    setCustomPrompt('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <header className="w-full max-w-7xl mx-auto text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
                <WandIcon className="w-8 h-8 text-blue-400"/>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
                    Gemini Image Enhancer
                </h1>
            </div>
            <p className="text-lg text-gray-400">Upload an image and bring it to life with AI-powered enhancements.</p>
        </header>

        <main className="w-full flex-grow flex flex-col items-center justify-center">
            {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6 w-full max-w-4xl text-center">{error}</div>}
            
            {!originalImage && <ImageUploader onImageUpload={handleImageUpload} isLoading={isLoading} />}

            {originalImage && (
                <div className="w-full flex flex-col items-center gap-8">
                    <ImageViewer originalImage={originalImage} enhancedImage={enhancedImage} isLoading={isLoading}/>
                    
                    {/* Control Panel */}
                    <div className="w-full max-w-7xl p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Predefined Filters */}
                            <div className="flex-1">
                                <h3 className="text-md font-semibold text-gray-300 mb-3">One-Click Filters</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {FILTERS.map((filter) => (
                                        <button 
                                            key={filter.id}
                                            onClick={() => handleFilterClick(filter)}
                                            disabled={isLoading}
                                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${activeFilter === filter.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <filter.icon className="w-6 h-6" />
                                            <span>{filter.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full md:w-px bg-gray-700"></div>

                            {/* Custom Prompt */}
                            <div className="flex-1">
                                <h3 className="text-md font-semibold text-gray-300 mb-3">Custom Enhancement</h3>
                                <form onSubmit={handleCustomEnhance} className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="text"
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder='e.g., "Add a golden hour glow"'
                                        disabled={isLoading}
                                        className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                    />
                                    <button type="submit" disabled={isLoading || !customPrompt.trim()} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        <WandIcon className="w-5 h-5" />
                                        Enhance
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-4 mt-2">
                         <button onClick={handleReset} disabled={isLoading} className="flex items-center gap-2 px-5 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors disabled:opacity-50">
                            <ResetIcon className="w-5 h-5"/>
                            Start Over
                        </button>
                        <button onClick={handleRevert} disabled={!enhancedImage || isLoading} className="flex items-center gap-2 px-5 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <RevertIcon className="w-5 h-5"/>
                            Revert All
                        </button>
                        <button onClick={handleDownload} disabled={!enhancedImage || isLoading} className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <DownloadIcon className="w-5 h-5"/>
                            Download
                        </button>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}
