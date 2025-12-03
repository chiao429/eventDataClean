import axios from 'axios';

// API 基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface FilterOptions {
  hideCancelled?: boolean;
  hideNoNumber?: boolean;
  sortBy?: 'registrationNumber' | 'originalIndex';
}

/**
 * 上傳 Excel 檔案並取得處理後的檔案
 * @param file - 要上傳的檔案
 * @param onProgress - 上傳進度回調函數
 * @param filterOptions - 過濾選項
 * @returns Promise<Blob> - 處理後的檔案 Blob
 */
export async function uploadExcelFile(
  file: File,
  onProgress?: (progress: number) => void,
  filterOptions?: FilterOptions
): Promise<Blob> {
  try {
    // 建立 FormData 物件
    const formData = new FormData();
    formData.append('file', file);
    
    // 加入過濾選項和排序選項
    if (filterOptions) {
      formData.append('hideCancelled', String(filterOptions.hideCancelled || false));
      formData.append('hideNoNumber', String(filterOptions.hideNoNumber || false));
      formData.append('sortBy', filterOptions.sortBy || 'registrationNumber');
    }

    // 發送 POST 請求
    const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob', // 重要：告訴 axios 回應是二進位檔案
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    // 回傳檔案 Blob
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 處理 Axios 錯誤
      if (error.response) {
        // 伺服器回應了錯誤狀態碼
        // 如果回應是 Blob，需要先轉換成文字
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(`上傳失敗: ${error.response.status} - ${errorData.message || errorData.error || error.response.statusText}`);
          } catch (parseError) {
            // 如果無法解析 JSON，使用預設訊息
            throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
          }
        } else {
          throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
        }
      } else if (error.request) {
        // 請求已發送但沒有收到回應
        throw new Error('無法連接到伺服器，請確認後端服務是否啟動');
      } else {
        // 其他錯誤
        throw new Error(`上傳失敗: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * 上傳同工名單並取得同工出席名單 Excel 檔案
 * @param file - 要上傳的同工名單檔案
 * @param onProgress - 上傳進度回調函數
 * @param outputFileName - 自訂輸出檔名（可選），若未提供則由後端使用預設檔名
 */
export async function uploadWorkerAttendanceFile(
  file: File,
  onProgress?: (progress: number) => void,
  outputFileName?: string
): Promise<Blob> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    if (outputFileName && outputFileName.trim()) {
      formData.append('outputFileName', outputFileName.trim());
    }

    const response = await axios.post(`${API_BASE_URL}/api/team/worker-attendance`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(`上傳失敗: ${error.response.status} - ${errorData.message || errorData.error || error.response.statusText}`);
          } catch (parseError) {
            throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
          }
        } else {
          throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
        }
      } else if (error.request) {
        throw new Error('無法連接到伺服器，請確認後端服務是否啟動');
      } else {
        throw new Error(`上傳失敗: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * 上傳分小隊 Excel 檔案並取得處理後的檔案
 * @param file - 要上傳的檔案
 * @param onProgress - 上傳進度回調函數
 * @param filterOptions - 過濾選項
 * @returns Promise<Blob> - 處理後的檔案 Blob
 */
export async function uploadTeamFile(
  file: File,
  onProgress?: (progress: number) => void,
  filterOptions?: FilterOptions
): Promise<Blob> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (filterOptions) {
      formData.append('hideCancelled', String(filterOptions.hideCancelled || false));
      formData.append('hideNoNumber', String(filterOptions.hideNoNumber || false));
      formData.append('sortBy', filterOptions.sortBy || 'registrationNumber');
    }

    const response = await axios.post(`${API_BASE_URL}/api/team/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(`上傳失敗: ${error.response.status} - ${errorData.message || errorData.error || error.response.statusText}`);
          } catch (parseError) {
            throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
          }
        } else {
          throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
        }
      } else if (error.request) {
        throw new Error('無法連接到伺服器，請確認後端服務是否啟動');
      } else {
        throw new Error(`上傳失敗: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * 上傳產生小隊名單 Excel 檔案並取得處理後的檔案
 * @param file - 要上傳的報名資料檔案
 * @param onProgress - 上傳進度回調函數
 * @param filterOptions - 過濾選項
 * @param teamInfo - 小隊資訊(活動名稱、小隊長資料)
 * @param consentFile - 授權/同意書 Excel 檔（可選）
 * @returns Promise<Blob> - 處理後的檔案 Blob
 */
export async function uploadTeamListFile(
  file: File,
  onProgress?: (progress: number) => void,
  filterOptions?: FilterOptions,
  teamInfo?: any,
  consentFile?: File | null
): Promise<Blob> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (filterOptions) {
      formData.append('hideCancelled', String(filterOptions.hideCancelled || false));
      formData.append('hideNoNumber', String(filterOptions.hideNoNumber || false));
      formData.append('sortBy', filterOptions.sortBy || 'registrationNumber');
    }
    
    if (teamInfo) {
      formData.append('teamInfo', JSON.stringify(teamInfo));
    }

    if (consentFile) {
      formData.append('consentFile', consentFile);
    }

    const response = await axios.post(`${API_BASE_URL}/api/team/team-list`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(`上傳失敗: ${error.response.status} - ${errorData.message || errorData.error || error.response.statusText}`);
          } catch (parseError) {
            throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
          }
        } else {
          throw new Error(`上傳失敗: ${error.response.status} - ${error.response.statusText}`);
        }
      } else if (error.request) {
        throw new Error('無法連接到伺服器，請確認後端服務是否啟動');
      } else {
        throw new Error(`上傳失敗: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * 下載 Blob 檔案
 * @param blob - 要下載的 Blob
 * @param filename - 檔案名稱
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // 建立一個臨時的 URL
  const url = window.URL.createObjectURL(blob);
  
  // 建立一個隱藏的 <a> 元素
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // 觸發下載
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
