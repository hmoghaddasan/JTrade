// frontend/src/pages/ImportPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import importService from '../services/importService';
import RealApiService from '../services/realApiService';
import CSVUploader from '../components/import/CSVUploader';
import ImportPreview from '../components/import/ImportPreview';
import ColumnMapper from '../components/import/ColumnMapper';
import './ImportPage.css';

const ImportPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: preview, 4: result
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [detectedBroker, setDetectedBroker] = useState(null);
  const [suggestedMapping, setSuggestedMapping] = useState({});
  const [columnMapping, setColumnMapping] = useState({});
  const [portfolios, setPortfolios] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saveMapping, setSaveMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [savedMappings, setSavedMappings] = useState([]);

  // بارگذاری پورتفولیوها و گروه‌ها
  useEffect(() => {
    const loadData = async () => {
      try {
        const portfoliosRes = await RealApiService.getPortfolios();
        setPortfolios(portfoliosRes.data || []);
        const groupsRes = await RealApiService.getTradeGroups();
        setGroups(groupsRes.data.results || groupsRes.data || []);
        const mappingsRes = await importService.getMappings();
        setSavedMappings(mappingsRes.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const handleFileUpload = async (file) => {
    setFile(file);
    setIsProcessing(true);
    try {
      const response = await importService.previewCSV(file);
      const data = response.data;
      setHeaders(data.headers || []);
      setRows(data.rows || []);
      setTotalRows(data.total_rows || 0);
      setDetectedBroker(data.detected_broker || null);
      setSuggestedMapping(data.suggested_mapping || {});
      setColumnMapping(data.suggested_mapping || {});
      setStep(2);
      showToast('✅ فایل با موفقیت بارگذاری شد', 'success');
    } catch (error) {
      showToast('❌ خطا در خواندن فایل: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (newMapping) => {
    setColumnMapping(newMapping);
  };

  const handleImport = async () => {
    if (!file) return;

    // بررسی وجود فیلدهای ضروری
    const required = ['trade_date', 'symbol'];
    const missing = required.filter(f => !columnMapping[f]);
    if (missing.length > 0) {
      showToast(`لطفاً ستون‌های ${missing.join(', ')} را مشخص کنید`, 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await importService.importCSV(
        file,
        columnMapping,
        {
          broker_name: detectedBroker || '',
          save_mapping: saveMapping,
          portfolio_id: selectedPortfolio,
          group_id: selectedGroup,
        }
      );
      setImportResult(response.data);
      setStep(4);
      if (response.data.imported > 0) {
        showToast(`✅ ${response.data.imported} ترید با موفقیت وارد شد`, 'success');
      } else {
        showToast(`⚠️ هیچ ترید جدیدی وارد نشد (${response.data.skipped} مورد تکراری یا خطا)`, 'warning');
      }
    } catch (error) {
      showToast('❌ خطا در وارد کردن داده‌ها', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/dashboard');
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setImportResult(null);
  };

  const applySavedMapping = (mapping) => {
    setColumnMapping(mapping.column_mapping);
    setSaveMapping(true);
    showToast('✅ نگاشت ذخیره‌شده اعمال شد', 'success');
  };

  return (
    <div className="import-page">
      <div className="import-header">
        <span className="step-indicator">مرحله {step} از ۴</span>
        <h1>📥 وارد کردن خودکار تریدها</h1>
        <button className="btn-back" onClick={handleBack}>← بازگشت</button>
      </div>

      <div className="import-content">
        {/* مرحله ۱: آپلود */}
        {step === 1 && (
          <CSVUploader
            onUpload={handleFileUpload}
            isProcessing={isProcessing}
          />
        )}

        {/* مرحله ۲: نگاشت ستون‌ها */}
        {step === 2 && (
          <ColumnMapper
            headers={headers}
            suggestedMapping={suggestedMapping}
            columnMapping={columnMapping}
            onMappingChange={handleMappingChange}
            detectedBroker={detectedBroker}
            savedMappings={savedMappings}
            onApplySavedMapping={applySavedMapping}
            onNext={() => setStep(3)}
            onBack={handleBack}
          />
        )}

        {/* مرحله ۳: پیش‌نمایش و تنظیمات نهایی */}
        {step === 3 && (
          <ImportPreview
            headers={headers}
            rows={rows}
            totalRows={totalRows}
            columnMapping={columnMapping}
            portfolios={portfolios}
            groups={groups}
            selectedPortfolio={selectedPortfolio}
            selectedGroup={selectedGroup}
            onPortfolioChange={setSelectedPortfolio}
            onGroupChange={setSelectedGroup}
            saveMapping={saveMapping}
            onSaveMappingChange={setSaveMapping}
            onImport={handleImport}
            onBack={handleBack}
            isProcessing={isProcessing}
          />
        )}

        {/* مرحله ۴: نتیجه */}
        {step === 4 && importResult && (
          <div className="import-result">
            <div className="result-icon">
              {importResult.imported > 0 ? '✅' : '⚠️'}
            </div>
            <h2>{importResult.imported > 0 ? 'واردات با موفقیت انجام شد' : 'هیچ ترید جدیدی وارد نشد'}</h2>
            <div className="result-stats">
              <div className="stat">
                <span className="label">تریدهای واردشده</span>
                <span className="value">{importResult.imported}</span>
              </div>
              <div className="stat">
                <span className="label">تریدهای تکراری / خطا</span>
                <span className="value">{importResult.skipped}</span>
              </div>
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="warnings">
                  <h4>⚠️ هشدارها</h4>
                  <ul>
                    {importResult.warnings.slice(0, 10).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {importResult.warnings.length > 10 && <li>... و {importResult.warnings.length - 10} مورد دیگر</li>}
                  </ul>
                </div>
              )}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="errors">
                  <h4>❌ خطاها</h4>
                  <ul>
                    {importResult.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {importResult.errors.length > 10 && <li>... و {importResult.errors.length - 10} مورد دیگر</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="result-actions">
              <button className="btn-primary" onClick={handleReset}>➕ وارد کردن دوباره</button>
              <button className="btn-secondary" onClick={() => navigate('/dashboard')}>📊 رفتن به داشبورد</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;