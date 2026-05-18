const DragDrop = (function() {
    let onFieldDropCallback = null;
    let onFieldRemoveCallback = null;
    let draggedField = null;

    function init(callbacks) {
        onFieldDropCallback = callbacks.onFieldDrop;
        onFieldRemoveCallback = callbacks.onFieldRemove;
        
        setupDropZones();
    }

    function createFieldItem(field, type) {
        const div = document.createElement('div');
        div.className = 'field-item';
        div.draggable = true;
        div.dataset.field = field;
        div.dataset.type = type;
        
        const typeLabel = getTypeLabel(type);
        
        div.innerHTML = `
            <span class="field-name">${escapeHtml(field)}</span>
            <span class="field-type ${type}">${typeLabel}</span>
        `;
        
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        
        return div;
    }

    function getTypeLabel(type) {
        switch (type) {
            case 'number': return '数字';
            case 'date': return '日期';
            case 'string': return '文本';
            default: return '文本';
        }
    }

    function setupDropZones() {
        const dropZones = document.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
            zone.addEventListener('click', handleZoneClick);
        });
    }

    function handleZoneClick(e) {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            e.stopPropagation();
            e.preventDefault();
            const droppedField = removeBtn.closest('.dropped-field');
            if (droppedField && onFieldRemoveCallback) {
                const field = droppedField.dataset.field;
                const zone = droppedField.dataset.zone;
                onFieldRemoveCallback(field, zone);
            }
        }
    }

    function handleDragStart(e) {
        draggedField = {
            field: e.currentTarget.dataset.field,
            type: e.currentTarget.dataset.type
        };
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        draggedField = null;
        
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (draggedField && onFieldDropCallback) {
            const zone = e.currentTarget.dataset.zone;
            onFieldDropCallback(draggedField.field, draggedField.type, zone);
        }
    }

    function renderZoneFields(zone, fields, columnTypes) {
        const zoneEl = document.getElementById(`${zone}-zone`);
        const placeholder = zoneEl.querySelector('p');
        
        if (fields.length === 0) {
            if (placeholder) placeholder.style.display = 'block';
            zoneEl.querySelectorAll('.dropped-field').forEach(el => el.remove());
            return;
        }
        
        if (placeholder) placeholder.style.display = 'none';
        zoneEl.querySelectorAll('.dropped-field').forEach(el => el.remove());
        
        fields.forEach(field => {
            const fieldEl = createDroppedField(field, zone, columnTypes[field]);
            zoneEl.appendChild(fieldEl);
        });
    }

    function createDroppedField(field, zone, type) {
        const div = document.createElement('div');
        div.className = 'dropped-field';
        div.dataset.field = field;
        div.dataset.zone = zone;
        
        const bgColor = zone === 'rows' ? 'bg-amber-100 text-amber-800' :
                       zone === 'columns' ? 'bg-emerald-100 text-emerald-800' :
                       'bg-blue-100 text-blue-800';
        
        div.innerHTML = `
            <span class="${bgColor} px-2 py-1 rounded text-xs font-medium">${escapeHtml(field)}</span>
            <button class="remove-btn" type="button" title="移除">×</button>
        `;
        
        return div;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        createFieldItem,
        renderZoneFields
    };
})();
