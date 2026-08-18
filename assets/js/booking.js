/*
  Rent Easy — fleet catalogue + booking flow
  Depends on main.js for `window.RentEasy` (toast, validateField).
*/
(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const api = () => window.RentEasy || {};
  const notify = (msg, type) => (api().toast ? api().toast(msg, type) : void 0);
  const money = (n) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  /* ================================================================== *
   * Fleet catalogue — live filtering, sorting, layout switch
   * ================================================================== */
  function initFleet() {
    const grid = $('#fleet-grid');
    const form = $('#fleet-filter-form');
    if (!grid || !form) return;

    const items = $$('.fleet-item', grid);
    const search = $('#filter-search');
    const category = $('#filter-category');
    const transmission = $('#filter-transmission');
    const seats = $('#filter-seats');
    const fuelChips = $$('[data-fuel]');
    const priceRange = $('#filter-price');
    const priceOut = $('#filter-price-value');
    const sort = $('#filter-sort');
    const countOut = $('#result-count');
    const empty = $('#fleet-empty');
    const resetBtn = $('[data-fleet-reset]');

    let activeFuel = 'all';

    function currentFilters() {
      return {
        q: (search && search.value.trim().toLowerCase()) || '',
        category: (category && category.value) || '',
        transmission: (transmission && transmission.value) || '',
        seats: (seats && seats.value) || '',
        fuel: activeFuel,
        maxPrice: priceRange ? Number(priceRange.value) : Infinity
      };
    }

    function matches(item, f) {
      const d = item.dataset;
      if (f.q && !(`${d.name || ''} ${d.category || ''} ${d.fuel || ''}`.toLowerCase().includes(f.q))) return false;
      if (f.category && d.category !== f.category) return false;
      if (f.transmission && d.transmission !== f.transmission) return false;
      if (f.seats && d.seats !== f.seats) return false;
      if (f.fuel !== 'all' && d.fuel !== f.fuel) return false;
      if (Number(d.price) > f.maxPrice) return false;
      return true;
    }

    function applySort() {
      if (!sort || !sort.value) return;
      const [key, dir] = sort.value.split('-');

      const ordered = items.slice().sort((a, b) => {
        let av, bv;
        if (key === 'price') { av = Number(a.dataset.price); bv = Number(b.dataset.price); }
        else if (key === 'rating') { av = Number(a.dataset.rating || 0); bv = Number(b.dataset.rating || 0); }
        else { av = (a.dataset.name || '').toLowerCase(); bv = (b.dataset.name || '').toLowerCase(); }
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
      });

      ordered.forEach(el => grid.appendChild(el));
    }

    function apply() {
      const f = currentFilters();
      let visible = 0;

      items.forEach(item => {
        const show = matches(item, f);
        item.classList.toggle('is-hidden', !show);
        item.classList.remove('is-filtering');

        if (show) {
          // restart the entrance animation for the cards that survive the filter
          void item.offsetWidth;
          item.style.animationDelay = `${Math.min(visible, 8) * 0.045}s`;
          item.classList.add('is-filtering');
          visible++;
        }
      });

      applySort();

      if (countOut) {
        countOut.innerHTML = `<b>${visible}</b> of ${items.length} vehicles available`;
      }
      if (empty) empty.hidden = visible > 0;
    }

    // Live inputs
    [search, category, transmission, seats, sort].forEach(el => {
      if (!el) return;
      el.addEventListener('input', apply);
      el.addEventListener('change', apply);
    });

    if (priceRange) {
      const paint = () => {
        if (priceOut) priceOut.textContent = money(Number(priceRange.value)) + ' / day';
      };
      priceRange.addEventListener('input', () => { paint(); apply(); });
      paint();
    }

    fuelChips.forEach(chip => {
      chip.addEventListener('click', () => {
        activeFuel = chip.dataset.fuel;
        fuelChips.forEach(c => c.classList.toggle('active', c === chip));
        apply();
      });
    });

    form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        form.reset();
        activeFuel = 'all';
        fuelChips.forEach(c => c.classList.toggle('active', c.dataset.fuel === 'all'));
        if (priceRange) {
          priceRange.value = priceRange.max;
          if (priceOut) priceOut.textContent = money(Number(priceRange.max)) + ' / day';
        }
        apply();
        notify('Filters cleared', 'info');
      });
    }

    // Layout toggle (grid / list)
    $$('[data-layout]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.layout;
        $$('[data-layout]').forEach(b => b.classList.toggle('active', b === btn));
        grid.classList.toggle('is-list', mode === 'list');
        grid.style.gridTemplateColumns =
          mode === 'list' ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))';
      });
    });

    apply();
  }

  /* ================================================================== *
   * Booking — wizard navigation + live price summary
   * ================================================================== */
  function initBooking() {
    const form = $('#booking-form');
    if (!form) return;

    /* ---- Date guards ---- */
    const pickupDate = $('#pickup-date');
    const dropoffDate = $('#dropoff-date');
    const today = new Date().toISOString().split('T')[0];

    $$('input[type="date"]', form).forEach(i => i.setAttribute('min', today));

    if (pickupDate && dropoffDate) {
      pickupDate.addEventListener('change', () => {
        dropoffDate.min = pickupDate.value;
        if (dropoffDate.value && dropoffDate.value < pickupDate.value) {
          dropoffDate.value = pickupDate.value;
        }
        updateSummary();
      });
    }

    /* ---- Vehicle picker tiles ---- */
    const vehicleSelect = $('#vehicle');
    const tiles = $$('.picker-tile');

    tiles.forEach(tile => {
      tile.addEventListener('click', () => {
        tiles.forEach(t => t.classList.toggle('selected', t === tile));
        if (vehicleSelect) {
          vehicleSelect.value = tile.dataset.value;
          vehicleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const group = vehicleSelect && vehicleSelect.closest('.form-group');
        group && group.classList.remove('has-error');
      });
    });

    if (vehicleSelect) {
      vehicleSelect.addEventListener('change', () => {
        tiles.forEach(t => t.classList.toggle('selected', t.dataset.value === vehicleSelect.value));
        updateSummary();
      });
    }

    /* ---- Extras ---- */
    $$('.extra-row').forEach(row => {
      const cb = $('input[type="checkbox"]', row);
      if (!cb) return;
      const sync = () => row.classList.toggle('checked', cb.checked);
      cb.addEventListener('change', () => { sync(); updateSummary(); });
      sync();
    });

    /* ---- Live summary ---- */
    const out = {
      vehicle: $('#sum-vehicle'),
      dates: $('#sum-dates'),
      days: $('#sum-days'),
      rate: $('#sum-rate'),
      extras: $('#sum-extras'),
      subtotal: $('#sum-subtotal'),
      taxes: $('#sum-taxes'),
      total: $('#sum-total')
    };

    function dayCount() {
      if (!pickupDate || !dropoffDate || !pickupDate.value || !dropoffDate.value) return 0;
      const ms = new Date(dropoffDate.value) - new Date(pickupDate.value);
      return Math.max(1, Math.round(ms / 86400000));
    }

    function updateSummary() {
      const option = vehicleSelect ? vehicleSelect.selectedOptions[0] : null;
      const rate = option ? Number(option.dataset.price || 0) : 0;
      const days = dayCount();

      const extras = $$('.extra-row input[type="checkbox"]:checked')
        .reduce((sum, cb) => sum + Number(cb.dataset.price || 0), 0);

      const base = rate * days;
      const extrasTotal = extras * days;
      const subtotal = base + extrasTotal;
      const taxes = Math.round(subtotal * 0.09);
      const total = subtotal + taxes;

      if (out.vehicle) out.vehicle.textContent = option && option.value ? option.dataset.label || option.textContent : '—';
      if (out.rate) out.rate.textContent = rate ? `${money(rate)} / day` : '—';
      if (out.days) out.days.textContent = days ? `${days} ${days === 1 ? 'day' : 'days'}` : '—';
      if (out.dates) {
        out.dates.textContent = (pickupDate && pickupDate.value && dropoffDate && dropoffDate.value)
          ? `${pickupDate.value} → ${dropoffDate.value}`
          : 'Select dates';
      }
      if (out.extras) out.extras.textContent = extrasTotal ? money(extrasTotal) : '—';
      if (out.subtotal) out.subtotal.textContent = money(subtotal);
      if (out.taxes) out.taxes.textContent = money(taxes);
      if (out.total) out.total.textContent = money(total);
    }

    $$('input, select', form).forEach(el => el.addEventListener('change', updateSummary));
    updateSummary();

    /* ---- Wizard ---- */
    const panels = $$('.wizard-panel', form);
    const steps = $$('.wizard-step');
    if (!panels.length) return;

    let current = 0;

    function paintSteps() {
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === current);
        s.classList.toggle('is-done', i < current);
        const dot = $('.wizard-dot', s);
        if (dot) dot.innerHTML = i < current ? '<i class="ph ph-check"></i>' : String(i + 1);
      });

      panels.forEach((p, i) => p.classList.toggle('is-active', i === current));
    }

    function stepIsValid() {
      const panel = panels[current];
      const required = $$('input[required], select[required], textarea[required]', panel);
      const validate = api().validateField;
      if (!validate) return true;

      let ok = true;
      let firstBad = null;

      required.forEach(input => {
        if (!validate(input)) {
          ok = false;
          if (!firstBad) firstBad = input;
        }
      });

      if (!ok) {
        notify('Please complete this step before continuing', 'error');
        firstBad && firstBad.focus();
      }
      return ok;
    }

    function goTo(index) {
      current = Math.max(0, Math.min(panels.length - 1, index));
      paintSteps();
      const anchor = $('.booking-panel-top') || form;
      anchor.scrollIntoView({
        behavior: api().prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    }

    $$('[data-wizard-next]', form).forEach(btn => btn.addEventListener('click', () => {
      if (stepIsValid()) goTo(current + 1);
    }));

    $$('[data-wizard-prev]', form).forEach(btn => btn.addEventListener('click', () => goTo(current - 1)));

    // Let users jump back to a completed step by clicking its indicator
    steps.forEach((s, i) => {
      s.style.cursor = 'pointer';
      s.addEventListener('click', () => { if (i < current) goTo(i); });
    });

    document.addEventListener('renteasy:form-success', (e) => {
      if (e.detail.form !== form) return;
      tiles.forEach(t => t.classList.remove('selected'));
      current = 0;
      paintSteps();
      updateSummary();
    });

    paintSteps();
  }

  function boot() {
    initFleet();
    initBooking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
