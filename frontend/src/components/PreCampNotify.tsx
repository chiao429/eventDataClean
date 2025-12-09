import React, { useState, useRef } from 'react';
import { uploadPreCampWriteback, downloadBlob } from '../api/uploadApi';
import './FileUpload.css';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const PreCampNotify: React.FC = () => {
  // 總表回寫相關狀態
  const [summaryFile, setSummaryFile] = useState<File | null>(null);
  const [teamFilesForSummary, setTeamFilesForSummary] = useState<File[]>([]);
  const [writebackStatus, setWritebackStatus] = useState<UploadStatus>('idle');
  const [writebackError, setWritebackError] = useState<string>('');
  const [writebackBlob, setWritebackBlob] = useState<Blob | null>(null);
  const summaryInputRef = useRef<HTMLInputElement>(null);
  const teamFilesInputRef = useRef<HTMLInputElement>(null);

  // 處理總表檔案選擇
  const handleSummaryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setSummaryFile(null);
      return;
    }

    const file = files[0];
    const validExtensions = ['.xlsx', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setWritebackError('總表檔案只接受 .xlsx 或 .xls 格式');
      setSummaryFile(null);
      return;
    }

    setWritebackError('');
    setWritebackBlob(null);
    setSummaryFile(file);
  };

  // 處理總表回寫用的小隊分頁檔案選擇
  const handleTeamFilesForSummaryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setTeamFilesForSummary([]);
      return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const picked: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        setWritebackError('小隊分頁檔案只接受 .xlsx 或 .xls 格式');
        setTeamFilesForSummary([]);
        return;
      }
      picked.push(file);
    }

    setWritebackError('');
    setWritebackBlob(null);
    setTeamFilesForSummary(picked);
  };

  // 上傳並回寫總表
  const handleWriteback = async () => {
    if (!summaryFile) {
      setWritebackError('請先選擇一個總表檔案');
      return;
    }
    if (!teamFilesForSummary.length) {
      setWritebackError('請至少選擇一個小隊分頁檔案');
      return;
    }

    try {
      setWritebackStatus('uploading');
      setWritebackError('');
      setWritebackBlob(null);

      const blob = await uploadPreCampWriteback(summaryFile, teamFilesForSummary);
      setWritebackBlob(blob);
      setWritebackStatus('success');
    } catch (error) {
      setWritebackStatus('error');
      setWritebackError(error instanceof Error ? error.message : '回寫失敗，請稍後再試');
      console.error('行前通知總表回寫錯誤:', error);
    }
  };

  const handleWritebackDownload = () => {
    if (!writebackBlob) return;
    downloadBlob(writebackBlob, '總表_含出席.xlsx');
  };

  const handleWritebackReset = () => {
    setSummaryFile(null);
    setTeamFilesForSummary([]);
    setWritebackBlob(null);
    setWritebackError('');
    setWritebackStatus('idle');
    if (summaryInputRef.current) {
      summaryInputRef.current.value = '';
    }
    if (teamFilesInputRef.current) {
      teamFilesInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload-container">
      <h2 className="title" style={{ color: '#ffffff' }}>彙整行前通知名單</h2>

      {/* 總表回寫出席 */}
      <p
        className="description"
        style={{ marginTop: '8px', color: '#ffffff' }}
      >
        上傳一個「總表」檔案（欄位與小隊名單匯出相同），再選擇多個已填寫出席欄的小隊分頁檔。系統會依照「報名序號」將出席資料回寫到總表，產出「總表_含出席.xlsx」。
      </p>

      <div className="upload-panel">
        {/* 總表檔案選擇 */}
        <div className="file-input-wrapper">
          <input
            ref={summaryInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleSummaryChange}
            disabled={writebackStatus === 'uploading'}
            id="summary-file-input"
            className="file-input"
          />
          <label htmlFor="summary-file-input" className="file-input-label">
            <span className="icon">📄</span>
            <span className="text">
              {summaryFile ? `總表：${summaryFile.name}` : '選擇總表 Excel 檔案（summary）'}
            </span>
          </label>
        </div>

        {/* 小隊分頁檔案選擇 */}
        <div className="file-input-wrapper" style={{ marginTop: '12px' }}>
          <input
            ref={teamFilesInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleTeamFilesForSummaryChange}
            disabled={writebackStatus === 'uploading'}
            id="summary-team-files-input"
            className="file-input"
          />
          <label htmlFor="summary-team-files-input" className="file-input-label">
            <span className="icon">👥</span>
            <span className="text">
              {teamFilesForSummary.length
                ? `已選擇 ${teamFilesForSummary.length} 個小隊分頁檔案`
                : '選擇多個小隊分頁 Excel 檔案（files）'}
            </span>
          </label>
        </div>

        {(summaryFile || teamFilesForSummary.length > 0) && (
          <div className="file-info">
            {summaryFile && (
              <p style={{ color: '#ffffff' }}><strong>總表：</strong>{summaryFile.name}</p>
            )}
            {teamFilesForSummary.length > 0 && (
              <>
                <p style={{ marginTop: '8px', color: '#ffffff' }}><strong>小隊檔案清單：</strong></p>
                <ul style={{ marginTop: '4px', paddingLeft: '20px', color: '#ffffff' }}>
                  {teamFilesForSummary.map((file) => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {writebackStatus === 'error' && writebackError && (
          <div className="error-message">
            <span className="icon">⚠️</span>
            <span style={{ color: '#ffffff' }}>{writebackError}</span>
          </div>
        )}

        {writebackStatus === 'success' && (
          <div className="success-message">
            <span className="icon">✅</span>
            <span style={{ color: '#ffffff' }}>回寫完成！請下載「總表_含出席.xlsx」</span>
          </div>
        )}

        <div className="button-group">
          {writebackStatus === 'success' ? (
            <>
              <button
                className="btn btn-primary"
                onClick={handleWritebackDownload}
              >
                <span className="icon">⬇️</span>
                下載總表_含出席
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleWritebackReset}
              >
                重新選擇檔案
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={handleWriteback}
                disabled={!summaryFile || !teamFilesForSummary.length || writebackStatus === 'uploading'}
              >
                {writebackStatus === 'uploading' ? '上傳中...' : '上傳並回寫總表'}
              </button>
              {(summaryFile || teamFilesForSummary.length > 0) && (
                <button
                  className="btn btn-secondary"
                  onClick={handleWritebackReset}
                  disabled={writebackStatus === 'uploading'}
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

export default PreCampNotify;
