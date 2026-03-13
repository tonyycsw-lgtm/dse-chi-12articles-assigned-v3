//此檔案負責管理對話框、分類篩選、單元預覽、拖放上傳等 UI 互動，依賴於 DSEUnitCore。
// ui-enhancements.js - DSE 介面增強功能
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
    if (managerModal) managerModal.style.display = 'none';
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

  // ========== 下拉選單與分類篩選 ==========
  function refreshUnitSelect(filteredUnits = null) {
    const select = document.getElementById('unit-select');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">請選擇課文</option>';

    let unitsToShow;
    if (filteredUnits) {
      unitsToShow = filteredUnits;
    } else {
      unitsToShow = Object.entries(core.getAllUnits()).map(([id, unit]) => ({ id, ...unit }));
    }

    unitsToShow.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

    unitsToShow.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      option.dataset.data = JSON.stringify(item.data);
      select.appendChild(option);
    });

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
    updatePreviewWithFirstUnit(filtered.length > 0 ? filtered[0] : null);
  }

  function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('author-filter').value = '';
    document.getElementById('tag-filter').value = '';
    refreshUnitSelect();
    updatePreviewWithFirstUnit(null);
  }

  // ========== 單元預覽卡片 ==========
  function createPreviewCard() {
    if (document.getElementById('unit-preview')) return;
    const preview = document.createElement('div');
    preview.id = 'unit-preview';
    preview.style.cssText = `
      margin-bottom: 20px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: none;
    `;
    preview.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; font-size: 16px; color: #1e293b;">當前單元預覽</h4>
        <button id="close-preview" style="border: none; background: none; font-size: 18px; cursor: pointer;">&times;</button>
      </div>
      <div id="preview-content" style="display: flex; gap: 20px; margin-top: 10px;">
        <div style="flex: 1;">
          <div><strong>名稱：</strong> <span id="preview-name"></span></div>
          <div><strong>作者：</strong> <span id="preview-author"></span></div>
          <div><strong>分類：</strong> <span id="preview-category"></span></div>
          <div><strong>段落數：</strong> <span id="preview-paragraphs"></span></div>
          <div><strong>詞彙數：</strong> <span id="preview-vocab"></span></div>
        </div>
        <div style="flex: 2;">
          <div><strong>文章開頭：</strong></div>
          <div id="preview-excerpt" style="background: white; padding: 10px; border-radius: 4px; font-size: 12px; color: #475569; max-height: 80px; overflow-y: auto;"></div>
        </div>
      </div>
    `;
    const a4Container = document.querySelector('.a4-container');
    a4Container.parentNode.insertBefore(preview, a4Container);

    document.getElementById('close-preview').addEventListener('click', () => {
      preview.style.display = 'none';
    });
  }

  function updatePreviewWithFirstUnit(unit) {
    const preview = document.getElementById('unit-preview');
    if (!preview) return;
    if (!unit) {
      preview.style.display = 'none';
      return;
    }
    const fullUnit = core.getUnit(unit.id);
    if (!fullUnit) return;

    document.getElementById('preview-name').textContent = fullUnit.name;
    document.getElementById('preview-author').textContent = fullUnit.metadata?.author || '';
    document.getElementById('preview-category').textContent = fullUnit.metadata?.category || '';
    document.getElementById('preview-paragraphs').textContent = fullUnit.metadata?.paragraphCount || 0;
    document.getElementById('preview-vocab').textContent = fullUnit.metadata?.vocabCount || 0;

    const firstPara = fullUnit.data?.article?.paragraphs[0]?.slices.map(s => s.text).join('') || '';
    const excerpt = firstPara.substring(0, 50) + (firstPara.length > 50 ? '...' : '');
    document.getElementById('preview-excerpt').textContent = excerpt;

    preview.style.display = 'block';
  }

  // ========== 拖放上傳 ==========
  function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.background = '#eef2ff';
      dropZone.style.borderColor = '#4f46e5';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.background = '';
      dropZone.style.borderColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.background = '';
      dropZone.style.borderColor = '';

      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/json' || f.name.endsWith('.json'));
      if (files.length === 0) {
        alert('請拖放 JSON 檔案');
        return;
      }

      handleMultipleFilesUpload(files);
    });
  }

  function handleMultipleFilesUpload(files) {
    const select = document.getElementById('unit-select');
    let successCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.article || !data.vocabulary) {
            throw new Error('缺少 article 或 vocabulary');
          }

          const baseName = data.unitName || file.name.replace('.json', '');
          const uniqueName = core.getUniqueUnitName(baseName);
          const unitId = core.generateUnitId(baseName);
          const metadata = core.extractMetadata(data);

          core.addUnit(unitId, uniqueName, data, metadata);

          successCount++;
          if (successCount === files.length) {
            alert(`成功上傳 ${successCount} 個單元`);
            refreshUnitSelect();
            if (files.length === 1) {
              select.value = unitId;
              select.dispatchEvent(new Event('change'));
            }
          }
        } catch (ex) {
          alert(`解析檔案 ${file.name} 失敗：${ex.message}`);
        }
      };
      reader.readAsText(file);
    });
  }

  // ========== 初始化 ==========
  function initUI() {
    const controlBar = document.querySelector('.unit-control-bar .unit-selector-wrapper');
    if (controlBar) {
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
    createPreviewCard();

    const dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    dropZone.style.cssText = `
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
      color: #64748b;
      transition: all 0.2s;
    `;
    dropZone.innerHTML = `
      <i class="fas fa-cloud-upload-alt fa-2x" style="color: #4f46e5;"></i>
      <p>拖放 JSON 檔案到這裡，或 <a href="#" onclick="document.getElementById('unit-upload').click()">點擊選擇</a></p>
    `;
    controlBarParent.parentNode.insertBefore(dropZone, controlBarParent);

    setupDragAndDrop();

    const uploadInput = document.getElementById('unit-upload');
    if (uploadInput) {
      const newUploadInput = uploadInput.cloneNode(true);
      uploadInput.parentNode.replaceChild(newUploadInput, uploadInput);
      newUploadInput.setAttribute('multiple', 'multiple');
      newUploadInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          handleMultipleFilesUpload(files);
        }
        e.target.value = '';
      });
    }

    refreshUnitSelect();

    document.getElementById('unit-select').addEventListener('change', function(e) {
      const selectedId = e.target.value;
      if (selectedId) {
        const unit = core.getUnit(selectedId);
        if (unit) {
          updatePreviewWithFirstUnit({ id: selectedId });
        }
      } else {
        document.getElementById('unit-preview').style.display = 'none';
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
    closeManagerModal
  };
})(window);