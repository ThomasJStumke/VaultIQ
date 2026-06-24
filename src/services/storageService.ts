import { DocCategory, FileMetadata, Module } from '../types';

/**
 * VaultIQ Storage Service
 * Handles automatic path generation and versioning logic.
 */

export interface PathParams {
  faculty: string;
  department: string;
  programme: string;
  moduleCode: string;
  year: number;
  semester: 1 | 2;
  category: DocCategory;
}

export const generateVaultPath = (params: PathParams): string => {
  const { faculty, department, programme, moduleCode, year, semester, category } = params;
  return `${faculty}/${department}/${programme}/${moduleCode}/${year}/S${semester}/${category}`;
};

export const generateFileName = (params: PathParams, version: number, originalName: string): string => {
  const { moduleCode, year, semester, category } = params;
  const ext = originalName.split('.').pop();
  const timestamp = new Date().getTime();
  return `${moduleCode}_${year}_S${semester}_${category}_v${version}_${timestamp}.${ext}`;
};

export const getNextVersion = async (path: string, category: DocCategory): Promise<number> => {
  // logic to query database for existing versions
  // for now, simulating a return based on a hypothetical count
  return 1; 
};

export const uploadToVault = async (
  file: File, 
  params: PathParams,
  uploadedBy: string
): Promise<Partial<FileMetadata>> => {
  const version = await getNextVersion(generateVaultPath(params), params.category);
  const path = generateVaultPath(params);
  const fileName = generateFileName(params, version, file.name);
  const fullPath = `${path}/${fileName}`;

  console.log(`[VaultIQ] Provisioning Secure Storage Path: ${fullPath}`);

  // Simulate Firebase Storage Upload
  // const storageRef = ref(storage, fullPath);
  // await uploadBytes(storageRef, file);
  // const downloadUrl = await getDownloadURL(storageRef);

  return {
    moduleId: params.moduleCode,
    category: params.category,
    version,
    fileName,
    fileUrl: `https://vault.university.edu/${fullPath}`, // Placeholder
    uploadedBy,
    createdAt: new Date().toISOString(),
    ...params,
    size: file.size,
  };
};

export const getRetentionStatus = (createdAt: string): 'ACTIVE' | 'ARCHIVED' | 'EXPIRED' => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffYears = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  if (diffYears >= 3) return 'EXPIRED';
  if (diffYears >= 1) return 'ARCHIVED';
  return 'ACTIVE';
};
