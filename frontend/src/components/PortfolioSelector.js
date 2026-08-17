// frontend/src/components/PortfolioSelector.js

import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import PortfolioForm from './PortfolioForm';
import './PortfolioSelector.css';

const PortfolioSelector = () => {
  const {
    portfolios,
    currentPortfolioId,
    setCurrentPortfolioId,
    loading,
    deletePortfolio
  } = usePortfolio();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);

  if (loading) return <div className="portfolio-loading">...</div>;

  const currentPortfolio = portfolios.find(p => p.id === currentPortfolioId);

  const handleSelect = (portfolioId) => {
    setCurrentPortfolioId(portfolioId);
    setIsOpen(false);
  };

  const handleDelete = async (e, portfolioId, portfolioName, isDefault) => {
    e.stopPropagation();

    if (isDefault) {
      showToast('❌ پورتفولیو پیش‌فرض قابل حذف نیست.', 'warning');
      return;
    }

    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (portfolio && portfolio.total_trades > 0) {
      showToast(`❌ این پورتفولیو دارای ${portfolio.total_trades} ترید است. ابتدا تریدها را حذف یا منتقل کنید.`, 'error');
      return;
    }

    if (!window.confirm(`آیا از حذف پورتفولیو "${portfolioName}" اطمینان دارید؟`)) {
      return;
    }

    try {
      await deletePortfolio(portfolioId);
      showToast(`✅ پورتفولیو "${portfolioName}" با موفقیت حذف شد`, 'success');
      if (currentPortfolioId === portfolioId) {
        setCurrentPortfolioId(portfolios.length > 1 ? portfolios.find(p => p.id !== portfolioId)?.id || 'all' : 'all');
      }
    } catch (error) {
      showToast('❌ خطا در حذف پورتفولیو', 'error');
      console.error(error);
    }
  };

  const handleEdit = (e, portfolio) => {
    e.stopPropagation();
    setEditingPortfolio(portfolio);
    setShowModal(true);
    setIsOpen(false);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPortfolio(null);
  };

  return (
    <div className="portfolio-selector">
      <div className="dropdown">
        <button
          className="dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title="انتخاب پورتفولیو"
        >
          <span className="portfolio-icon">
            {currentPortfolioId === 'all' ? '📊' :
             currentPortfolioId === 'none' ? '📭' :
             currentPortfolio?.icon || '📊'}
          </span>
          <span className="portfolio-name">
            {currentPortfolioId === 'all' ? 'همه پورتفولیوها' :
             currentPortfolioId === 'none' ? 'بدون پورتفولیو' :
             currentPortfolio?.name || 'انتخاب پورتفولیو'}
          </span>
          <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            {/* گزینه همه پورتفولیوها */}
            <div
              className={`dropdown-item ${currentPortfolioId === 'all' ? 'active' : ''}`}
              onClick={() => handleSelect('all')}
            >
              <span className="item-icon">📊</span>
              <span className="item-name">همه پورتفولیوها</span>
              {currentPortfolioId === 'all' && <span className="badge-active">✓</span>}
            </div>

            {/* گزینه بدون پورتفولیو (برای تریدهای قدیمی) */}
            <div
              className={`dropdown-item ${currentPortfolioId === 'none' ? 'active' : ''}`}
              onClick={() => handleSelect('none')}
            >
              <span className="item-icon">📭</span>
              <span className="item-name">بدون پورتفولیو</span>
              {currentPortfolioId === 'none' && <span className="badge-active">✓</span>}
            </div>

            {portfolios.length > 0 && <div className="dropdown-divider" />}

            {/* لیست پورتفولیوها با دکمه‌های ویرایش و حذف */}
            {portfolios.map(p => (
              <div
                key={p.id}
                className={`dropdown-item ${p.id === currentPortfolioId ? 'active' : ''}`}
                onClick={() => handleSelect(p.id)}
              >
                <span className="item-icon">{p.icon || '📊'}</span>
                <span className="item-name">{p.name}</span>
                {p.is_default && <span className="badge-default">پیش‌فرض</span>}
                {p.id === currentPortfolioId && <span className="badge-active">✓</span>}

                <div className="item-actions">
                  {/* دکمه ویرایش */}
                  <button
                    className="btn-edit-portfolio"
                    onClick={(e) => handleEdit(e, p)}
                    title="ویرایش پورتفولیو"
                  >
                    ✏️
                  </button>

                  {/* دکمه حذف - فقط اگر پورتفولیو پیش‌فرض نباشد */}
                  {!p.is_default && (
                    <button
                      className="btn-delete-portfolio"
                      onClick={(e) => handleDelete(e, p.id, p.name, p.is_default)}
                      title="حذف پورتفولیو"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="dropdown-divider" />
            <div
              className="dropdown-item add-new"
              onClick={() => {
                setIsOpen(false);
                setEditingPortfolio(null);
                setShowModal(true);
              }}
            >
              <span className="item-icon">➕</span>
              <span className="item-name">افزودن پورتفولیو جدید</span>
            </div>
          </div>
        )}
      </div>

      {/* مودال ایجاد/ویرایش پورتفولیو */}
      {showModal && (
        <PortfolioForm
          onClose={handleModalClose}
          onSuccess={() => {
            handleModalClose();
          }}
          editData={editingPortfolio}
        />
      )}
    </div>
  );
};

export default PortfolioSelector;