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

  if (loading) return <div className="ps-loading">...</div>;

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
    <div className="ps-selector">
      <div className="ps-dropdown">
        <button
          type="button"
          className="ps-dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title="انتخاب پورتفولیو"
        >
          <span className="ps-icon">
            {currentPortfolioId === 'all' ? '📊' :
             currentPortfolioId === 'none' ? '📭' :
             currentPortfolio?.icon || '📊'}
          </span>
          <span className="ps-name">
            {currentPortfolioId === 'all' ? 'همه پورتفولیوها' :
             currentPortfolioId === 'none' ? 'بدون پورتفولیو' :
             currentPortfolio?.name || 'انتخاب پورتفولیو'}
          </span>
          <span className={`ps-arrow ${isOpen ? 'ps-open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="ps-dropdown-menu">
            {/* گزینه همه پورتفولیوها */}
            <div
              className={`ps-dropdown-item ${currentPortfolioId === 'all' ? 'ps-active' : ''}`}
              onClick={() => handleSelect('all')}
            >
              <span className="ps-item-icon">📊</span>
              <span className="ps-item-name">همه پورتفولیوها</span>
              {currentPortfolioId === 'all' && <span className="ps-badge-active">✓</span>}
            </div>

            {/* گزینه بدون پورتفولیو */}
            <div
              className={`ps-dropdown-item ${currentPortfolioId === 'none' ? 'ps-active' : ''}`}
              onClick={() => handleSelect('none')}
            >
              <span className="ps-item-icon">📭</span>
              <span className="ps-item-name">بدون پورتفولیو</span>
              {currentPortfolioId === 'none' && <span className="ps-badge-active">✓</span>}
            </div>

            {portfolios.length > 0 && <div className="ps-divider" />}

            {/* لیست پورتفولیوها */}
            {portfolios.map(p => (
              <div
                key={p.id}
                className={`ps-dropdown-item ${p.id === currentPortfolioId ? 'ps-active' : ''}`}
                onClick={() => handleSelect(p.id)}
              >
                <span className="ps-item-icon">{p.icon || '📊'}</span>
                <span className="ps-item-name">{p.name}</span>
                {p.is_default && <span className="ps-badge-default">پیش‌فرض</span>}
                {p.id === currentPortfolioId && <span className="ps-badge-active">✓</span>}

                <div className="ps-item-actions">
                  <button
                    type="button"
                    className="ps-btn-edit"
                    onClick={(e) => handleEdit(e, p)}
                    title="ویرایش پورتفولیو"
                  >
                    ✏️
                  </button>
                  {!p.is_default && (
                    <button
                      type="button"
                      className="ps-btn-delete"
                      onClick={(e) => handleDelete(e, p.id, p.name, p.is_default)}
                      title="حذف پورتفولیو"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="ps-divider" />
            <div
              className="ps-dropdown-item ps-add-new"
              onClick={() => {
                setIsOpen(false);
                setEditingPortfolio(null);
                setShowModal(true);
              }}
            >
              <span className="ps-item-icon">➕</span>
              <span className="ps-item-name">افزودن پورتفولیو جدید</span>
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