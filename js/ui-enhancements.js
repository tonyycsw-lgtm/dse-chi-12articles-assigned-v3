// ui-enhancements.js - DSE 介面增強功能（支援備份檔案匯入）
(function(global) {
  'use strict';

  // 依賴 DSEUnitCore
  if (!global.DSEUnitCore) {
    console.error('ui-enhancements 需要 DSEUnitCore');
    return;
  }

  const core = global.DSEUnitCore;

  // ========== 管理對話框 ==========
  let managerModal = null;
  let unitsListContainer = null;

  function createManagerModal() {
    if (document.getElementById('units-manager-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'units-manager-modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 2000;
      justify-content: center;
      align-items: center;
    `;
    modal.innerHTML = `
      <div style="background: white; width: 90%; max-width: 800px; max-height: 80vh; border-radius: 12px; padding: 24px; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-size: 20px; color: #1e293b;"><i class="fas fa-cog"></i> 管理單元</h3>
          <button id="close-manager-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
        </div>
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button id="select-all-units-btn" class="btn btn-outline" style="font-size: 12px;">全選</button>
          <button id="delete-selected-btn" class="btn btn-outline" style="font-size: 12px; color: #dc2626; border-color: #fecaca;">刪除所選</button>
          <button id="export-selected-btn" class="btn btn-outline" style="font-size: 12px;">匯出所選</button>
          <span style="flex:1"></span>
          <button id="import-backup-btn" class="btn btn-outline" style="font-size: 12px;"><i class="fas fa-upload"></i> 匯入備份</button>
          <input type="file" id="import-backup-file" accept="application/json" style="display: none;">
        </div>
        <div id="units-list" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <!-- 動態載入單元列表 -->
        </div>
        <div style="margin-top: 20px; text-align: right;">
          <button id="close-manager-btn-bottom" class="btn" style="background: #4f46e5; color: white;">關閉</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    managerModal = modal;

    const closeBtns = modal.querySelectorAll('#close-manager-btn, #close-manager-btn-bottom');
    closeBtns.forEach(btn => btn.addEventListener('click', closeManagerModal));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeManagerModal();
    });

    document.getElementById('select-all-units-btn').addEventListener('click', selectAllUnits);
    document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedUnits);
    document.getElementById('export-selected-btn').addEventListener('click', exportSelectedUnits);
    document.getElementById('import-backup-btn').addEventListener('click', () => {
      document.getElementById('import-backup-file').click();
    });
    document.getElementById('import-backup-file').addEventListener('change', importBackupFile);

    unitsListContainer = document.getElementById('units-list');
  }

  function openManagerModal() {
    if (!managerModal) createManagerModal();
    refreshUnitsList();
    managerModal.style.display = 'flex';
  }

  function closeManagerModal() {
    if (managerModal) {
      managerModal.style.display = 'none';
      refreshUnitSelect(); // 關閉管理對話框時刷新選單
    }
  }

  function refreshUnitsList() {
    if (!unitsListContainer) return;
    const allUnits = core.getAllUnits();
    const unitEntries = Object.entries(allUnits).sort((a, b) => b[1].timestamp - a[1].timestamp);

    if (unitEntries.length === 0) {
      unitsListContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #94a3b8;">尚無上傳單元</div>';
      return;
    }

    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead style="background: #f1f5f9;"><tr><th style="padding: 10px; width: 40px;"><input type="checkbox" id="check-all-top"></th><th style="padding: 10px; text-align: left;">單元名稱</th><th style="padding: 10px;">分類</th><th style="padding: 10px;">作者</th><th style="padding: 10px;">時代</th><th style="padding: 10px;">難度</th><th style="padding: 10px;">段落</th><th style="padding: 10px;">詞彙</th><th style="padding: 10px;">操作</th></tr></thead>';
    html += '<tbody>';

    unitEntries.forEach(([id, unit]) => {
      html += `<tr data-unit-id="${id}" style="border-bottom: 1px solid #e2e8f0;">`;
      html += `<td style="padding: 10px; text-align: center;"><input type="checkbox" class="unit-checkbox" value="${id}"></td>`;
      html += `<td style="padding: 10px;"><span class="unit-name" data-id="${id}">${unit.name}</span> <button class="edit-unit-name-btn" data-id="${id}" style="border: none; background: none; color: #4f46e5; cursor: pointer;"><i class="fas fa-pencil-alt"></i></button></td>`;
      html += `<td style="padding: 10px;">${unit.metadata?.category || '未分類'}</td>`;
      html += `<td style="padding: 10px;">${unit.metadata?.author || ''}</td>`;
      html += `<td style="padding: 10px;">${unit.metadata?.period || ''}</td>`;
      html += `<td style="padding: 10px;"><span class="difficulty-badge" style="padding: 2px 8px; border-radius: 12px; font-size: 11px; background-color: ${
        unit.metadata?.difficulty === '基礎' ? '#e6f7e6' : 
        unit.metadata?.difficulty === '中階' ? '#fff3e0' : 
        unit.metadata?.difficulty === '進階' ? '#fce4e4' : '#f1f5f9'
      }; color: ${
        unit.metadata?.difficulty === '基礎' ? '#2e7d32' : 
        unit.metadata?.difficulty === '中階' ? '#b85e00' : 
        unit.metadata?.difficulty === '進階' ? '#c62828' : '#475569'
      };">${unit.metadata?.difficulty || '未指定'}</span></td>`;
      html += `<td style="padding: 10px; text-align: center;">${unit.metadata?.paragraphCount || 0}</td>`;
      html += `<td style="padding: 10px; text-align: center;">${unit.metadata?.vocabCount || 0}</td>`;
      html += `<td style="padding: 10px;"><button class="delete-unit-btn" data-id="${id}" style="border: none; background: none; color: #dc2626; cursor: pointer;"><i class="fas fa-trash"></i></button></td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    unitsListContainer.innerHTML = html;

    document.querySelectorAll('.edit-unit-name-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        editUnitName(id);
      });
    });

    document.querySelectorAll('.delete-unit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('確定刪除此單元？')) {
          core.deleteUnit(id);
          refreshUnitsList();
          refreshUnitSelect();
        }
      });
    });

    const checkAllTop = document.getElementById('check-all-top');
    if (checkAllTop) {
      checkAllTop.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.unit-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
      });
    }
  }

  function editUnitName(unitId) {
    const unit = core.getUnit(unitId);
    if (!unit) return;
    const newName = prompt('輸入新的單元名稱', unit.name);
    if (newName && newName.trim() !== '') {
      core.updateUnit(unitId, { name: newName.trim() });
      refreshUnitsList();
      refreshUnitSelect();
    }
  }

  function selectAllUnits(e) {
    const checkboxes = document.querySelectorAll('.unit-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    const selectBtn = document.getElementById('select-all-units-btn');
    selectBtn.innerHTML = allChecked ? '全選' : '取消全選';
  }

  function deleteSelectedUnits() {
    const selected = Array.from(document.querySelectorAll('.unit-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      alert('請至少選擇一個單元');
      return;
    }
    if (confirm(`確定刪除所選的 ${selected.length} 個單元？`)) {
      core.deleteMultipleUnits(selected);
      refreshUnitsList();
      refreshUnitSelect();
    }
  }

  function exportSelectedUnits() {
    const selected = Array.from(document.querySelectorAll('.unit-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      alert('請至少選擇一個單元');
      return;
    }
    const exportData = core.exportSelectedUnits(selected);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dse_units_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackupFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        const count = core.importUnits(backup, { merge: true });
        alert(`成功匯入 ${count} 個單元`);
        refreshUnitsList();
        refreshUnitSelect();
      } catch (ex) {
        alert('匯入失敗：' + ex.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ========== 整合拖放上傳的浮動面板 ==========
  let uploadPanel = null;

  function createUploadPanel() {
    if (document.getElementById('upload-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'upload-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 450px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 15px 30px rgba(0,0,0,0.2);
      z-index: 3000;
      padding: 18px;
      display: none;
    `;
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px; color: #1e293b; font-weight: 600;"><i class="fas fa-upload" style="margin-right: 6px;"></i>上傳單元</h3>
        <button id="close-upload-panel" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; line-height: 1;">&times;</button>
      </div>
      
      <div id="upload-drop-zone" style="
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        padding: 20px 15px;
        text-align: center;
        margin-bottom: 12px;
        background: #f8fafc;
        transition: all 0.2s;
        cursor: pointer;
      ">
        <i class="fas fa-cloud-upload-alt fa-2x" style="color: #4f46e5; margin-bottom: 8px;"></i>
        <p style="color: #475569; font-size: 13px; margin-bottom: 6px;">拖放 JSON 檔案到這裡</p>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">或</p>
        <button id="select-files-btn" class="btn" style="background: #4f46e5; color: white; padding: 6px 12px; font-size: 12px;">
          <i class="fas fa-folder-open" style="font-size: 11px;"></i> 選擇檔案
        </button>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">支援 .json 格式，可多選</p>
      </div>

      <div id="upload-file-list" style="max-height: 180px; overflow-y: auto; margin-bottom: 12px; display: none;">
        <h4 style="font-size: 13px; color: #1e293b; margin-bottom: 8px; font-weight: 500;">已選擇的檔案：</h4>
        <div id="file-items" style="font-size: 12px;"></div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button id="cancel-upload-btn" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;">取消</button>
        <button id="confirm-upload-btn" class="btn" style="background: #4f46e5; color: white; padding: 6px 12px; font-size: 12px;" disabled>
          <i class="fas fa-upload" style="font-size: 11px;"></i> 開始上傳
        </button>
      </div>
    `;

    document.body.appendChild(panel);
    uploadPanel = panel;

    document.getElementById('close-upload-panel').addEventListener('click', closeUploadPanel);
    document.getElementById('cancel-upload-btn').addEventListener('click', closeUploadPanel);

    panel.addEventListener('click', (e) => {
      if (e.target === panel) closeUploadPanel();
    });

    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    panel.appendChild(fileInput);

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.background = '#eef2ff';
      dropZone.style.borderColor = '#4f46e5';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.background = '#f8fafc';
      dropZone.style.borderColor = '#cbd5e1';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.background = '#f8fafc';
      dropZone.style.borderColor = '#cbd5e1';
      
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/json' || f.name.endsWith('.json'));
      if (files.length > 0) {
        handleSelectedFiles(files);
      } else {
        alert('請拖放 JSON 檔案');
      }
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        handleSelectedFiles(files);
      }
      fileInput.value = '';
    });

    document.getElementById('confirm-upload-btn').addEventListener('click', () => {
      if (window.pendingFiles && window.pendingFiles.length > 0) {
        handleMultipleFilesUpload(window.pendingFiles);
        closeUploadPanel();
      }
    });
  }

  let pendingFiles = [];

  function handleSelectedFiles(files) {
    window.pendingFiles = files;
    const fileList = document.getElementById('upload-file-list');
    const fileItems = document.getElementById('file-items');
    const confirmBtn = document.getElementById('confirm-upload-btn');

    let html = '';
    files.forEach(file => {
      const size = (file.size / 1024).toFixed(2);
      html += `
        <div style="display: flex; justify-content: space-between; padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">
            <i class="fas fa-file-code" style="color: #4f46e5; margin-right: 6px; font-size: 11px;"></i>${file.name}
          </span>
          <span style="color: #64748b; font-size: 11px; margin-left: 8px;">${size} KB</span>
        </div>
      `;
    });
    fileItems.innerHTML = html;
    fileList.style.display = 'block';
    confirmBtn.disabled = false;
  }

  function openUploadPanel() {
    if (!uploadPanel) createUploadPanel();
    
    window.pendingFiles = [];
    document.getElementById('upload-file-list').style.display = 'none';
    document.getElementById('confirm-upload-btn').disabled = true;
    
    uploadPanel.style.display = 'block';
  }

  function closeUploadPanel() {
    if (uploadPanel) {
      uploadPanel.style.display = 'none';
    }
  }

function refreshUnitSelect(filteredUnits = null) {
  const select = document.getElementById('unit-select');
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">請選擇課文</option>';

  let unitsToShow = [];
  let hasAnyUnits = false;

  const uploadedUnitsMap = core.getAllUnits();
  const uploadedUnits = Object.entries(uploadedUnitsMap).map(([id, unit]) => ({
    id,
    name: unit.name,
    data: unit.data,
    type: 'upload'
  }));

  // 如果有篩選條件，則只顯示符合條件的單元
  if (filteredUnits && filteredUnits.length > 0) {
    const filteredIds = new Set(filteredUnits.map(u => u.id));
    unitsToShow = uploadedUnits.filter(u => filteredIds.has(u.id));
    
    if (unitsToShow.length > 0) {
      hasAnyUnits = true;
    }
  } 
  // 如果沒有篩選條件，顯示所有單元
  else {
    unitsToShow = [...uploadedUnits];
    if (uploadedUnits.length > 0) {
      hasAnyUnits = true;
    }
  }

  // 如果完全沒有任何單元可顯示
  if (!hasAnyUnits || unitsToShow.length === 0) {
    select.innerHTML = '<option value="">沒有可用的課文</option>';
    return;
  }

  // 依名稱排序
  unitsToShow.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  // 清除重複的 ID
  const seenIds = new Set();
  const uniqueUnitsToShow = unitsToShow.filter(item => {
    if (seenIds.has(item.id)) {
      console.warn('發現重複的單元 ID:', item.id);
      return false;
    }
    seenIds.add(item.id);
    return true;
  });

  uniqueUnitsToShow.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    option.dataset.data = JSON.stringify(item.data);
    select.appendChild(option);
  });

  // 嘗試恢復之前選取的值
  if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
    select.value = currentValue;
  }
}

  // ========== 完整篩選 UI ==========
  function buildCategoryFilters() {
    const container = document.getElementById('filter-container');
    if (!container) return;

    const categories = core.getAllCategories();
    const authors = core.getAllAuthors();
    const periods = core.getAllPeriods ? core.getAllPeriods() : [];
    const difficulties = core.getAllDifficulties ? core.getAllDifficulties() : [];
    const tags = core.getAllTags ? core.getAllTags() : [];

    // 計算符合條件的課文數量
    const updateResultCount = () => {
      const count = document.querySelectorAll('#unit-select option').length - 1; // 減去「請選擇課文」
      let countEl = document.getElementById('filter-result-count');
      if (!countEl) {
        countEl = document.createElement('span');
        countEl.id = 'filter-result-count';
        countEl.style.marginLeft = 'auto';
        countEl.style.fontSize = '12px';
        countEl.style.color = '#64748b';
        document.querySelector('#filter-container > div').appendChild(countEl);
      }
      countEl.textContent = `找到 ${count} 篇課文`;
    };

    let html = `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px;">
        <div style="display: flex; flex-wrap: wrap; gap: 8px; flex: 1;">
          <select id="category-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; min-width: 100px;">
            <option value="">所有分類</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          
          <select id="author-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; min-width: 100px;">
            <option value="">所有作者</option>
            ${authors.map(a => `<option value="${a}">${a}</option>`).join('')}
          </select>
          
          <select id="period-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; min-width: 100px;">
            <option value="">所有時代</option>
            ${periods.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          
          <select id="difficulty-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; min-width: 100px;">
            <option value="">所有難度</option>
            ${difficulties.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
          
          <select id="tag-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; min-width: 120px;">
            <option value="">所有標籤</option>
            ${tags.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        
        <button id="clear-filters" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; white-space: nowrap;">
          <i class="fas fa-times"></i> 清除篩選
        </button>
      </div>
    `;
    
    container.innerHTML = html;

    // 綁定事件
    document.getElementById('category-filter').addEventListener('change', applyFilters);
    document.getElementById('author-filter').addEventListener('change', applyFilters);
    document.getElementById('period-filter').addEventListener('change', applyFilters);
    document.getElementById('difficulty-filter').addEventListener('change', applyFilters);
    document.getElementById('tag-filter').addEventListener('change', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    // 初始化結果數量
    setTimeout(updateResultCount, 100);
  }

  function applyFilters() {
    const category = document.getElementById('category-filter')?.value || '';
    const author = document.getElementById('author-filter')?.value || '';
    const period = document.getElementById('period-filter')?.value || '';
    const difficulty = document.getElementById('difficulty-filter')?.value || '';
    const tag = document.getElementById('tag-filter')?.value || '';

    const criteria = {};
    if (category) criteria.category = category;
    if (author) criteria.author = author;
    if (period) criteria.period = period;
    if (difficulty) criteria.difficulty = difficulty;
    if (tag) criteria.tag = tag;

    const filtered = core.filterUnits(criteria);
    refreshUnitSelect(filtered);

    // 更新結果數量
    const countEl = document.getElementById('filter-result-count');
    if (countEl) {
      countEl.textContent = `找到 ${filtered.length} 篇課文`;
    }
  }

  function clearFilters() {
    document.getElementById('category-filter').value = '';
    document.getElementById('author-filter').value = '';
    document.getElementById('period-filter').value = '';
    document.getElementById('difficulty-filter').value = '';
    document.getElementById('tag-filter').value = '';
    
    refreshUnitSelect();

    const countEl = document.getElementById('filter-result-count');
    if (countEl) {
      const allUnits = core.getAllUnits();
      countEl.textContent = `找到 ${Object.keys(allUnits).length} 篇課文`;
    }
  }

  // ========== 多檔案上傳處理 ==========
  function handleMultipleFilesUpload(files) {
    const select = document.getElementById('unit-select');
    let successCount = 0;
    let errorCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsedData = JSON.parse(ev.target.result);
          
          if (parsedData.units && parsedData.version === '1.0') {
            const unitEntries = Object.entries(parsedData.units);
            unitEntries.forEach(([unitId, unitData]) => {
              if (unitData.data && unitData.data.article && unitData.data.vocabulary) {
                const uniqueName = core.getUniqueUnitName(unitData.name);
                const newUnitId = core.generateUnitId(unitData.name);
                const metadata = core.extractMetadata(unitData.data);
                
                core.addUnit(newUnitId, uniqueName, unitData.data, metadata);
                successCount++;
              } else {
                console.warn('備份檔案中的單元格式錯誤:', unitId);
                errorCount++;
              }
            });
            // ✅ 立即更新下拉選單
            refreshUnitSelect();
          } 
          else if (parsedData.article && parsedData.vocabulary) {
            const baseName = parsedData.unitName || file.name.replace('.json', '');
            const uniqueName = core.getUniqueUnitName(baseName);
            const unitId = core.generateUnitId(baseName);
            const metadata = core.extractMetadata(parsedData);

            core.addUnit(unitId, uniqueName, parsedData, metadata);
            successCount++;
            // ✅ 立即更新下拉選單
            refreshUnitSelect();
          }
          else {
            throw new Error('無法識別的檔案格式：缺少 article/vocabulary 或不是有效的備份檔');
          }

          if (successCount + errorCount === files.length) {
            const message = `處理完成：${successCount} 個成功，${errorCount} 個失敗`;
            console.log(message);
            alert(message);
            
            // 如果只有一個檔案且成功，自動選取
            if (files.length === 1 && successCount === 1) {
              const allUnits = core.getAllUnits();
              const latestUnitId = Object.keys(allUnits).sort((a, b) => allUnits[b].timestamp - allUnits[a].timestamp)[0];
              if (latestUnitId) {
                select.value = latestUnitId;
                select.dispatchEvent(new Event('change'));
              }
            }
            
            // 更新篩選選單
            buildCategoryFilters();
          }
        } catch (ex) {
          errorCount++;
          console.error(`解析檔案 ${file.name} 失敗：`, ex);
          alert(`解析檔案 ${file.name} 失敗：${ex.message}`);
          
          if (successCount + errorCount === files.length) {
            alert(`處理完成：${successCount} 個成功，${errorCount} 個失敗`);
            refreshUnitSelect();
          }
        }
      };
      
      reader.onerror = () => {
        errorCount++;
        console.error(`讀取檔案 ${file.name} 失敗`);
        if (successCount + errorCount === files.length) {
          alert(`處理完成：${successCount} 個成功，${errorCount} 個失敗`);
        }
      };
      
      reader.readAsText(file);
    });
  }
  // ========== 初始化 ==========
  function initUI() {
    const controlBar = document.querySelector('.unit-control-bar .unit-selector-wrapper');
    if (controlBar) {
      const uploadBtn = document.querySelector('.upload-btn');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openUploadPanel();
        });
      }

      const manageBtn = document.createElement('button');
      manageBtn.className = 'btn btn-outline';
      manageBtn.id = 'manage-units-btn';
      manageBtn.innerHTML = '<i class="fas fa-cog"></i> 管理';
      manageBtn.addEventListener('click', openManagerModal);
      controlBar.appendChild(manageBtn);
    }

    const filterContainer = document.createElement('div');
    filterContainer.id = 'filter-container';
    const controlBarParent = document.querySelector('.unit-control-bar');
    controlBarParent.parentNode.insertBefore(filterContainer, controlBarParent.nextSibling);

    buildCategoryFilters();

    const originalUpload = document.getElementById('unit-upload');
    if (originalUpload) {
      originalUpload.style.display = 'none';
    }

    refreshUnitSelect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  global.DSEUIEnhancements = {
    refreshUnitSelect,
    openManagerModal,
    closeManagerModal,
    openUploadPanel,
    closeUploadPanel,
    applyFilters,
    clearFilters
  };
})(window);