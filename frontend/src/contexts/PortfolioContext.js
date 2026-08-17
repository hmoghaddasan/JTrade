// frontend/src/contexts/PortfolioContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import { portfolioService } from '../services/apiService';

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [portfolios, setPortfolios] = useState([]);
  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const response = await portfolioService.getPortfolios();
      const data = response.data.results || response.data;
      setPortfolios(data);

      const defaultPortfolio = data.find(p => p.is_default);
      if (defaultPortfolio) {
        setCurrentPortfolioId(defaultPortfolio.id);
      } else if (data.length > 0) {
        setCurrentPortfolioId(data[0].id);
      }
    } catch (err) {
      setError('خطا در بارگذاری پورتفولیوها');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async (data) => {
    try {
      const response = await portfolioService.createPortfolio(data);
      await loadPortfolios();
      return response.data;
    } catch (err) {
      setError('خطا در ایجاد پورتفولیو');
      throw err;
    }
  };

  const updatePortfolio = async (id, data) => {
    try {
      const response = await portfolioService.updatePortfolio(id, data);
      await loadPortfolios();
      return response.data;
    } catch (err) {
      setError('خطا در ویرایش پورتفولیو');
      throw err;
    }
  };

  const deletePortfolio = async (id) => {
    try {
      await portfolioService.deletePortfolio(id);
      await loadPortfolios();
    } catch (err) {
      setError('خطا در حذف پورتفولیو');
      throw err;
    }
  };

  const getCurrentPortfolio = () => {
    return portfolios.find(p => p.id === currentPortfolioId) || null;
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  const value = {
    portfolios,
    currentPortfolioId,
    setCurrentPortfolioId,
    loading,
    error,
    loadPortfolios,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    getCurrentPortfolio,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};