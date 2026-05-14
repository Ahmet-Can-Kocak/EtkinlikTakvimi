// ===== STATE =====
const MONTHS_TR = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
];

let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedColor = '#e55c5c';
let events = loadEvents();

// ===== ELEMENTS =====
const calendarGrid    = document.getElementById('calendarGrid');
const monthName       = document.getElementById('monthName');
const yearBadge       = document.getElementById('yearBadge');
const eventsMonthLabel= document.getElementById('eventsMonthLabel');
const eventsList      = document.getElementById('eventsList');
const prevMonthBtn    = document.getElementById('prevMonth');
const nextMonthBtn    = document.getElementById('nextMonth');
const openModalBtn    = document.getElementById('openModalBtn');
const closeModalBtn   = document.getElementById('closeModalBtn');
const cancelBtn       = document.getElementById('cancelBtn');
const saveEventBtn    = document.getElementById('saveEventBtn');
const modalBackdrop   = document.getElementById('modalBackdrop');
const colorPicker     = document.getElementById('colorPicker');
const eventTitle      = document.getElementById('eventTitle');
const eventDate       = document.getElementById('eventDate');
const eventTime       = document.getElementById('eventTime');
const eventDesc       = document.getElementById('eventDesc');

// ===== PERSISTENCE =====
function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem('calendar_events') || '[]');
  } catch { return []; }
}

function saveEvents() {
  localStorage.setItem('calendar_events', JSON.stringify(events));
}

// ===== CALENDAR RENDER =====
function renderCalendar() {
  monthName.textContent = MONTHS_TR[currentMonth];
  monthName.style.animation = 'none';
  requestAnimationFrame(() => { monthName.style.animation = ''; });
  yearBadge.textContent    = currentYear;
  eventsMonthLabel.textContent = `${MONTHS_TR[currentMonth]} ${currentYear}`;

  calendarGrid.innerHTML = '';

  const today     = new Date();
  const firstDay  = new Date(currentYear, currentMonth, 1);
  // Haftayı Pazartesi'den başlat (0=Pzt, 6=Paz)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevDays    = new Date(currentYear, currentMonth, 0).getDate();

  const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('day-cell');
    cell.style.animationDelay = `${i * 10}ms`;

    let day, month, year, isOther = false;

    if (i < startOffset) {
      // Önceki ay
      day   = prevDays - startOffset + i + 1;
      month = currentMonth - 1;
      year  = currentYear;
      if (month < 0) { month = 11; year--; }
      isOther = true;
    } else if (i >= startOffset + daysInMonth) {
      // Sonraki ay
      day   = i - startOffset - daysInMonth + 1;
      month = currentMonth + 1;
      year  = currentYear;
      if (month > 11) { month = 0; year++; }
      isOther = true;
    } else {
      day   = i - startOffset + 1;
      month = currentMonth;
      year  = currentYear;
    }

    if (isOther) cell.classList.add('other-month');

    const isToday = (
      day   === today.getDate() &&
      month === today.getMonth() &&
      year  === today.getFullYear()
    );
    if (isToday) cell.classList.add('today');

    const dateStr = formatDate(year, month, day);

    // Gün numarası
    const numEl = document.createElement('div');
    numEl.classList.add('day-num');
    numEl.textContent = day;
    cell.appendChild(numEl);

    // Etkinlik chip/dot'ları
    const dayEvents = events.filter(e => e.date === dateStr);
    if (dayEvents.length) {
      const dotsEl = document.createElement('div');
      dotsEl.classList.add('event-dots');
      dayEvents.slice(0, 3).forEach(ev => {
        if (window.innerWidth > 640) {
          const chip = document.createElement('span');
          chip.classList.add('event-chip');
          chip.textContent = ev.title;
          chip.style.background = ev.color;
          dotsEl.appendChild(chip);
        } else {
          const dot = document.createElement('span');
          dot.classList.add('event-dot');
          dot.style.background = ev.color;
          dotsEl.appendChild(dot);
        }
      });
      if (dayEvents.length > 3) {
        const more = document.createElement('span');
        more.classList.add('event-chip');
        more.textContent = `+${dayEvents.length - 3}`;
        more.style.background = 'var(--surface2)';
        more.style.color = 'var(--text-muted)';
        dotsEl.appendChild(more);
      }
      cell.appendChild(dotsEl);
    }

    // Hücreye tıklama → modal aç & tarihi doldur
    cell.addEventListener('click', () => {
      openModal(dateStr);
    });

    calendarGrid.appendChild(cell);
  }

  renderEventsList();
}

