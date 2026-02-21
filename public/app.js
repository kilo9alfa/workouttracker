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

    // Day headers
    html += '<div class="day-headers">';
    DAY_NAMES.forEach((d) => {
      html += `<div class="day-header">${d}</div>`;
    });
    html += '</div>';

    weeks.forEach((monday) => {
      const sunday = addDays(monday, 6);
      const weekLabel = `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]}`;

      // Calculate week total
      let weekTotal = 0;
      for (let d = 0; d < 7; d++) {
        const ds = dateToStr(addDays(monday, d));
        (workoutsCache[ds] || []).forEach((w) => (weekTotal += w.duration_minutes));
      }

      html += '<div class="week-row">';
      html += `<div class="week-label"><span>${weekLabel}</span><span class="week-total">${weekTotal > 0 ? weekTotal + ' min' : ''}</span></div>`;
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

        let totalMin = 0;
        dayWorkouts.forEach((w) => (totalMin += w.duration_minutes));

        let chips = '';
        dayWorkouts.forEach((w) => {
          chips += `<div class="day-chip" style="background:${w.exercise_type_color}"></div>`;
        });

        html += `<div class="${cellClass}" data-date="${ds}">`;
        html += `<span class="day-number">${cellDate.getDate()}</span>`;
        if (chips) html += `<div class="day-chips">${chips}</div>`;
        if (totalMin > 0) html += `<span class="day-duration">${totalMin}′</span>`;
        html += '</div>';
      }

      html += '</div></div>';
    });

    container.innerHTML = html;

    // Scroll to current week
    requestAnimationFrame(() => {
      const todayCell = container.querySelector('.day-cell.today');
      if (todayCell) {
        todayCell.scrollIntoView({ block: 'center', behavior: 'instant' });
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

    const typesEl = document.getElementById('summary-types');
    typesEl.innerHTML = Object.entries(byType)
      .map(
        ([name, { minutes, color }]) =>
          `<div class="summary-chip"><span class="dot" style="background:${color}"></span>${name} ${minutes}′</div>`
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
    document.getElementById('duration').value = 60;
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
        ${t.name}
      </div>
    `
      )
      .join('');

    el.querySelectorAll('.type-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        selectedTypeId = parseInt(chip.dataset.id);
        renderTypeChips();
      });
    });
  }

  async function saveWorkout() {
    if (!selectedTypeId) return;
    const duration = parseInt(document.getElementById('duration').value);
    if (!duration || duration < 1) return;

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
  }

  // --- Settings ---

  function openSettings() {
    document.getElementById('settings-overlay').classList.remove('hidden');
    renderTypesList();
  }

  function closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
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
      <div class="type-item" data-id="${t.id}">
        <div class="ti-info">
          <span class="ti-swatch" style="background:${t.color}"></span>
          <span class="ti-name">${t.name}</span>
        </div>
        <button class="ti-delete" data-id="${t.id}" aria-label="Delete">✕</button>
      </div>
    `
      )
      .join('');

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
    const name = nameEl.value.trim();
    if (!name) return;

    const created = await api('/exercise-types', {
      method: 'POST',
      body: JSON.stringify({ name, color: colorEl.value }),
    });

    exerciseTypes.push(created);
    nameEl.value = '';
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
