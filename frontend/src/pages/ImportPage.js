// frontend/src/pages/ImportPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePortfolio } from '../contexts/PortfolioContext';
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
  const { portfolios, currentPortfolio, loadPortfolios } = usePortfolio();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [detectedBroker, setDetectedBroker] = useState(null);
  const [suggestedMapping, setSuggestedMapping] = useState({});
  const [columnMapping, setColumnMapping] = useState({});
  const [groups, setGroups] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saveMapping, setSaveMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [savedMappings, setSavedMappings] = useState([]);

  // بارگذاری گروه‌ها و نگاشت‌های ذخیره‌شده
  useEffect(() => {
    const loadData = async () => {
      try {
        const groupsRes = await RealApiService.getTradeGroups();
        const groupsData = groupsRes.data.results || groupsRes.data || [];
        setGroups(groupsData);
        if (groupsData.length > 0) {
          const defaultGroup = groupsData.find(g => g.is_default) || groupsData[0];
          setSelectedGroup(defaultGroup.id);
        }
        const mappingsRes = await importService.getMappings();
        setSavedMappings(mappingsRes.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('❌ خطا در بارگذاری داده‌های اولیه', 'error');
      }
    };
    loadData();
  }, [showToast]);

  // بارگذاری پورتفولیوها از Context
  useEffect(() => {
    if (portfolios.length === 0) {
      loadPortfolios();
    }
  }, [portfolios, loadPortfolios]);

  // تنظیم selectedPortfolio
  useEffect(() => {
    if (portfolios.length === 0) return;
    let selected = null;
    if (currentPortfolio && portfolios.some(p => p.id === currentPortfolio.id)) {
      selected = currentPortfolio.id;
    } else {
      const defaultPortfolio = portfolios.find(p => p.is_default) || portfolios[0];
      selected = defaultPortfolio.id;
    }
    setSelectedPortfolio(selected);
  }, [portfolios, currentPortfolio]);

  // ✅ به‌روزرسانی columnMapping با suggestedMapping در صورت خالی بودن
  useEffect(() => {
    if (suggestedMapping && Object.keys(suggestedMapping).length > 0) {
      if (!columnMapping || Object.keys(columnMapping).length === 0) {
        console.log('📤 Setting columnMapping from suggestedMapping:', suggestedMapping);
        setColumnMapping(suggestedMapping);
      }
    }
  }, [suggestedMapping]);

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
      // ✅ مقداردهی اولیه columnMapping با suggestedMapping
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
    console.log('📤 handleMappingChange called with:', newMapping);
    setColumnMapping(newMapping);
  };

  const handleImport = async () => {
    if (!file) return;

    // ✅ استفاده از columnMapping یا fallback به suggestedMapping
    const finalMapping = (columnMapping && Object.keys(columnMapping).length > 0)
      ? columnMapping
      : suggestedMapping;

    console.log('📤 finalMapping being sent:', finalMapping);
    console.log('📤 finalMapping keys:', Object.keys(finalMapping));

    if (!finalMapping || Object.keys(finalMapping).length === 0) {
      showToast('⚠️ لطفاً ابتدا نگاشت ستون‌ها را انجام دهید', 'warning');
      return;
    }

    // ✅ بررسی وجود trade_date و symbol در mapping
    if (!finalMapping.trade_date) {
      showToast('⚠️ لطفاً ستون تاریخ (trade_date) را مشخص کنید', 'warning');
      return;
    }
    if (!finalMapping.symbol) {
      showToast('⚠️ لطفاً ستون نماد (symbol) را مشخص کنید', 'warning');
      return;
    }

    if (!selectedGroup) {
      showToast('⚠️ لطفاً یک گروه برای تریدها انتخاب کنید', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await importService.importCSV(
        file,
        finalMapping,  // ✅ ارسال finalMapping
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
      console.error('Import error:', error);
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
    setSuggestedMapping({});
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
        {step === 1 && (
          <CSVUploader
            onUpload={handleFileUpload}
            isProcessing={isProcessing}
          />
        )}

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