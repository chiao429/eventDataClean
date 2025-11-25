import React, { useState, useRef, useEffect } from 'react';
import { uploadTeamFile, downloadBlob } from '../api/uploadApi';
import './FileUpload.css';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const TeamDivider: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 過濾選項
  const [hideCancelled, setHideCancelled] = useState<boolean>(true);
  const [hideNoNumber, setHideNoNumber] = useState<boolean>(false);
  
  // 排序選項
  const [sortBy, setSortBy] = useState<'registrationNumber' | 'originalIndex'>('registrationNumber');
  
  // 檔名輸入
  const [customFilename, setCustomFilename] = useState<string>('');

  /**
   * 監聽排序方式變更，自動重新處理
   */
  useEffect(() => {
    if (selectedFile && status === 'success' && processedBlob) {
      handleUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  /**
   * 處理檔案選擇
   */
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

  /**
   * 處理檔案上傳
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('請先選擇檔案');
      return;
    }

    try {
      setStatus('uploading');
      setErrorMessage('');
      setProgress(0);

      const blob = await uploadTeamFile(selectedFile, (progress) => {
        setProgress(progress);
      }, {
        hideCancelled,
        hideNoNumber,
        sortBy
      });

      setStatus('success');
      setProcessedBlob(blob);
      setProgress(100);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '上傳失敗，請稍後再試');
      console.error('上傳錯誤:', error);
    }
  };

  /**
   * 處理下載
   */
  const handleDownload = () => {
    if (processedBlob) {
      let filename;
      if (customFilename.trim()) {
        // 使用自訂檔名
        filename = customFilename.trim();
        // 如果沒有 .xlsx 副檔名，自動加上
        if (!filename.toLowerCase().endsWith('.xlsx')) {
          filename += '.xlsx';
        }
      } else {
        // 使用預設檔名
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        filename = `小隊分隊_${year}${month}${day}.xlsx`;
      }
      downloadBlob(processedBlob, filename);
    }
  };

  /**
   * 重置狀態
   */
  const handleReset = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage('');
    setProcessedBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <div className="upload-area">
        {/* 檔案選擇 */}
        <div className="file-upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={status === 'uploading' || status === 'processing'}
            id="team-file-input"
            className="file-input"
          />
          <label htmlFor="team-file-input" className="file-input-label">
            <span className="icon">📁</span>
            <span className="text">
              {selectedFile ? selectedFile.name : '選擇 Excel 檔案'}
            </span>
          </label>
        </div>

        {/* 檔案資訊 */}
        {selectedFile && (
          <div className="file-info">
            <p><strong>檔案名稱:</strong> {selectedFile.name}</p>
            <p><strong>檔案大小:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {/* 排序選項 */}
        <div className="sort-options">
          <div className="sort-title">排序方式：</div>
          <label className="radio-label">
            <input
              type="radio"
              name="sortBy"
              value="registrationNumber"
              checked={sortBy === 'registrationNumber'}
              onChange={(e) => setSortBy(e.target.value as 'registrationNumber' | 'originalIndex')}
              disabled={status === 'uploading' || status === 'processing'}
            />
            <span>依報名序號排序</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="sortBy"
              value="originalIndex"
              checked={sortBy === 'originalIndex'}
              onChange={(e) => setSortBy(e.target.value as 'registrationNumber' | 'originalIndex')}
              disabled={status === 'uploading' || status === 'processing'}
            />
            <span>依原始項次排序</span>
          </label>
        </div>

        {/* 過濾選項 */}
        <div className="filter-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hideCancelled}
              onChange={(e) => setHideCancelled(e.target.checked)}
              disabled={status === 'uploading' || status === 'processing'}
            />
            <span>不顯示取消名單</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hideNoNumber}
              onChange={(e) => setHideNoNumber(e.target.checked)}
              disabled={status === 'uploading' || status === 'processing'}
            />
            <span>不顯示無序號名單</span>
          </label>
        </div>

        {/* 處理提示 */}
        <div className="info-message">
          <span className="icon">ℹ️</span>
          <span>學齡前（大班、中班、小班、未就學）將統一分組</span>
        </div>

        {/* 進度條 */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="progress-text">
              {status === 'uploading' ? `上傳中... ${progress}%` : '處理中...'}
            </p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {status === 'error' && errorMessage && (
          <div className="error-message">
            <span className="icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 成功訊息 */}
        {status === 'success' && (
          <>
            <div className="success-message">
              <span className="icon">✅</span>
              <span>處理完成！請下載整理後的檔案</span>
            </div>
            
            {/* 檔名輸入欄位 */}
            <div className="file-info">
              <label htmlFor="filename-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                自訂檔名（可選）：
              </label>
              <input
                id="filename-input"
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="留空則使用預設檔名：小隊分隊_yyyymmdd"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '1rem',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: '#ffffff'
                }}
              />
            </div>
          </>
        )}

        {/* 按鈕區 */}
        <div className="button-group">
          {status === 'success' ? (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleDownload}
              >
                <span className="icon">⬇️</span>
                下載整理後的 Excel
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
                disabled={!selectedFile || status === 'uploading' || status === 'processing'}
              >
                {status === 'uploading' ? '上傳中...' : '上傳並處理'}
              </button>
              {selectedFile && (
                <button 
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={status === 'uploading' || status === 'processing'}
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

export default TeamDivider;
