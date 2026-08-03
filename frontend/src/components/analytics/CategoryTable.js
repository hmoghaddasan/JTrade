// frontend/src/components/analytics/CategoryTable.js

import React from 'react';
import './CategoryTable.css';

const CategoryTable = ({ categories }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="category-table-empty">
        <p>هیچ داده‌ای برای نمایش وجود ندارد</p>
      </div>
    );
  }

  return (
    <div className="category-table-container">
      <h4 className="table-title">📋 جزئیات دسته‌بندی‌ها</h4>
      <div className="table-wrapper">
        <table className="category-table">
          <thead>
            <tr>
              <th>دسته</th>
              <th>تعداد ترید</th>
              <th>نرخ برد</th>
              <th>تعداد برد</th>
              <th>تعداد باخت</th>
              <th>سود کل</th>
              <th>میانگین R:R</th>
              <th>کیفیت اجرا</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr key={index}>
                <td className="category-name">{cat.name}</td>
                <td>{cat.count}</td>
                <td>
                  <span className={`win-rate ${cat.win_rate >= 50 ? 'high' : 'low'}`}>
                    {cat.win_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="win-count">{cat.win_count}</td>
                <td className="loss-count">{cat.loss_count}</td>
                <td className={cat.total_profit >= 0 ? 'profit' : 'loss'}>
                  ${cat.total_profit.toFixed(2)}
                </td>
                <td>{cat.avg_rr.toFixed(2)}</td>
                <td>
                  <span className={`quality-badge ${cat.avg_quality >= 7 ? 'high' : cat.avg_quality >= 4 ? 'medium' : 'low'}`}>
                    {cat.avg_quality.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryTable;