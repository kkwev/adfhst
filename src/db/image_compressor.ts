/**
 * Compresses an image file (or base64 string) using HTML5 Canvas to fit within maxDimensions and converts to a lightweight JPEG base64 string.
 */
export function compressImage(
  fileOrBase64: File | string,
  maxSize: number = 500,
  quality: number = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    const processSrc = (src: string) => {
      // If it's not a data URL or already tiny, just resolve it directly
      if (!src.startsWith("data:image/")) {
        resolve(src);
        return;
      }
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(src); // Fallback to raw if canvas context is unavailable
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } catch (e) {
          console.warn("Image compression failed, using original source.", e);
          resolve(src); // Fallback on exception
        }
      };
      img.onerror = () => {
        resolve(src); // Fallback if image fails to load
      };
      img.src = src;
    };

    if (fileOrBase64 instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          processSrc(reader.result);
        } else {
          resolve("");
        }
      };
      reader.onerror = () => {
        resolve("");
      };
      reader.readAsDataURL(fileOrBase64);
    } else {
      processSrc(fileOrBase64);
    }
  });
}

/**
 * Converts a data URL/base64 string to a Blob object.
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Compresses a File, uploads it to a free, keyless cloud image hosting service, 
 * and returns the public direct HTTPS URL. Falls back to a compressed base64 string on failure.
 */
export async function uploadImageToCloud(file: File): Promise<string> {
  try {
    // 1. First compress the image to 600px size with 0.6 quality to make it ultra-lightweight (around 20-50KB)
    const compressedBase64 = await compressImage(file, 600, 0.6);
    if (!compressedBase64 || !compressedBase64.startsWith("data:image/")) {
      return compressedBase64 || "";
    }
    
    // 2. Convert to a lightweight Blob for faster upload
    const blob = base64ToBlob(compressedBase64);
    const filename = file.name || 'image.jpg';
    
    // 3. Try to upload to pixeldrain.com (fast, stable, holds images up to 100 days)
    try {
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('anonymous', 'true');
      
      const response = await fetch('https://pixeldrain.com/api/file', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.id) {
          return `https://pixeldrain.com/api/file/${data.id}`;
        }
      }
    } catch (e) {
      console.warn("Pixeldrain upload failed, trying tmpfiles.org...", e);
    }
    
    // 4. Try to upload to tmpfiles.org as a fallback (public, no key)
    try {
      const formData = new FormData();
      formData.append('file', blob, filename);
      
      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data?.url) {
          return data.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
        }
      }
    } catch (e) {
      console.warn("Tmpfiles upload failed, returning base64...", e);
    }
    
    // 5. Fallback to base64 if both uploads fail
    return compressedBase64;
  } catch (error) {
    console.error("Upload to cloud failed:", error);
    // If anything fails, try to return a standard compressed base64 representation
    try {
      return await compressImage(file, 500, 0.5);
    } catch (fallbackError) {
      return "";
    }
  }
}
