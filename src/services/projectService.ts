
'use server';

import { firestoreDb, adminStorage } from '@/lib/firebase-admin';
import { generateProjectMetadata } from '@/ai/flows/generate-project-metadata-flow';
import { FieldValue } from 'firebase-admin/firestore';
import type { Project, ProjectContent } from '@/types/project';
import { v4 as uuidv4 } from 'uuid';

interface SaveProjectInput {
  userId: string;
  type: Project['type'];
  content: ProjectContent;
}

/**
 * Uploads an array of image data URIs to Firebase Cloud Storage.
 * @param userId The ID of the user uploading the images.
 * @param dataUris An array of strings, where each string is a data URI.
 * @returns A promise that resolves to an array of public URLs for the uploaded images.
 */
async function uploadImagesToStorage(userId: string, dataUris: string[]): Promise<string[]> {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    console.error('Firebase Storage bucket name is not configured in environment variables (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).');
    throw new Error('Firebase Storage bucket name is not configured on the server.');
  }
  const bucket = adminStorage.bucket(bucketName);

  const uploadPromises = dataUris.map(async (dataUri) => {
    // Extract mime type and base64 data from the data URI
    const match = dataUri.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
      console.error('Invalid data URI format provided for image upload.');
      // Fail gracefully for the user without exposing technical details.
      throw new Error('An invalid image format was provided and could not be saved.');
    }
    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine file extension and create a unique path
    const fileExtension = mimeType.split('/')[1] || 'png';
    const fileId = uuidv4();
    const filePath = `user-uploads/${userId}/images/${fileId}.${fileExtension}`;
    const file = bucket.file(filePath);

    // Save the file buffer to Cloud Storage
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make the file publicly accessible to get a URL
    await file.makePublic();

    // Return the public URL
    return file.publicUrl();
  });

  return Promise.all(uploadPromises);
}


// --- Service Functions ---

/**
 * Generates metadata and saves a new project to Firestore.
 * If the project is image-based, it uploads images to storage first.
 * This is called by client components when the user clicks "Save Project".
 */
export async function saveProject({ userId, type, content }: SaveProjectInput): Promise<string> {
  if (!userId || !type || !content) {
    throw new Error('User ID, type, and content are required to save a project.');
  }

  let finalContent: ProjectContent = content;
  let contentForMetadata: string;

  // If the project is an image generation, upload images to storage first
  if (type === 'image-generator' && Array.isArray(content) && content.every(item => typeof item === 'string')) {
    const publicUrls = await uploadImagesToStorage(userId, content as string[]);
    finalContent = publicUrls; // The content to be saved is now the array of public URLs
    contentForMetadata = `An album of ${publicUrls.length} generated images.`;
  } else if (typeof content === 'string') {
    contentForMetadata = content;
  } else if (Array.isArray(content)) {
    // This case would be for other potential array content types in the future.
    contentForMetadata = `An album of ${content.length} items.`;
  } else if (typeof content === 'object' && content && 'files' in content) {
    const fileList = (content.files as { filePath: string }[]).map(f => f.filePath).join(', ');
    contentForMetadata = `An application with files: ${fileList}`;
  } else {
    contentForMetadata = 'A saved project with unspecified content.';
  }

  const metadata = await generateProjectMetadata({
    type: type,
    content: contentForMetadata,
  });
  
  const projectRef = firestoreDb.collection('projects').doc();

  const newProjectData = {
    userId,
    name: metadata.name,
    summary: metadata.summary,
    type,
    content: finalContent, // Use the potentially modified content
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await projectRef.set(newProjectData);

  console.log(`Project ${projectRef.id} of type ${type} saved for user ${userId}.`);
  return projectRef.id;
}

/**
 * Fetches all projects for a given user, ordered by most recently updated.
 * Used by the "My Projects" page.
 */
export async function getProjectsForUser(userId: string): Promise<Project[]> {
  const snapshot = await firestoreDb.collection('projects')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Convert Timestamps to ISO strings for client-side date formatting
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    } as Project;
  });
}

/**
 * Fetches a single project by its ID for the project viewer page.
 * Note: This does not check for user ownership. Page-level security should handle that.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
    const docRef = firestoreDb.collection('projects').doc(projectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return null;
    }

    const data = docSnap.data()!;
    return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
    } as Project;
}
