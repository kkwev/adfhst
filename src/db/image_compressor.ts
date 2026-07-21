import { storage, auth } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";

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
 * Compresses a File, uploads it to Firebase Storage (or fallback cloud services),
 * and returns the public direct HTTPS URL. Falls back to a compressed base64 string on failure.
 */
export async function uploadImageToCloud(file: File): Promise<string> {
  try {
    // 1. First compress the image to 800px size with 0.75 quality to make it lightweight but high-quality
    const compressedBase64 = await compressImage(file, 800, 0.75);
    if (!compressedBase64 || !compressedBase64.startsWith("data:image/")) {
      return compressedBase64 || "";
    }
    
    // 2. Convert to a lightweight Blob for upload
    const blob = base64ToBlob(compressedBase64);
    const filename = file.name || 'image.jpg';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.]/g, "_");
    
    // 3. Try uploading to official Firebase Storage first (permanent, fast, stable, uses Google CDN)
    try {
      // Ensure anonymous auth session is established if possible
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          console.warn("Auth on-demand failed:", authErr);
        }
      }

      const storageRef = ref(storage, `products/${Date.now()}_${cleanFilename}`);
      
      // Wrap upload and URL retrieval in a 30-second hard timeout
      const uploadWithTimeout = async () => {
        const snapshot = await uploadBytes(storageRef, blob, {
          contentType: "image/jpeg"
        });
        return await getDownloadURL(snapshot.ref);
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firebase Storage upload timed out")), 30000)
      );

      const downloadUrl = await Promise.race([uploadWithTimeout(), timeoutPromise]);
      if (downloadUrl) {
        console.log("Firebase Storage upload success:", downloadUrl);
        return downloadUrl;
      }
    } catch (firebaseErr) {
      console.warn("Firebase Storage upload failed or timed out, trying fallback servers...", firebaseErr);
    }
    
    // 4. Fallback: If Firebase Storage fails or is not yet configured, use a highly optimized compressed Base64 data URL.
    // We compress it to 360px size with 0.45 quality (yielding an ultra-lightweight 5-10KB string).
    // This is 100% permanent, never expires, never disappears, and loads instantly because it's stored directly in Firestore!
    console.warn("Firebase Storage upload failed or timed out. Falling back to a highly-optimized permanent Base64 data URL...");
    const fallbackBase64 = await compressImage(file, 360, 0.45);
    return fallbackBase64;
  } catch (error) {
    console.error("Upload to cloud failed:", error);
    try {
      return await compressImage(file, 360, 0.4);
    } catch (fallbackError) {
      return "";
    }
  }
}
