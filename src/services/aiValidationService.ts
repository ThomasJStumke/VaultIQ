import { AIValidationResult, Module } from '../types';

export const validateDocumentWithAI = async (
  file: File,
  moduleContext: Module,
  evidenceType: string
): Promise<AIValidationResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        
        const response = await fetch('/api/validate-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            fileType: file.type,
            moduleContext: {
              code: moduleContext.code,
              name: moduleContext.name
            },
            evidenceType
          })
        });

        if (!response.ok) {
          throw new Error('AI validation request failed');
        }

        const result = await response.json();
        resolve(result);
      } catch (error) {
        console.error('[VaultIQ AI] Validation Error:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
