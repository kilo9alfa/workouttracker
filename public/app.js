// Workout Tracker SPA
(function () {
  'use strict';

  const API = '/workout/api';
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let exerciseTypes = [];
  let workoutsCache = {}; // keyed by 'YYYY-MM-DD'
  let selectedDate = null;
  let selectedTypeId = null;
  let editingWorkoutId = null;

  // --- Helpers ---

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAY_NAMES[getISODay(d)]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  }

  // 0=Mon, 6=Sun
  function getISODay(date) {
    return (date.getDay() + 6) % 7;
  }

  function getMonday(date) {
    const d = new Date(date);
    const day = getISODay(d);
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function dateToStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  // --- API ---

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API error');
    }
    return res.json();
  }

  async function loadExerciseTypes() {
    exerciseTypes = await api('/exercise-types');
  }

  async function loadWorkouts(from, to) {
    const data = await api(`/workouts?from=${from}&to=${to}`);
    data.forEach((w) => {
      if (!workoutsCache[w.date]) workoutsCache[w.date] = [];
      // Avoid duplicates on reload
      if (!workoutsCache[w.date].find((x) => x.id === w.id)) {
        workoutsCache[w.date].push(w);
      }
    });
    return data;
  }

  // --- Render Weeks ---

  function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  function renderWeeks() {
    const container = document.getElementById('weeks-container');
    const today = new Date();
    const thisMonday = getMonday(today);

    // Show 4 weeks back + current week + 1 week ahead
    const weeks = [];
    for (let i = -4; i <= 1; i++) {
      weeks.push(addDays(thisMonday, i * 7));
    }

    let html = '';

    weeks.forEach((monday, weekIdx) => {
      const sunday = addDays(monday, 6);
      const isCurrentWeek = dateToStr(monday) === dateToStr(thisMonday);
      const wn = getISOWeekNumber(monday);
      const weekLabel = `${monday.getFullYear()}.W${String(wn).padStart(2, '0')}`;
      const dateRange = `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()}–${MONTH_NAMES[sunday.getMonth()]} ${sunday.getDate()}`;

      // Calculate week total
      let weekTotal = 0;
      for (let d = 0; d < 7; d++) {
        const ds = dateToStr(addDays(monday, d));
        (workoutsCache[ds] || []).forEach((w) => (weekTotal += w.duration_minutes));
      }

      html += `<div class="week-row${isCurrentWeek ? ' current-week' : ''}">`;

      // Top bar: week label left, total right
      html += '<div class="week-top">';
      html += `<div class="week-info">${weekLabel} <span class="week-dates">${dateRange}</span></div>`;
      html += `<div class="week-total">${weekTotal > 0 ? weekTotal + 'm' : '0m'}</div>`;
      html += '</div>';

      // Day cells
      html += '<div class="week-grid">';

      for (let d = 0; d < 7; d++) {
        const cellDate = addDays(monday, d);
        const ds = dateToStr(cellDate);
        const dayWorkouts = workoutsCache[ds] || [];
        const isToday = ds === todayStr();
        const isFuture = cellDate > today;

        let cellClass = 'day-cell';
        if (isToday) cellClass += ' today';
        if (isFuture) cellClass += ' future';
        if (dayWorkouts.length > 0) cellClass += ' has-workout';

        // Fill with workout color
        let cellStyle = '';
        if (dayWorkouts.length === 1) {
          cellStyle = `background:${dayWorkouts[0].exercise_type_color}`;
        } else if (dayWorkouts.length > 1) {
          const stops = dayWorkouts.map((w, i) => {
            const pct1 = (i / dayWorkouts.length * 100).toFixed(0);
            const pct2 = ((i + 1) / dayWorkouts.length * 100).toFixed(0);
            return `${w.exercise_type_color} ${pct1}%, ${w.exercise_type_color} ${pct2}%`;
          }).join(', ');
          cellStyle = `background:linear-gradient(135deg, ${stops})`;
        }

        html += `<div class="${cellClass}" data-date="${ds}" style="${cellStyle}">`;
        html += `<span class="day-name">${DAY_NAMES[d]}</span>`;

        if (dayWorkouts.length === 1) {
          html += `<span class="day-workout-duration">${dayWorkouts[0].duration_minutes}m</span>`;
        } else if (dayWorkouts.length > 1) {
          html += '<div class="day-workout-stack">';
          dayWorkouts.forEach((w) => {
            html += `<span class="day-workout-duration">${w.duration_minutes}m</span>`;
          });
          html += '</div>';
        }

        html += '</div>';
      }

      html += '</div></div>';
    });

    container.innerHTML = html;

    // Scroll to current week
    requestAnimationFrame(() => {
      const current = container.querySelector('.week-row.current-week');
      if (current) {
        current.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });

    // Attach click handlers
    container.querySelectorAll('.day-cell').forEach((cell) => {
      cell.addEventListener('click', () => openSheet(cell.dataset.date));
    });

    updateSummary();
  }

  function updateSummary() {
    const today = new Date();
    const monday = getMonday(today);
    let total = 0;
    const byType = {};

    for (let d = 0; d < 7; d++) {
      const ds = dateToStr(addDays(monday, d));
      (workoutsCache[ds] || []).forEach((w) => {
        total += w.duration_minutes;
        const key = w.exercise_type_name || 'Unknown';
        if (!byType[key]) byType[key] = { minutes: 0, color: w.exercise_type_color };
        byType[key].minutes += w.duration_minutes;
      });
    }

    document.getElementById('week-total').textContent = total;

    // Legend: show all exercise types as color legend
    const typesEl = document.getElementById('summary-types');
    typesEl.innerHTML = exerciseTypes
      .map(
        (t) => `<div class="summary-chip"><span class="dot" style="background:${t.color}"></span>${t.name}</div>`
      )
      .join('');
  }

  // --- Bottom Sheet ---

  function openSheet(dateStr) {
    selectedDate = dateStr;
    selectedTypeId = null;
    editingWorkoutId = null;

    document.getElementById('sheet-title').textContent = 'Log Workout';
    document.getElementById('sheet-date').textContent = formatDate(dateStr);
    // Default to first type's default duration, or 60
    const firstWithDefault = exerciseTypes.find((t) => t.default_duration_minutes);
    document.getElementById('duration').value = firstWithDefault ? firstWithDefault.default_duration_minutes : 60;
    document.getElementById('notes').value = '';

    renderExistingWorkouts(dateStr);
    renderTypeChips();

    document.getElementById('sheet-overlay').classList.remove('hidden');
  }

  function closeSheet() {
    document.getElementById('sheet-overlay').classList.add('hidden');
    selectedDate = null;
    selectedTypeId = null;
    editingWorkoutId = null;
  }

  function renderExistingWorkouts(dateStr) {
    const el = document.getElementById('existing-workouts');
    const workouts = workoutsCache[dateStr] || [];

    if (workouts.length === 0) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = workouts
      .map(
        (w) => `
      <div class="existing-workout" data-id="${w.id}">
        <div class="ew-info">
          <span class="ew-dot" style="background:${w.exercise_type_color}"></span>
          <span class="ew-name">${w.exercise_type_name}</span>
          <span class="ew-duration">${w.duration_minutes}′</span>
        </div>
        <button class="ew-delete" data-id="${w.id}" aria-label="Delete">✕</button>
      </div>
    `
      )
      .join('');

    el.querySelectorAll('.ew-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await api(`/workouts/${id}`, { method: 'DELETE' });
        // Remove from cache
        workoutsCache[dateStr] = (workoutsCache[dateStr] || []).filter((w) => w.id !== id);
        renderExistingWorkouts(dateStr);
        renderWeeks();
      });
    });
  }

  function renderTypeChips() {
    const el = document.getElementById('type-chips');
    if (exerciseTypes.length === 0) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:14px">No exercise types yet. Add some in Settings.</span>';
      return;
    }

    el.innerHTML = exerciseTypes
      .map(
        (t) => `
      <div class="type-chip${selectedTypeId === t.id ? ' selected' : ''}"
           data-id="${t.id}"
           style="background:${t.color}33; color:${t.color}">
        ${t.name}${t.default_duration_minutes ? ` <span style="opacity:0.7">${t.default_duration_minutes}′</span>` : ''}
      </div>
    `
      )
      .join('');

    el.querySelectorAll('.type-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        selectedTypeId = parseInt(chip.dataset.id);
        // Auto-fill duration from type default
        const type = exerciseTypes.find((t) => t.id === selectedTypeId);
        if (type && type.default_duration_minutes) {
          document.getElementById('duration').value = type.default_duration_minutes;
        }
        renderTypeChips();
      });
    });
  }

  async function saveWorkout() {
    if (!selectedTypeId) {
      // Flash the type picker to hint the user
      document.getElementById('type-picker').style.outline = '2px solid var(--danger)';
      setTimeout(() => { document.getElementById('type-picker').style.outline = ''; }, 1000);
      return;
    }
    const duration = parseInt(document.getElementById('duration').value);
    if (!duration || duration < 1) return;

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = {
        exercise_type_id: selectedTypeId,
        date: selectedDate,
        duration_minutes: duration,
        notes: document.getElementById('notes').value.trim() || undefined,
      };

      const saved = await api('/workouts', { method: 'POST', body: JSON.stringify(data) });

      // Add to cache with type info
      const type = exerciseTypes.find((t) => t.id === selectedTypeId);
      saved.exercise_type_name = type ? type.name : 'Unknown';
      saved.exercise_type_color = type ? type.color : '#888';

      if (!workoutsCache[selectedDate]) workoutsCache[selectedDate] = [];
      workoutsCache[selectedDate].push(saved);

      closeSheet();
      renderWeeks();
    } catch (e) {
      console.error('Save failed:', e);
      saveBtn.textContent = 'Error — retry';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }

  // --- Settings ---

  function openSettings() {
    document.getElementById('settings-overlay').classList.remove('hidden');
    renderTypesList();
  }

  function closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
  }

  // --- Drag & Drop Reorder (touch + mouse) ---

  function initDragReorder(container) {
    let dragEl = null;
    let placeholder = null;
    let startY = 0;
    let offsetY = 0;
    let items = [];

    function getY(e) {
      return e.touches ? e.touches[0].clientY : e.clientY;
    }

    function onStart(e) {
      const handle = e.target.closest('.ti-drag-handle');
      if (!handle) return;
      dragEl = handle.closest('.type-item');
      if (!dragEl) return;

      e.preventDefault();
      startY = getY(e);
      const rect = dragEl.getBoundingClientRect();
      offsetY = startY - rect.top;

      // Create placeholder
      placeholder = document.createElement('div');
      placeholder.className = 'type-item ti-placeholder';
      placeholder.style.height = rect.height + 'px';
      dragEl.parentNode.insertBefore(placeholder, dragEl);

      // Float the dragged element
      dragEl.classList.add('ti-dragging');
      dragEl.style.width = rect.width + 'px';
      dragEl.style.top = rect.top + 'px';
      dragEl.style.left = rect.left + 'px';

      items = Array.from(container.querySelectorAll('.type-item:not(.ti-dragging):not(.ti-placeholder)'));

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    }

    function onMove(e) {
      if (!dragEl) return;
      e.preventDefault();
      const y = getY(e);
      dragEl.style.top = (y - offsetY) + 'px';

      // Find which item we're over
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (y < mid) {
          container.insertBefore(placeholder, item);
          return;
        }
      }
      // Past last item
      container.appendChild(placeholder);
    }

    function onEnd() {
      if (!dragEl) return;
      // Insert dragged element where placeholder is
      container.insertBefore(dragEl, placeholder);
      dragEl.classList.remove('ti-dragging');
      dragEl.style.width = '';
      dragEl.style.top = '';
      dragEl.style.left = '';
      placeholder.remove();

      // Read new order from DOM
      const newOrder = Array.from(container.querySelectorAll('.type-item'))
        .map((el) => parseInt(el.dataset.id));

      // Reorder exerciseTypes array to match
      const byId = {};
      exerciseTypes.forEach((t) => { byId[t.id] = t; });
      exerciseTypes = newOrder.map((id) => byId[id]).filter(Boolean);

      // Persist sort_order to API
      const updates = exerciseTypes.map((t, i) => {
        t.sort_order = i;
        return api(`/exercise-types/${t.id}`, { method: 'PUT', body: JSON.stringify({ sort_order: i }) });
      });
      Promise.all(updates).catch((err) => console.error('Reorder save failed:', err));

      dragEl = null;
      placeholder = null;

      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }

    container.addEventListener('mousedown', onStart);
    container.addEventListener('touchstart', onStart, { passive: false });
  }

  function renderTypesList() {
    const el = document.getElementById('types-list');
    if (exerciseTypes.length === 0) {
      el.innerHTML = '<div class="loading">No exercise types yet. Add one below.</div>';
      return;
    }

    el.innerHTML = exerciseTypes
      .map(
        (t) => `
      <div class="type-item" draggable="true" data-id="${t.id}">
        <div class="ti-drag-handle">⠿</div>
        <div class="ti-info">
          <span class="ti-swatch" style="background:${t.color}"></span>
          <span class="ti-name">${t.name}</span>
        </div>
        <div class="ti-actions">
          <input type="number" class="ti-dur-input" data-id="${t.id}"
            value="${t.default_duration_minutes || ''}" placeholder="min"
            min="1" max="300" inputmode="numeric">
          <button class="ti-delete" data-id="${t.id}" aria-label="Delete">✕</button>
        </div>
      </div>
    `
      )
      .join('');

    // Drag and drop reorder (works with both mouse and touch)
    initDragReorder(el);

    el.querySelectorAll('.ti-dur-input').forEach((input) => {
      input.addEventListener('change', async () => {
        const id = parseInt(input.dataset.id);
        const val = input.value ? parseInt(input.value) : null;
        await api(`/exercise-types/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ default_duration_minutes: val }),
        });
        const type = exerciseTypes.find((t) => t.id === id);
        if (type) type.default_duration_minutes = val;
      });
    });

    el.querySelectorAll('.ti-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        await api(`/exercise-types/${id}`, { method: 'DELETE' });
        exerciseTypes = exerciseTypes.filter((t) => t.id !== id);
        renderTypesList();
      });
    });
  }

  async function addExerciseType() {
    const nameEl = document.getElementById('new-type-name');
    const colorEl = document.getElementById('new-type-color');
    const durationEl = document.getElementById('new-type-duration');
    const name = nameEl.value.trim();
    if (!name) return;

    const defaultDuration = durationEl.value ? parseInt(durationEl.value) : null;

    const created = await api('/exercise-types', {
      method: 'POST',
      body: JSON.stringify({ name, color: colorEl.value, default_duration_minutes: defaultDuration }),
    });

    exerciseTypes.push(created);
    nameEl.value = '';
    durationEl.value = '';
    renderTypesList();
  }

  // --- Init ---

  async function init() {
    // Event listeners
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('settings-close').addEventListener('click', closeSettings);
    document.getElementById('sheet-backdrop').addEventListener('click', closeSheet);
    document.getElementById('cancel-btn').addEventListener('click', closeSheet);
    document.getElementById('save-btn').addEventListener('click', saveWorkout);
    document.getElementById('add-type-btn').addEventListener('click', addExerciseType);

    // Duration +/- buttons
    document.querySelectorAll('.dur-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('duration');
        const delta = parseInt(btn.dataset.delta);
        input.value = Math.max(1, Math.min(300, parseInt(input.value || 0) + delta));
      });
    });

    // Enter key on new type name
    document.getElementById('new-type-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addExerciseType();
    });

    // Load data
    try {
      await loadExerciseTypes();
    } catch (e) {
      console.error('Failed to load exercise types:', e);
    }

    // Load 6 weeks of data
    const today = new Date();
    const monday = getMonday(today);
    const from = dateToStr(addDays(monday, -28)); // 4 weeks back
    const to = dateToStr(addDays(monday, 13)); // current week + 1 ahead

    try {
      await loadWorkouts(from, to);
    } catch (e) {
      console.error('Failed to load workouts:', e);
    }

    renderWeeks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
