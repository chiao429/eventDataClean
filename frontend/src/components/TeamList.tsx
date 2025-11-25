import React, { useState, useRef, useEffect } from 'react';
import { uploadTeamListFile, downloadBlob } from '../api/uploadApi';
import './FileUpload.css';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const TeamList: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 過濾選項
  const [hideCancelled] = useState<boolean>(true);
  const [hideNoNumber] = useState<boolean>(false);
  
  // 排序選項
  const [sortBy] = useState<'registrationNumber' | 'originalIndex'>('registrationNumber');
  
  // 檔名輸入
  const [customFilename, setCustomFilename] = useState<string>('');
  
  // 小隊資訊
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [activityName, setActivityName] = useState<string>('');
  const [teamLeaders, setTeamLeaders] = useState<{[key: string]: {leader: string, leaderGender: string, viceLeader: string, viceLeaderGender: string}}>({});
  const [showTeamInfo, setShowTeamInfo] = useState<boolean>(false);
  const [submittedTeamInfo, setSubmittedTeamInfo] = useState<{activityName: string, leaders: {[key: string]: {leader: string, leaderGender: string, viceLeader: string, viceLeaderGender: string}}} | null>(null);
  const leaderFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 監聽排序方式變更，自動重新處理
   */
  useEffect(() => {
    // 只有在已經處理成功的情況下才自動重新上傳
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
      
      // 檢查檔案類型
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

      // 上傳檔案，並傳遞過濾選項、排序選項和小隊資訊
      const blob = await uploadTeamListFile(selectedFile, (progress) => {
        setProgress(progress);
      }, {
        hideCancelled,
        hideNoNumber,
        sortBy
      }, submittedTeamInfo);

      setStatus('success');
      setProcessedBlob(blob);
      setProgress(100);
      
      // 讀取 Excel 提取小隊名稱
      await extractTeamNames(blob);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '上傳失敗，請稍後再試');
      console.error('上傳錯誤:', error);
    }
  };

  /**
   * 從 Excel 提取小隊名稱
   */
  const extractTeamNames = async (blob: Blob) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 取得所有工作表名稱（排除總表）
      const teams = workbook.SheetNames.filter((name: string) => name !== '總表');
      setTeamNames(teams);
      
      // 初始化小隊長資料
      const initialLeaders: {[key: string]: {leader: string, leaderGender: string, viceLeader: string, viceLeaderGender: string}} = {};
      teams.forEach((team: string) => {
        initialLeaders[team] = { leader: '', leaderGender: '', viceLeader: '', viceLeaderGender: '' };
      });
      setTeamLeaders(initialLeaders);
      setShowTeamInfo(true);
    } catch (error) {
      console.error('提取小隊名稱失敗:', error);
    }
  };
  
  /**
   * 處理小隊長資料輸入
   */
  const handleLeaderChange = (team: string, field: 'leader' | 'viceLeader', value: string) => {
    setTeamLeaders(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [field]: value
      }
    }));
  };
  
  /**
   * 處理上傳小隊長資料 Excel
   */
  const handleLeaderFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 讀取第一個工作表
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      // 解析資料並填入小隊長資訊
      const newLeaders = { ...teamLeaders };
      
      data.forEach((row: any) => {
        const team = row['小隊'] || row['team'] || row['隊伍'];
        const leader = row['小隊長'] || row['leader'] || row['隊長'];
        const leaderGender = row['小隊長性別'] || row['leaderGender'] || row['隊長性別'] || '';
        const viceLeader = row['副小隊長'] || row['viceLeader'] || row['副隊長'] || '';
        const viceLeaderGender = row['副小隊長性別'] || row['viceLeaderGender'] || row['副隊長性別'] || '';
        
        if (team && newLeaders[team]) {
          newLeaders[team] = {
            leader: leader || '',
            leaderGender: leaderGender || '',
            viceLeader: viceLeader || '',
            viceLeaderGender: viceLeaderGender || ''
          };
        }
      });
      
      setTeamLeaders(newLeaders);
      alert('小隊長資料已成功匯入！');
    } catch (error) {
      console.error('讀取小隊長資料失敗:', error);
      alert('讀取檔案失敗，請確認檔案格式正確');
    }
    
    // 清空 input
    if (leaderFileInputRef.current) {
      leaderFileInputRef.current.value = '';
    }
  };
  
  /**
   * 提交小隊資訊並重新處理檔案
   */
  const handleSubmitTeamInfo = async () => {
    // 先儲存小隊資訊
    const teamInfo = {
      activityName,
      leaders: teamLeaders
    };
    setSubmittedTeamInfo(teamInfo);
    
    // 重新上傳檔案以包含小隊資訊
    if (selectedFile) {
      try {
        setStatus('processing');
        setProgress(0);
        
        const blob = await uploadTeamListFile(selectedFile, (progress) => {
          setProgress(progress);
        }, {
          hideCancelled,
          hideNoNumber,
          sortBy
        }, teamInfo);
        
        setStatus('success');
        setProcessedBlob(blob);
        setProgress(100);
        
        alert('小隊資訊已成功提交並更新檔案！');
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '更新檔案失敗');
        console.error('更新檔案錯誤:', error);
      }
    }
  };
  
  /**
   * 處理性別輸入
   */
  const handleGenderChange = (team: string, field: 'leaderGender' | 'viceLeaderGender', value: string) => {
    setTeamLeaders(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [field]: value
      }
    }));
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
        filename = `小隊名單_${year}${month}${day}.xlsx`;
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
        {/* 檔案選擇區 */}
        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={status === 'uploading' || status === 'processing'}
            id="file-input"
            className="file-input"
          />
          <label htmlFor="file-input" className="file-input-label">
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
                placeholder="留空則使用預設檔名：小隊名單_yyyymmdd"
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

            {/* 小隊資訊輸入區域 */}
            {showTeamInfo && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: 'rgba(15, 23, 42, 0.5)', 
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <h3 style={{ marginBottom: '15px', color: '#3b82f6' }}>小隊資訊設定</h3>
                
                {/* 活動名稱 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    活動名稱：
                  </label>
                  <input
                    type="text"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="請輸入活動名稱"
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

                {/* 小隊長資料 */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontWeight: '600' }}>
                      小隊長資料：
                    </label>
                    <div>
                      <input
                        ref={leaderFileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleLeaderFileUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => leaderFileInputRef.current?.click()}
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        📤 上傳 Excel
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>
                    Excel 需包含欄位：小隊、小隊長、小隊長性別、副小隊長、副小隊長性別
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teamNames.map((team) => {
                      const needsViceLeader = team.toUpperCase().startsWith('D');
                      return (
                        <div key={team} style={{ 
                          display: 'grid', 
                          gridTemplateColumns: needsViceLeader ? '100px 1fr 80px 1fr 80px' : '100px 1fr 80px',
                          gap: '10px',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: '600', color: '#3b82f6' }}>{team}</span>
                          <input
                            type="text"
                            placeholder="小隊長"
                            value={teamLeaders[team]?.leader || ''}
                            onChange={(e) => handleLeaderChange(team, 'leader', e.target.value)}
                            style={{
                              padding: '8px',
                              fontSize: '0.95rem',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              background: 'rgba(15, 23, 42, 0.5)',
                              color: '#ffffff'
                            }}
                          />
                          <select
                            value={teamLeaders[team]?.leaderGender || ''}
                            onChange={(e) => handleGenderChange(team, 'leaderGender', e.target.value)}
                            style={{
                              padding: '8px',
                              fontSize: '0.95rem',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              background: 'rgba(15, 23, 42, 0.5)',
                              color: '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">性別</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                          </select>
                          {needsViceLeader && (
                            <>
                              <input
                                type="text"
                                placeholder="副小隊長"
                                value={teamLeaders[team]?.viceLeader || ''}
                                onChange={(e) => handleLeaderChange(team, 'viceLeader', e.target.value)}
                                style={{
                                  padding: '8px',
                                  fontSize: '0.95rem',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '6px',
                                  background: 'rgba(15, 23, 42, 0.5)',
                                  color: '#ffffff'
                                }}
                              />
                              <select
                                value={teamLeaders[team]?.viceLeaderGender || ''}
                                onChange={(e) => handleGenderChange(team, 'viceLeaderGender', e.target.value)}
                                style={{
                                  padding: '8px',
                                  fontSize: '0.95rem',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '6px',
                                  background: 'rgba(15, 23, 42, 0.5)',
                                  color: '#ffffff',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="">性別</option>
                                <option value="男">男</option>
                                <option value="女">女</option>
                              </select>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 送出按鈕 */}
                <button
                  onClick={handleSubmitTeamInfo}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  送出小隊資訊
                </button>
              </div>
            )}

            {/* 顯示已提交的小隊資訊 */}
            {submittedTeamInfo && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <h3 style={{ marginBottom: '15px', color: '#22c55e' }}>✓ 已提交的小隊資訊</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <strong>活動名稱：</strong>
                  <span style={{ marginLeft: '10px' }}>{submittedTeamInfo.activityName || '(未填寫)'}</span>
                </div>

                <div>
                  <strong>小隊長資料：</strong>
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(submittedTeamInfo.leaders).map(([team, leaders]) => (
                      <div key={team} style={{ paddingLeft: '10px' }}>
                        <span style={{ color: '#3b82f6', fontWeight: '600' }}>{team}:</span>
                        <span style={{ marginLeft: '10px' }}>
                          小隊長: {leaders.leader || '(未填寫)'}
                          {leaders.leaderGender && <span style={{ color: '#94a3b8' }}> ({leaders.leaderGender})</span>}
                        </span>
                        {team.toUpperCase().startsWith('D') && (
                          <span style={{ marginLeft: '15px' }}>
                            副小隊長: {leaders.viceLeader || '(未填寫)'}
                            {leaders.viceLeaderGender && <span style={{ color: '#94a3b8' }}> ({leaders.viceLeaderGender})</span>}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 按鈕區 */}
        <div className="button-group">
          {status === 'success' ? (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={!submittedTeamInfo}
                style={{
                  opacity: !submittedTeamInfo ? 0.5 : 1,
                  cursor: !submittedTeamInfo ? 'not-allowed' : 'pointer'
                }}
              >
                <span className="icon">⬇️</span>
                下載整理後的 Excel
              </button>
              {!submittedTeamInfo && (
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#f59e0b', 
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  ⚠️ 請先提交小隊資訊後才能下載
                </div>
              )}
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

export default TeamList;