// ===== EVENTS LIST =====
function renderEventsList() {
  eventsList.innerHTML = '';

  const monthEvents = events
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  if (!monthEvents.length) {
    eventsList.innerHTML = '<p class="no-events">Bu ay etkinlik yok.</p>';
    return;
  }

  monthEvents.forEach((ev, idx) => {
    const d = new Date(ev.date + 'T00:00:00');
    const card = document.createElement('div');
    card.classList.add('event-card');
    card.style.animationDelay = `${idx * 50}ms`;

    card.innerHTML = `
      <div class="event-color-bar" style="background:${ev.color}"></div>
      <div class="event-card-content">
        <div class="event-card-left">
          <span class="event-card-title">${escapeHtml(ev.title)}</span>
          <span class="event-card-meta">${MONTHS_TR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}${ev.time ? ' · ' + ev.time : ''}</span>
          ${ev.desc ? `<span class="event-card-desc">${escapeHtml(ev.desc)}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:16px">
          <div class="event-card-date">
            <div class="event-date-num">${String(d.getDate()).padStart(2,'0')}</div>
            <div class="event-date-month">${MONTHS_TR[d.getMonth()].slice(0,3)}</div>
          </div>
          <button class="btn-delete-event" data-id="${ev.id}" title="Sil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    eventsList.appendChild(card);
  });

  // Silme butonları
  eventsList.querySelectorAll('.btn-delete-event').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      events = events.filter(ev => ev.id !== id);
      saveEvents();
      renderCalendar();
    });
  });
}

// ===== MODAL =====
function openModal(dateStr = '') {
  if (dateStr) eventDate.value = dateStr;
  modalBackdrop.classList.add('open');
  setTimeout(() => eventTitle.focus(), 100);
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  resetForm();
}

function resetForm() {
  eventTitle.value = '';
  eventDate.value  = '';
  eventTime.value  = '';
  eventDesc.value  = '';
  selectedColor    = '#e55c5c';
  colorPicker.querySelectorAll('.color-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
}

// ===== SAVE EVENT =====
function saveEvent() {
  const title = eventTitle.value.trim();
  const date  = eventDate.value;
  if (!title) { shake(eventTitle); return; }
  if (!date)  { shake(eventDate);  return; }

  const newEvent = {
    id   : crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    title,
    date,
    time : eventTime.value || '',
    desc : eventDesc.value.trim(),
    color: selectedColor,
  };

  events.push(newEvent);
  saveEvents();

  // Ay görünümünü etkinliğin ayına götür
  const d = new Date(date + 'T00:00:00');
  currentYear  = d.getFullYear();
  currentMonth = d.getMonth();

  closeModal();
  renderCalendar();
}

// ===== HELPERS =====
function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.35s ease';
  el.focus();
}

// Shake keyframes (inject once)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

// ===== EVENT LISTENERS =====
prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

openModalBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
saveEventBtn.addEventListener('click', saveEvent);

// Backdrop tıklama ile kapat
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// Klavye ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) closeModal();
  if (e.key === 'Enter' && modalBackdrop.classList.contains('open')) saveEvent();
});

// Renk seçici
colorPicker.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    colorPicker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedColor = btn.dataset.color;
  });
});

// ===== INIT =====
renderCalendar();
