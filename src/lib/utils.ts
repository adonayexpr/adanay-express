import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Transforms a Google Drive file sharing URL into a direct image source URL.
 * @param url The Google Drive file sharing URL.
 * @returns A URL that can be used directly in an <img> src attribute.
 */
export const transformGoogleDriveUrl = (url: string): string => {
  // Return a placeholder if the URL is invalid or not a string
  if (!url || typeof url !== 'string') {
    return "https://placehold.co/600x400.png";
  }

  // If it's already a direct embed link, return it as is
  if (url.includes('drive.google.com/uc?export=view')) {
    return url;
  }
  
  // Regex to extract the file ID from the sharing link
  const regex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);

  // If a file ID is found, construct the direct link
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  
  // If no match is found, return the original URL (it might be a valid direct link already)
  return url;
};
