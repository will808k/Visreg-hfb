import imageCompression from "browser-image-compression";

/**
 * Compresses and optimizes an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns A promise that resolves to a base64 data URL of the compressed image
 */
export async function compressImage(
  file: File,
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    quality?: number;
  }
): Promise<string> {
  try {
    const defaultOptions = {
      maxSizeMB: 0.5, // Maximum file size in MB (500KB)
      maxWidthOrHeight: 1920, // Maximum width or height in pixels
      useWebWorker: true, // Use web worker for better performance
      quality: 0.8, // Quality of the compressed image (0-1)
      fileType: "image/jpeg", // Convert to JPEG for better compression
    };

    const compressionOptions = {
      ...defaultOptions,
      ...options,
    };

    // Compress the image
    const compressedFile = await imageCompression(file, compressionOptions);

    // Convert to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    // If compression fails, return the original file as base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Optimizes an image for visitor photos (profile pictures)
 * Uses higher compression since these are displayed small
 */
export async function compressVisitorPhoto(file: File): Promise<string> {
  return compressImage(file, {
    maxSizeMB: 0.3, // 300KB max
    maxWidthOrHeight: 800, // Visitor photos don't need to be too large
    quality: 0.75,
  });
}

/**
 * Optimizes an image for ID photos
 * Uses slightly less compression to preserve details
 */
export async function compressIdPhoto(file: File): Promise<string> {
  return compressImage(file, {
    maxSizeMB: 0.5, // 500KB max
    maxWidthOrHeight: 1920, // ID photos may need more detail
    quality: 0.85,
  });
}

/**
 * Gets the size of a base64 image in KB
 */
export function getBase64Size(base64: string): number {
  const base64String = base64.split(",")[1] || base64;
  const sizeInBytes = (base64String.length * 3) / 4;
  return sizeInBytes / 1024; // Convert to KB
}
