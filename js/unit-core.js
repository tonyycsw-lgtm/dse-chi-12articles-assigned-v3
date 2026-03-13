// unit-core.js - DSE 單元核心管理模組
(function(global) {
  'use strict';

  // 儲存所有上傳單元的容器
  let units = {}; // key: unitId, value: { name, data, metadata, timestamp }

  // ========== StorageManager ==========
  const STORAGE_KEY = 'dse_units';

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        units = JSON.parse(stored);
      } else {
        units = {};
      }
    } catch (e) {
      console.error('讀取本地儲存失敗', e);
      units = {};
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
    } catch (e) {
      console.error('儲存至本地失敗', e);
    }
  }

  // ========== UnitsManager ==========
  function getAllUnits() {
    return units;
  }

  function getUnit(unitId) {
    return units[unitId];
  }

  function addUnit(unitId, unitName, data, metadata = {}) {
    if (units[unitId]) {
      console.warn('單元已存在，將覆蓋', unitId);
    }
    units[unitId] = {
      name: unitName,
      data: data,
      metadata: metadata,
      timestamp: Date.now()
    };
    saveToStorage();
    return units[unitId];
  }

  function updateUnit(unitId, updates) {
    if (!units[unitId]) return false;
    units[unitId] = { ...units[unitId], ...updates, timestamp: Date.now() };
    saveToStorage();
    return true;
  }

  function deleteUnit(unitId) {
    if (!units[unitId]) return false;
    delete units[unitId];
    saveToStorage();
    return true;
  }

  function deleteMultipleUnits(unitIds) {
    unitIds.forEach(id => delete units[id]);
    saveToStorage();
  }

  // 生成唯一ID
  function generateUnitId(baseName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `unit_${timestamp}_${random}`;
  }

  // 處理名稱重複
  function getUniqueUnitName(baseName) {
    let name = baseName;
    let counter = 1;
    const existingNames = Object.values(units).map(u => u.name);
    while (existingNames.includes(name)) {
      name = `${baseName} (${counter})`;
      counter++;
    }
    return name;
  }

  // 從 JSON 數據提取 metadata
  function extractMetadata(data) {
    return {
      category: data.metadata?.category || '未分類',
      author: data.metadata?.author || '',
      period: data.metadata?.period || '',
      difficulty: data.metadata?.difficulty || '未指定',
      tags: data.metadata?.tags || [],
      paragraphCount: data.article?.paragraphs?.length || 0,
      vocabCount: data.vocabulary?.length || 0
    };
  }

  // ========== CategoryManager ==========
  function getAllCategories() {
    const categories = new Set();
    Object.values(units).forEach(unit => {
      if (unit.metadata?.category) categories.add(unit.metadata.category);
    });
    return Array.from(categories).sort();
  }

  function getAllAuthors() {
    const authors = new Set();
    Object.values(units).forEach(unit => {
      if (unit.metadata?.author) authors.add(unit.metadata.author);
    });
    return Array.from(authors).sort();
  }

  function getAllTags() {
    const tags = new Set();
    Object.values(units).forEach(unit => {
      (unit.metadata?.tags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  function filterUnits(criteria = {}) {
    // criteria: { category, author, difficulty, tag, searchText }
    return Object.entries(units).filter(([id, unit]) => {
      if (criteria.category && unit.metadata?.category !== criteria.category) return false;
      if (criteria.author && unit.metadata?.author !== criteria.author) return false;
      if (criteria.difficulty && unit.metadata?.difficulty !== criteria.difficulty) return false;
      if (criteria.tag && !(unit.metadata?.tags || []).includes(criteria.tag)) return false;
      if (criteria.searchText) {
        const text = criteria.searchText.toLowerCase();
        return unit.name.toLowerCase().includes(text) || 
               (unit.metadata?.author || '').toLowerCase().includes(text) ||
               (unit.data?.article?.title || '').toLowerCase().includes(text);
      }
      return true;
    }).map(([id, unit]) => ({ id, ...unit }));
  }

  // ========== ExportImport ==========
  function exportAllUnits() {
    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      units: units
    };
  }

  function exportSelectedUnits(unitIds) {
    const selected = {};
    unitIds.forEach(id => {
      if (units[id]) selected[id] = units[id];
    });
    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      units: selected
    };
  }

  function importUnits(backupData, options = { merge: false }) {
    if (!backupData || !backupData.units || backupData.version !== '1.0') {
      throw new Error('無效的備份檔案格式');
    }
    if (options.merge) {
      // 合併：新資料覆蓋舊資料（以 ID 為鍵）
      units = { ...units, ...backupData.units };
    } else {
      // 取代：完全取代現有資料
      units = { ...backupData.units };
    }
    saveToStorage();
    return Object.keys(backupData.units).length;
  }

  // 初始化：從 storage 載入
  loadFromStorage();

  // 暴露公共 API
  global.DSEUnitCore = {
    // 儲存管理
    loadFromStorage,
    saveToStorage,
    // 單元管理
    getAllUnits,
    getUnit,
    addUnit,
    updateUnit,
    deleteUnit,
    deleteMultipleUnits,
    generateUnitId,
    getUniqueUnitName,
    extractMetadata,
    // 分類
    getAllCategories,
    getAllAuthors,
    getAllTags,
    filterUnits,
    // 匯入匯出
    exportAllUnits,
    exportSelectedUnits,
    importUnits
  };
})(window);