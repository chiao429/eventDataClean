import React, { useState, useRef } from 'react';
import { uploadWorkerAttendanceFile, downloadBlob } from '../api/uploadApi';
import './FileUpload.css';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const WorkerAttendance: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [customFilename, setCustomFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        setErrorMessage('請選擇 .xlsx 或 .xls 格式的檔案');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setProcessedBlob(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('請先選擇檔案');
      return;
    }

    try {
      setStatus('uploading');
      setErrorMessage('');
      setProgress(0);

      const blob = await uploadWorkerAttendanceFile(
        selectedFile,
        (progress) => setProgress(progress),
        customFilename.trim() || undefined
      );

      setStatus('success');
      setProcessedBlob(blob);
      setProgress(100);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '上傳失敗，請稍後再試');
      console.error('上傳同工出席名單錯誤:', error);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;

    let filename = customFilename.trim();
    if (!filename) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      filename = `同工出席名單_${year}${month}${day}.xlsx`;
    } else if (!filename.toLowerCase().endsWith('.xlsx')) {
      filename += '.xlsx';
    }

    downloadBlob(processedBlob, filename);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage('');
    setProcessedBlob(null);
    setCustomFilename('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <div className="upload-area">
        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={status === 'uploading'}
            id="worker-file-input"
            className="file-input"
          />
          <label htmlFor="worker-file-input" className="file-input-label">
            <span className="icon">📁</span>
            <span className="text">
              {selectedFile ? selectedFile.name : '選擇同工名單 Excel 檔案'}
            </span>
          </label>
        </div>

        {selectedFile && (
          <div className="file-info">
            <p><strong>檔案名稱:</strong> {selectedFile.name}</p>
            <p><strong>檔案大小:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {status === 'uploading' && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="progress-text">上傳與處理中... {progress}%</p>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="error-message">
            <span className="icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="success-message">
              <span className="icon">✅</span>
              <span>處理完成！請下載同工出席名單</span>
            </div>

            <div className="file-info">
              <label htmlFor="worker-filename-input" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                自訂檔名（可選）：
              </label>
              <input
                id="worker-filename-input"
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="留空則使用預設檔名：同工出席名單_yyyymmdd"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '1rem',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: '#ffffff',
                }}
              />
            </div>
          </>
        )}

        <div className="button-group">
          {status === 'success' ? (
            <>
              <button
                className="btn btn-primary"
                onClick={handleDownload}
              >
                <span className="icon">⬇️</span>
                下載同工出席名單
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                重新上傳
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || status === 'uploading'}
              >
                {status === 'uploading' ? '上傳中...' : '上傳並產生出席名單'}
              </button>
              {selectedFile && (
                <button
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={status === 'uploading'}
                >
                  清除
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerAttendance;
