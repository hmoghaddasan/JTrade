// frontend/src/components/Admin/FilterBar.js
import React, { useState } from 'react';

const FilterBar = ({ fields, onFilter, initialValues = {} }) => {
  const [values, setValues] = useState(initialValues);

  const handleChange = (key, value) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter(values);
  };

  const handleReset = () => {
    setValues({});
    onFilter({});
  };

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div className="filter-group" key={field.key}>
          <label>{field.label}</label>
          {field.type === 'text' && (
            <input
              type="text"
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
            />
          )}
          {field.type === 'select' && (
            <select
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {field.type === 'date' && (
            <input
              type="date"
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="filter-actions">
        <button type="submit" className="btn-filter">اعمال فیلتر</button>
        <button type="button" className="btn-reset" onClick={handleReset}>حذف فیلترها</button>
      </div>
    </form>
  );
};

export default FilterBar;