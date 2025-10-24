document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('colForm');
  const toggleBtn = document.querySelector('.collapsible-toggle');
  const collapsibleContent = document.querySelector('.collapsible-content');
  const chartsById = {};
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Disclaimer modal elements
  const disclaimerModal = document.getElementById('disclaimerModal');
  const disclaimerAccept = document.getElementById('disclaimerAccept');
  const disclaimerDontShow = document.getElementById('disclaimerDontShow');
  const disclaimerClose = document.querySelector('#disclaimerModal .modal-close');

  function getLegendColor() {
    const bodyColor = getComputedStyle(document.body).color;
    if (bodyColor && bodyColor.trim()) return bodyColor.trim();
    return prefersDark.matches ? '#eeeeee' : '#333333';
  }

  function updateLegendColors() {
    const color = getLegendColor();
    Object.values(chartsById).forEach((chart) => {
      if (chart?.options?.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = color;
        chart.update();
      }
    });
  }

  function labelsWithPercent(labels, data) {
    const total = (Array.isArray(data) ? data : []).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    return labels.map((lbl, i) => {
      const v = typeof data[i] === 'number' ? data[i] : 0;
      const pct = total ? Math.round((v / total) * 100) : 0;
      return `${String(lbl)} — ${pct}%`;
    });
  }

  // Collapsible expand/collapse
  toggleBtn.addEventListener('click', () => {
    const isOpen = collapsibleContent.classList.toggle('open');
    collapsibleContent.hidden = !isOpen;
    toggleBtn.setAttribute('aria-expanded', isOpen);
    toggleBtn.textContent = isOpen
      ? 'Optional: Additional Details ▲'
      : 'Optional: Additional Details ▼';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const homeAddress = document.getElementById('homeAddress').value;
    const workAddress = document.getElementById('workAddress').value;
    const secondWorkAddress = document.getElementById('secondWorkAddress')?.value || '';
    const mpg = document.getElementById('mpg')?.value || '';

    const housing = randomCost(18000, 36000);
    const transport = randomCost(5000, 12000);
    const childcare = randomCost(3000, 10000);
    const healthcare = randomCost(2000, 6000);
    const food = randomCost(4000, 8000);
    const internetMobile = randomCost(900, 2400); // combined internet + mobile
    const civic = randomCost(400, 1500); // permits, dues, utilities fees, etc.
    const total = housing + transport + childcare + healthcare + food + internetMobile + civic;

    updateCard('housingCard', housing);
    updateCard('transportCard', transport);
    updateCard('childcareCard', childcare);
    updateCard('healthCard', healthcare);
    updateCard('foodCard', food);
    updateCard('internetMobileCard', internetMobile);
    updateCard('civicCard', civic);
    updateCard('totalCard', total);

    const expenseColors = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#9c755f', '#ff9da7'];
    drawChart(
      'costChart',
      ['Housing', 'Transportation', 'Childcare', 'Healthcare', 'Food', 'Internet & Mobile', 'Civic'],
      [housing, transport, childcare, healthcare, food, internetMobile, civic],
      expenseColors
    );

    const requiredIncome = Math.round(total / 0.7);
    updateCard('requiredIncomeCard', requiredIncome);

    const incomeColors = ['#8cd17d', '#b6992d'];
    drawChart('incomeChart', ['After-Tax Income', 'Taxes (Estimated)'],
      [total, requiredIncome - total], incomeColors);

    // Render amenities section with placeholder data
    const amenitiesData = buildAmenitiesData({ homeAddress, workAddress, secondWorkAddress });
    renderAmenities(amenitiesData);
  });

  function updateCard(id, value) {
    document.querySelector(`#${id} p`).textContent = `$${value.toLocaleString()}`;
  }

  function randomCost(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function drawChart(canvasId, labels, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (chartsById[canvasId]) chartsById[canvasId].destroy();

    const legendColor = getLegendColor();
    chartsById[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labelsWithPercent(labels, data),
        datasets: [{ data, backgroundColor: colors }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: legendColor } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const dataset = ctx.dataset;
                const values = dataset.data || [];
                const total = values.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                const value = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = total ? Math.round((value / total) * 100) : 0;
                const baseLabel = (ctx.label || '').split('—')[0].trim();
                return `${baseLabel}: ${value.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  updateLegendColors();
  prefersDark.addEventListener('change', updateLegendColors);

  // Disclaimer modal behavior
  const DISMISS_KEY = 'col_demo_disclaimer_ack';
  function openDisclaimer() {
    if (!disclaimerModal) return;
    disclaimerModal.hidden = false;
    disclaimerModal.classList.add('open');
    // Focus the primary button for accessibility
    setTimeout(() => disclaimerAccept?.focus(), 0);
  }

  function closeDisclaimer() {
    if (!disclaimerModal) return;
    disclaimerModal.classList.remove('open');
    disclaimerModal.hidden = true;
  }

  // Show on first visit unless previously dismissed
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    if (!dismissed) openDisclaimer();
  } catch (_) {
    // If storage is unavailable, still show the modal
    openDisclaimer();
  }

  disclaimerAccept?.addEventListener('click', () => {
    try {
      if (disclaimerDontShow?.checked) localStorage.setItem(DISMISS_KEY, '1');
    } catch (_) { /* ignore */ }
    closeDisclaimer();
  });

  disclaimerClose?.addEventListener('click', closeDisclaimer);

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && disclaimerModal?.classList.contains('open')) {
      closeDisclaimer();
    }
  });

  // Build placeholder amenities data (front-end only)
  function buildAmenitiesData({ homeAddress, workAddress, secondWorkAddress }) {
    const schools = [
      { type: 'Elementary School', name: 'Aspen Ridge Elementary', address: '123 Pine St', distance: '0.8 mi' },
      { type: 'Middle School', name: 'Timber Creek Middle', address: '456 Cedar Ave', distance: '1.4 mi' },
      { type: 'High School', name: 'Summit View High', address: '789 Alpine Rd', distance: '2.3 mi' },
      { type: 'Daycare', name: 'Little Peaks Daycare', address: '22 Spruce Ln', distance: '0.6 mi' },
    ];

    const healthcare = [
      { type: 'Clinic', name: 'Mountainview Clinic', address: '45 Creek Rd', distance: '1.2 mi' },
      { type: 'Hospital', name: 'St. Elias Hospital', address: '900 Summit Blvd', distance: '6.5 mi' },
    ];

    const work = [
      workAddress ? { type: 'Primary Workplace', name: workAddress, address: workAddress, distance: '2.1 mi' } : null,
      secondWorkAddress ? { type: 'Secondary Workplace', name: secondWorkAddress, address: secondWorkAddress, distance: '7.5 mi' } : null,
    ].filter(Boolean);

    const groceries = [
      { type: 'Grocery', name: 'Valley Market', address: '301 Ridge St', distance: '1.0 mi' },
      { type: 'Grocery', name: 'Summit Foods', address: '88 Canyon Dr', distance: '2.8 mi' },
    ];

    return { schools, healthcare, work, groceries };
  }

  function renderAmenities(data) {
    renderAmenityList('amenities-schools', data.schools);
    renderAmenityList('amenities-healthcare', data.healthcare);
    renderAmenityList('amenities-work', data.work.length ? data.work : [{ type: 'Work', name: 'No additional work address', address: '', distance: '' }]);
    renderAmenityList('amenities-groceries', data.groceries);
  }

  function renderAmenityList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = container.querySelector('ul.amenity-list');
    if (!list) return;
    list.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'amenity-list-item';
      const title = document.createElement('div');
      title.className = 'amenity-title';
      title.textContent = `${item.type}: ${item.name}`;
      const meta = document.createElement('div');
      meta.className = 'amenity-meta';
      const address = item.address ? item.address : '';
      const distance = item.distance ? ` • ${item.distance}` : '';
      meta.textContent = `${address}${distance}`.trim();
      li.appendChild(title);
      li.appendChild(meta);
      list.appendChild(li);
    });
  }
});
