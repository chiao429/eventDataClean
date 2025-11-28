import { useState } from 'react';
import FileUpload from './components/FileUpload';
import TeamDivider from './components/TeamDivider';
import TeamList from './components/TeamList';
import WorkerAttendance from './components/WorkerAttendance';
import Menu from './components/Menu';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('team-divider');

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo-container">
            <img src="/images/SMK_001.png" alt="SMK Logo" className="logo" />
            <img src="/images/Dream_002.png" alt="Dream Logo" className="logo" />
          </div>
          <h1>活動報名 Excel 整理系統</h1>
          <p className="subtitle">上傳報名資料，自動依年級分組並整理手足關係</p>
        </header>

        <Menu activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'excel-processor' && <FileUpload />}
        {activeTab === 'team-divider' && <TeamDivider />}
        {activeTab === 'worker-attendance' && <WorkerAttendance />}
        {activeTab === 'team-list' && <TeamList />}

        <footer className="footer">
          {activeTab === 'team-divider' && (
            <>
              <div className="info-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>📋 系統說明</h3>
                  <ul>
                    <li>上傳包含報名資料的 Excel 檔案（.xlsx 或 .xls）</li>
                    <li>系統會自動依「年級」分組，每個年級建立一個分頁</li>
                    <li>學齡前統一分組，並按年級排序（未就學→小班→中班→大班）</li>
                    <li>在分頁中手動填入小隊，總表會自動顯示</li>
                    <li>標題欄位有顏色標記：小隊（綠）、報名序號（藍）、其他（黃）</li>
                    <li>輸出整理後的 Excel 檔案供下載</li>
                  </ul>
                </div>
                <div style={{ marginLeft: '20px' }}>
                  <a
                    href="/範本_收費總表.xlsx"
                    download="範本_收費總表.xlsx"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📥 收費總表範例下載
                  </a>
                </div>
              </div>

              <div className="info-section">
                <h3>📝 必要欄位</h3>
                <div className="fields-grid">
                  <span className="field-tag">報名序號</span>
                  <span className="field-tag">兒童姓名</span>
                  <span className="field-tag">性別</span>
                  <span className="field-tag">年級</span>
                  <span className="field-tag">學校</span>
                  <span className="field-tag">家長姓名</span>
                  <span className="field-tag">家長行動電話</span>
                  <span className="field-tag">備註</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'worker-attendance' && (
            <>
              <div className="info-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>📋 系統說明</h3>
                  <ul>
                    <li>上傳同工名單 Excel 檔案（.xlsx 或 .xls）</li>
                    <li>系統會依欄位名稱讀取「姓名 / 性別 / 組別 / 聯絡電話 / 所屬小組」</li>
                    <li>自動產生同工出席名單：包含序號、姓名、到達時間、已到、組別、聯絡電話、性別、所屬小組</li>
                    <li>「到達時間」與「已到」欄位預設留空，方便現場手動填寫</li>
                  </ul>
                </div>
                <div style={{ marginLeft: '20px' }}>
                  <a
                    href="/範本_同工名單.xlsx"
                    download="範本_同工名單.xlsx"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📥 同工名單範例下載
                  </a>
                </div>
              </div>

              <div className="info-section">
                <h3>📝 建議欄位名稱</h3>
                <div className="fields-grid">
                  <span className="field-tag">姓名 / 同工姓名</span>
                  <span className="field-tag">性別</span>
                  <span className="field-tag">組別 / 部門 / 服事組別</span>
                  <span className="field-tag">聯絡電話 / 手機 / 電話 / 行動電話</span>
                  <span className="field-tag">所屬小組 / 小組 / 所屬小隊</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'excel-processor' && (
            <>
              <div className="info-section">
                <h3>📋 系統說明</h3>
                <ul>
                  <li>上傳包含報名資料的 Excel 檔案（.xlsx 或 .xls）</li>
                  <li>系統會自動依「年級」分組，每個年級建立一個分頁</li>
                  <li>學齡前統一分組，並按年級排序（未就學→小班→中班→大班）</li>
                  <li>自動判斷手足關係（依據家長姓名）</li>
                  <li>自動填入手足的報名序號和所屬小隊</li>
                  <li>新增「出席」欄位供手動填寫</li>
                  <li>輸出整理後的 Excel 檔案供下載</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>📝 必要欄位</h3>
                <div className="fields-grid">
                  <span className="field-tag">報名序號</span>
                  <span className="field-tag">兒童姓名</span>
                  <span className="field-tag">性別</span>
                  <span className="field-tag">年級</span>
                  <span className="field-tag">學校</span>
                  <span className="field-tag">家長姓名</span>
                  <span className="field-tag">家長行動電話</span>
                  <span className="field-tag">小隊</span>
                  <span className="field-tag">備註</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'team-list' && (
            <>
              <div className="info-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>📋 系統說明</h3>
                  <ul>
                    <li>上傳包含報名資料和小隊資訊的 Excel 檔案（.xlsx 或 .xls）</li>
                    <li>填寫活動名稱和各小隊的小隊長資訊（可手動輸入或上傳 Excel）</li>
                    <li>系統會自動依「小隊」分組，每個小隊建立一個分頁</li>
                    <li>小隊分頁按自然排序（s001, s002...）</li>
                    <li>每個小隊分頁最上方顯示活動名稱和小隊長資訊</li>
                    <li>自動判斷手足關係（依據家長姓名）並展開顯示</li>
                    <li>新增「公開照片」和「提供聯繫方式」欄位</li>
                    <li>輸出整理後的 Excel 檔案供下載</li>
                  </ul>
                </div>
                <div style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a
                    href="/範本_分隊.xlsx"
                    download="範本_分隊.xlsx"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      textAlign: 'center'
                    }}
                  >
                    📥 分隊範例下載
                  </a>
                  <a
                    href="/範本_小隊長名單.xlsx"
                    download="範本_小隊長名單.xlsx"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      textAlign: 'center'
                    }}
                  >
                    📥 小隊長名單範例下載
                  </a>
                </div>
              </div>

              <div className="info-section">
                <h3>📝 必要欄位</h3>
                <div className="fields-grid">
                  <span className="field-tag">報名序號</span>
                  <span className="field-tag">兒童姓名</span>
                  <span className="field-tag">性別</span>
                  <span className="field-tag">年級</span>
                  <span className="field-tag">學校</span>
                  <span className="field-tag">家長姓名</span>
                  <span className="field-tag">家長行動電話</span>
                  <span className="field-tag">小隊</span>
                  <span className="field-tag">備註</span>
                </div>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

export default App;
