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
    html += '<thead style="background: #f1f5f9;"><tr><th style="padding: 10px; width: 40px;"><input type="checkbox" id="check-all-top"></th><th style="padding: 10px; text-align: left;">單元名稱</th><th style="padding: 10px;">分類</th><th style="padding: 10px;">作者</th><th style="padding: 10px;">段落</th><th style="padding: 10px;">詞彙</th><th style="padding: 10px;">操作</th></tr></thead>';
    html += '<tbody>';

    unitEntries.forEach(([id, unit]) => {
      html += `<tr data-unit-id="${id}" style="border-bottom: 1px solid #e2e8f0;">`;
      html += `<td style="padding: 10px; text-align: center;"><input type="checkbox" class="unit-checkbox" value="${id}"></td>`;
      html += `<td style="padding: 10px;"><span class="unit-name" data-id="${id}">${unit.name}</span> <button class="edit-unit-name-btn" data-id="${id}" style="border: none; background: none; color: #4f46e5; cursor: pointer;"><i class="fas fa-pencil-alt"></i></button></td>`;
      html += `<td style="padding: 10px;">${unit.metadata?.category || '未分類'}</td>`;
      html += `<td style="padding: 10px;">${unit.metadata?.author || ''}</td>`;
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
      max-width: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 3000;
      padding: 24px;
      display: none;
    `;
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="font-size: 20px; color: #1e293b;"><i class="fas fa-upload"></i> 上傳單元</h3>
        <button id="close-upload-panel" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
      </div>
      
      <!-- 拖放區域 -->
      <div id="upload-drop-zone" style="
        border: 3px dashed #cbd5e1;
        border-radius: 12px;
        padding: 40px 20px;
        text-align: center;
        margin-bottom: 20px;
        background: #f8fafc;
        transition: all 0.2s;
        cursor: pointer;
      ">
        <i class="fas fa-cloud-upload-alt fa-3x" style="color: #4f46e5; margin-bottom: 15px;"></i>
        <p style="color: #475569; margin-bottom: 10px;">拖放 JSON 檔案到這裡</p>
        <p style="color: #94a3b8; font-size: 14px;">或</p>
        <button id="select-files-btn" class="btn" style="background: #4f46e5; color: white; margin-top: 10px; padding: 10px 20px;">
          <i class="fas fa-folder-open"></i> 點擊選擇檔案
        </button>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 15px;">支援 .json 格式，可多選</p>
      </div>

      <!-- 檔案列表 -->
      <div id="upload-file-list" style="max-height: 200px; overflow-y: auto; margin-top: 10px; display: none;">
        <h4 style="font-size: 14px; color: #1e293b; margin-bottom: 10px;">已選擇的檔案：</h4>
        <div id="file-items"></div>
      </div>

      <!-- 上傳按鈕 -->
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
        <button id="cancel-upload-btn" class="btn btn-outline">取消</button>
        <button id="confirm-upload-btn" class="btn" style="background: #4f46e5; color: white;" disabled>
          <i class="fas fa-upload"></i> 開始上傳
        </button>
      </div>
    `;

    document.body.appendChild(panel);
    uploadPanel = panel;

    // 關閉按鈕
    document.getElementById('close-upload-panel').addEventListener('click', closeUploadPanel);
    document.getElementById('cancel-upload-btn').addEventListener('click', closeUploadPanel);

    // 點擊背景關閉
    panel.addEventListener('click', (e) => {
      if (e.target === panel) closeUploadPanel();
    });

    // 拖放區域點擊選擇檔案
    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    panel.appendChild(fileInput);

    dropZone.addEventListener('click', () => fileInput.click());

    // 拖放事件
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

    // 檔案選擇事件
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        handleSelectedFiles(files);
      }
      fileInput.value = ''; // 清除，允許重新選擇相同檔案
    });

    // 確認上傳按鈕
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

    // 顯示檔案列表
    let html = '';
    files.forEach(file => {
      const size = (file.size / 1024).toFixed(2);
      html += `
        <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e2e8f0;">
          <span><i class="fas fa-file-code" style="color: #4f46e5; margin-right: 8px;"></i>${file.name}</span>
          <span style="color: #64748b; font-size: 12px;">${size} KB</span>
        </div>
      `;
    });
    fileItems.innerHTML = html;
    fileList.style.display = 'block';
    confirmBtn.disabled = false;
  }

  function openUploadPanel() {
    if (!uploadPanel) createUploadPanel();
    
    // 重置狀態
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

  // ========== 下拉選單與分類篩選 ==========
  function refreshUnitSelect(filteredUnits = null) {
    const select = document.getElementById('unit-select');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">請選擇課文</option>';

    let unitsToShow = [];
    let hasAnyUnits = false;

    // 1. 加入上傳的單元（來自 localStorage）- 這是唯一顯示的單元
    const uploadedUnitsMap = core.getAllUnits();
    const uploadedUnits = Object.entries(uploadedUnitsMap).map(([id, unit]) => ({
      id,
      name: unit.name,
      data: unit.data,
      type: 'upload'
    }));
    
    if (uploadedUnits.length > 0) {
      unitsToShow.push(...uploadedUnits);
      hasAnyUnits = true;
    }

    // 2. 若有篩選條件，則過濾
    if (filteredUnits && filteredUnits.length > 0) {
      const filteredIds = new Set(filteredUnits.map(u => u.id));
      unitsToShow = uploadedUnits.filter(u => filteredIds.has(u.id));
      
      if (unitsToShow.length > 0) {
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

    // 清除重複的 ID（防止意外情況）
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

  function buildCategoryFilters() {
    const container = document.getElementById('filter-container');
    if (!container) return;

    const categories = core.getAllCategories();
    const authors = core.getAllAuthors();
    const tags = core.getAllTags();

    let html = `
      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
        <input type="text" id="search-input" placeholder="搜尋單元名稱或作者..." style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; flex: 1; min-width: 200px;">
        <select id="category-filter" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <option value="">所有分類</option>
          ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <select id="author-filter" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <option value="">所有作者</option>
          ${authors.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
        <select id="tag-filter" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <option value="">所有標籤</option>
          ${tags.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <button id="clear-filters" class="btn btn-outline" style="padding: 8px 12px;">清除篩選</button>
      </div>
    `;
    container.innerHTML = html;

    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('category-filter').addEventListener('change', applyFilters);
    document.getElementById('author-filter').addEventListener('change', applyFilters);
    document.getElementById('tag-filter').addEventListener('change', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
  }

  function applyFilters() {
    const searchText = document.getElementById('search-input')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';
    const author = document.getElementById('author-filter')?.value || '';
    const tag = document.getElementById('tag-filter')?.value || '';

    const criteria = {};
    if (searchText) criteria.searchText = searchText;
    if (category) criteria.category = category;
    if (author) criteria.author = author;
    if (tag) criteria.tag = tag;

    const filtered = core.filterUnits(criteria);
    refreshUnitSelect(filtered);
  }

  function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('author-filter').value = '';
    document.getElementById('tag-filter').value = '';
    refreshUnitSelect();
  }

  // ========== 多檔案上處理（支援備份檔案） ==========
  function handleMultipleFilesUpload(files) {
    const select = document.getElementById('unit-select');
    let successCount = 0;
    let errorCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsedData = JSON.parse(ev.target.result);
          
          // 情況1：備份檔案格式（有 units 欄位）
          if (parsedData.units && parsedData.version === '1.0') {
            // 這是備份檔案，處理其中的每個單元
            const unitEntries = Object.entries(parsedData.units);
            unitEntries.forEach(([unitId, unitData]) => {
              // 檢查是否有 data 欄位且包含 article 和 vocabulary
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
          } 
          // 情況2：單一課文檔案格式（直接有 article 和 vocabulary）
          else if (parsedData.article && parsedData.vocabulary) {
            const baseName = parsedData.unitName || file.name.replace('.json', '');
            const uniqueName = core.getUniqueUnitName(baseName);
            const unitId = core.generateUnitId(baseName);
            const metadata = core.extractMetadata(parsedData);

            core.addUnit(unitId, uniqueName, parsedData, metadata);
            successCount++;
          }
          // 情況3：未知格式
          else {
            throw new Error('無法識別的檔案格式：缺少 article/vocabulary 或不是有效的備份檔');
          }

          // 所有檔案處理完成後顯示結果
          if (successCount + errorCount === files.length) {
            const message = `處理完成：${successCount} 個成功，${errorCount} 個失敗`;
            console.log(message);
            alert(message);
            
            refreshUnitSelect();
            
            // 如果只有一個檔案且成功，自動選取
            if (files.length === 1 && successCount === 1) {
              // 找出最新加入的單元（最後一個）
              const allUnits = core.getAllUnits();
              const latestUnitId = Object.keys(allUnits).sort((a, b) => allUnits[b].timestamp - allUnits[a].timestamp)[0];
              if (latestUnitId) {
                select.value = latestUnitId;
                select.dispatchEvent(new Event('change'));
              }
            }
          }
        } catch (ex) {
          errorCount++;
          console.error(`解析檔案 ${file.name} 失敗：`, ex);
          alert(`解析檔案 ${file.name} 失敗：${ex.message}`);
          
          // 仍然檢查是否所有檔案都處理完
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
      // 修改上傳按鈕行為
      const uploadBtn = document.querySelector('.upload-btn');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openUploadPanel();
        });
      }

      // 加入管理按鈕
      const manageBtn = document.createElement('button');
      manageBtn.className = 'btn btn-outline';
      manageBtn.id = 'manage-units-btn';
      manageBtn.innerHTML = '<i class="fas fa-cog"></i> 管理';
      manageBtn.addEventListener('click', openManagerModal);
      controlBar.appendChild(manageBtn);
    }

    const filterContainer = document.createElement('div');
    filterContainer.id = 'filter-container';
    filterContainer.style.marginBottom = '15px';
    const controlBarParent = document.querySelector('.unit-control-bar');
    controlBarParent.parentNode.insertBefore(filterContainer, controlBarParent.nextSibling);

    buildCategoryFilters();

    // 隱藏原本的檔案輸入
    const originalUpload = document.getElementById('unit-upload');
    if (originalUpload) {
      originalUpload.style.display = 'none';
    }

    refreshUnitSelect();

    document.getElementById('unit-select').addEventListener('change', function(e) {
      const selectedId = e.target.value;
      if (selectedId) {
        const unit = core.getUnit(selectedId);
        // 不再更新預覽卡片
      }
    });
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
    closeUploadPanel
  };
})(window);