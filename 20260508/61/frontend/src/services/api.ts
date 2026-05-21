import {
  GenerateRequest,
  GenerateResponse,
  FeedbackRequest,
  FeedbackResponse,
} from '@/types';

const API_BASE_URL = '/api';

export async function generateMusic(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/generate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function submitFeedback(
  feedback: FeedbackRequest
): Promise<FeedbackResponse> {
  const response = await fetch(`${API_BASE_URL}/feedback/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '提交反馈失败' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function readMidiFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('读取 MIDI 文件失败'));
    reader.readAsDataURL(file);
  });
}

export function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function downloadBase64File(
  base64: string,
  fileName: string,
  mimeType: string
): void {
  const url = base64ToBlobUrl(base64, mimeType);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadFromUrl(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function getDownloadUrl(
  fileType: 'midi' | 'mp3' | 'wav',
  taskId: string
): Promise<string> {
  return `${API_BASE_URL}/convert/download/${fileType}/${taskId}`;
}
