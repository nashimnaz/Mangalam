/**
 * customize-trip.js — Multi-Step Custom Trip Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const destSlug = urlParams.get('destination') || 'dubai';
  let destName   = urlParams.get('name') || destSlug.charAt(0).toUpperCase() + destSlug.slice(1);

  // Wizard state
  let currentStep = 1;
  let adultsCount = 1;
  let childCount  = 0;
  let childAges   = [];
  let selectedHotel = '4-Star';
  let availablePlaces = [];
  let selectedPlaces  = [];
  let destinationData = null;

  // DOM Elements
  const destNameSpan     = document.getElementById('dest-name-span');
  const placesCountryName= document.getElementById('places-country-name');
  const startDateInput   = document.getElementById('input-start-date');
  const endDateInput     = document.getElementById('input-end-date');
  const durationBadgeBox = document.getElementById('duration-badge-box');
  const durationText     = document.getElementById('duration-calc-text');
  
  const adultCountEl     = document.getElementById('adult-count');
  const childCountEl     = document.getElementById('child-count');
  const btnAdultMinus    = document.getElementById('btn-adult-minus');
  const btnAdultPlus     = document.getElementById('btn-adult-plus');
  const btnChildMinus    = document.getElementById('btn-child-minus');
  const btnChildPlus     = document.getElementById('btn-child-plus');
  const childAgesBox     = document.getElementById('child-ages-container');
  const childAgeInputs   = document.getElementById('child-age-inputs');

  const hotelOptions     = document.querySelectorAll('.hotel-option');
  const placesLoading    = document.getElementById('places-loading');
  const placesGrid       = document.getElementById('places-grid-container');

  const btnPrev          = document.getElementById('btn-wizard-prev');
  const btnNext          = document.getElementById('btn-wizard-next');

  // Set default min dates
  const today = new Date().toISOString().split('T')[0];
  if (startDateInput) startDateInput.min = today;
  if (endDateInput) endDateInput.min = today;

  // Fetch Destination details from API
  try {
    const allDests = await MT.apiGet('/api/destinations');
    destinationData = allDests.find(d => 
      (d.slug_url && d.slug_url.toLowerCase() === destSlug.toLowerCase()) || 
      (d.destination_name && d.destination_name.toLowerCase() === destSlug.toLowerCase())
    );

    if (destinationData) {
      destName = destinationData.destination_name || destName;
    }
  } catch (e) {
    console.warn('Destination fetch error:', e);
  }

  // Update UI Titles
  if (destNameSpan) destNameSpan.textContent = destName;
  if (placesCountryName) placesCountryName.textContent = destName;

  // Step Indicators Navigation
  function updateStepUI() {
    for (let i = 1; i <= 5; i++) {
      const panel = document.getElementById(`step-content-${i}`);
      const ind   = document.getElementById(`step-ind-${i}`);
      
      if (panel) {
        if (i === currentStep) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
      }

      if (ind) {
        const circle = ind.querySelector('div');
        const text   = ind.querySelector('span');
        
        if (i < currentStep) {
          ind.className = 'flex flex-col items-center gap-1.5 cursor-pointer';
          circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-emerald-500 bg-emerald-500 text-white flex items-center justify-center font-bold text-sm transition-all shadow-sm';
          circle.innerHTML = '<i class="fas fa-check"></i>';
          if (text) text.className = 'text-emerald-600 font-bold hidden sm:inline';
        } else if (i === currentStep) {
          ind.className = 'flex flex-col items-center gap-1.5 cursor-pointer';
          circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-red-500 bg-red-50 text-red-500 flex items-center justify-center font-bold text-sm transition-all shadow-sm';
          circle.innerHTML = i;
          if (text) text.className = 'text-red-500 font-bold hidden sm:inline';
        } else {
          ind.className = 'flex flex-col items-center gap-1.5 cursor-pointer step-inactive';
          circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-slate-300 bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-sm transition-all';
          circle.innerHTML = i;
          if (text) text.className = 'text-slate-500 hidden sm:inline';
        }
      }
    }

    // Toggle Prev Button
    if (currentStep === 1) btnPrev.classList.add('hidden');
    else btnPrev.classList.remove('hidden');

    // Toggle Next Button text
    if (currentStep === 5) {
      btnNext.innerHTML = 'Submit Enquiry <i class="fas fa-paper-plane"></i>';
      btnNext.className = 'px-8 py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2';
      buildSummary();
    } else {
      btnNext.innerHTML = 'Next Step <i class="fas fa-arrow-right"></i>';
      btnNext.className = 'px-8 py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2';
    }
  }

  // Live Date Calculator
  function calcDuration() {
    const sDate = startDateInput ? startDateInput.value : '';
    const eDate = endDateInput ? endDateInput.value : '';
    if (sDate && eDate) {
      const d1 = new Date(sDate);
      const d2 = new Date(eDate);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      
      if (diffDays > 0) {
        const nights = diffDays;
        const days = diffDays + 1;
        durationText.textContent = `${nights} Nights / ${days} Days`;
        durationBadgeBox.classList.remove('hidden');
        return;
      }
    }
    durationBadgeBox.classList.add('hidden');
  }

  if (startDateInput) {
    startDateInput.addEventListener('change', () => {
      if (endDateInput && startDateInput.value) {
        endDateInput.min = startDateInput.value;
        if (endDateInput.value && endDateInput.value < startDateInput.value) {
          endDateInput.value = startDateInput.value;
        }
      }
      calcDuration();
    });
  }
  if (endDateInput) endDateInput.addEventListener('change', calcDuration);

  // Adult Counter
  if (btnAdultMinus) {
    btnAdultMinus.addEventListener('click', () => {
      if (adultsCount > 1) {
        adultsCount--;
        adultCountEl.textContent = adultsCount;
      }
    });
  }
  if (btnAdultPlus) {
    btnAdultPlus.addEventListener('click', () => {
      adultsCount++;
      adultCountEl.textContent = adultsCount;
    });
  }

  // Child Counter & Age Inputs
  function updateChildAgesUI() {
    childCountEl.textContent = childCount;
    if (childCount > 0) {
      childAgesBox.classList.remove('hidden');
      let html = '';
      for (let i = 1; i <= childCount; i++) {
        const prevAge = childAges[i - 1] || 5;
        html += `
          <div>
            <label class="block text-xs font-bold text-amber-900 mb-1">Child ${i} Age</label>
            <select class="child-age-select w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" data-child-idx="${i-1}">
              ${Array.from({length: 12}, (_, k) => `<option value="${k+1}" ${prevAge === (k+1) ? 'selected' : ''}>${k+1} Year${k > 0 ? 's' : ''}</option>`).join('')}
            </select>
          </div>
        `;
      }
      childAgeInputs.innerHTML = html;

      document.querySelectorAll('.child-age-select').forEach(sel => {
        sel.addEventListener('change', e => {
          const idx = Number(e.target.dataset.childIdx);
          childAges[idx] = Number(e.target.value);
        });
      });
    } else {
      childAgesBox.classList.add('hidden');
      childAges = [];
    }
  }

  if (btnChildMinus) {
    btnChildMinus.addEventListener('click', () => {
      if (childCount > 0) {
        childCount--;
        updateChildAgesUI();
      }
    });
  }
  if (btnChildPlus) {
    btnChildPlus.addEventListener('click', () => {
      childCount++;
      if (childAges.length < childCount) childAges.push(5);
      updateChildAgesUI();
    });
  }

  // Hotel Options Selection
  hotelOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      hotelOptions.forEach(o => {
        o.className = 'hotel-option bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-red-500 cursor-pointer transition-all flex flex-col justify-between h-44';
        const chk = o.querySelector('.hotel-check');
        if (chk) chk.innerHTML = '<i class="far fa-circle"></i>';
        if (chk) chk.className = 'hotel-check text-slate-300 text-xl text-right';
      });

      opt.className = 'hotel-option bg-white p-5 rounded-2xl border-2 border-red-500 cursor-pointer transition-all flex flex-col justify-between h-44 shadow-md bg-red-50/30';
      const chk = opt.querySelector('.hotel-check');
      if (chk) chk.innerHTML = '<i class="fas fa-check-circle"></i>';
      if (chk) chk.className = 'hotel-check text-red-500 text-xl text-right';
      selectedHotel = opt.dataset.hotel;
    });
  });

  // Fetch Places for Country (Step 4)
  async function loadPlacesForCountry() {
    placesLoading.classList.remove('hidden');
    placesGrid.classList.add('hidden');

    let places = [];
    // 1. From Destination record `places_to_visit`
    if (destinationData && Array.isArray(destinationData.places_to_visit) && destinationData.places_to_visit.length > 0) {
      places = destinationData.places_to_visit;
    } else {
      // 2. Fallback to `/api/attractions` matching destination
      try {
        const attractions = await MT.apiGet('/api/attractions');
        const matched = attractions.filter(a => 
          (a.destination || a.location || '').toLowerCase().includes(destSlug.toLowerCase()) ||
          (a.destination || a.location || '').toLowerCase().includes(destName.toLowerCase())
        );
        if (matched.length > 0) {
          places = matched.map(a => a.title || a.name || a.attraction_name);
        }
      } catch (e) { console.warn('Attractions fetch error:', e); }
    }

    // 3. Fallback: If no places added in admin panel, show empty state instead of hardcoded dummy places
    if (!places || places.length === 0) {
      placesLoading.classList.add('hidden');
      placesGrid.classList.remove('hidden');
      placesGrid.innerHTML = `
        <div class="col-span-full text-center py-8 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
          <i class="fas fa-map-marker-alt text-3xl text-slate-400 mb-2 block"></i>
          <p class="font-semibold text-slate-700 text-base">No specific places listed for ${destName} yet.</p>
          <p class="text-xs text-slate-400 mt-1">You can skip this step or specify any custom places in the notes box below.</p>
        </div>
      `;
      availablePlaces = [];
      selectedPlaces = [];
      return;
    }

    // Normalize places into { name, image } objects
    let normalizedPlaces = places.map((p) => {
      if (typeof p === 'string') {
        return { name: p, image: '' };
      } else if (typeof p === 'object' && p !== null) {
        return {
          name: p.name || p.title || p.attraction_name || 'Popular Place',
          image: p.image || p.card_image || p.banner_image || p.inner_image || ''
        };
      }
      return { name: String(p), image: '' };
    });

    availablePlaces = normalizedPlaces;
    placesLoading.classList.add('hidden');
    placesGrid.classList.remove('hidden');

    placesGrid.innerHTML = normalizedPlaces.map((place, idx) => {
      const imgUrl = place.image ? MT.resolveImg(place.image) : '';
      const placeName = place.name;
      const isChecked = selectedPlaces.includes(placeName) || (selectedPlaces.length === 0 && idx < 3);

      const imgHtml = imgUrl 
        ? `<img src="${imgUrl}" alt="${placeName}" class="w-full sm:w-24 h-28 sm:h-20 object-cover rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full sm:w-24 h-28 sm:h-20 bg-slate-100 rounded-xl flex-shrink-0 flex items-center justify-center text-slate-400\\'><i class=\\'fas fa-map-marked-alt text-xl\\'></i></div>';">`
        : `<div class="w-full sm:w-24 h-28 sm:h-20 bg-slate-100 rounded-xl flex-shrink-0 flex items-center justify-center text-slate-400"><i class="fas fa-map-marked-alt text-xl"></i></div>`;

      return `
        <label class="relative flex flex-col sm:flex-row items-center gap-4 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 hover:border-red-500 bg-white hover:bg-slate-50 cursor-pointer transition-all shadow-sm group">
          ${imgHtml}
          <div class="flex-1 w-full flex items-center justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-900 text-sm sm:text-base leading-snug">${placeName}</h4>
            </div>
            <input type="checkbox" value="${placeName}" class="place-checkbox w-6 h-6 text-red-500 rounded-lg focus:ring-red-500 border-slate-300 cursor-pointer flex-shrink-0" ${isChecked ? 'checked' : ''}>
          </div>
        </label>
      `;
    }).join('');

    // Pre-populate selected
    if (selectedPlaces.length === 0) {
      selectedPlaces = normalizedPlaces.slice(0, 3).map(p => p.name);
    }

    document.querySelectorAll('.place-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        selectedPlaces = Array.from(document.querySelectorAll('.place-checkbox:checked')).map(c => c.value);
      });
    });
  }

  // Build Summary Card (Step 5)
  function buildSummary() {
    document.getElementById('sum-dest').textContent = destName;
    
    const sDate = startDateInput.value;
    const eDate = endDateInput.value;
    if (sDate && eDate) {
      document.getElementById('sum-dates').textContent = `${sDate} to ${eDate} (${durationText.textContent})`;
    } else {
      document.getElementById('sum-dates').textContent = 'Flexible Dates';
    }

    let travelersStr = `${adultsCount} Adult${adultsCount > 1 ? 's' : ''}`;
    if (childCount > 0) {
      travelersStr += `, ${childCount} Child${childCount > 1 ? 'ren' : ''} (Ages: ${childAges.join(', ')})`;
    }
    document.getElementById('sum-travelers').textContent = travelersStr;
    document.getElementById('sum-hotel').textContent = selectedHotel;

    if (selectedPlaces.length > 0) {
      document.getElementById('sum-places').innerHTML = selectedPlaces.map(p => `<span class="inline-block bg-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-md mr-1 mb-1 font-semibold">${p}</span>`).join('');
    } else {
      document.getElementById('sum-places').textContent = 'Flexible / Recommended by Agent';
    }
  }

  // Navigation Logic
  btnNext.addEventListener('click', async () => {
    // Step Validation
    if (currentStep === 1) {
      if (!startDateInput.value || !endDateInput.value) {
        alert('Please select both Start Date and End Date to proceed.');
        return;
      }
      if (startDateInput.value > endDateInput.value) {
        alert('End Date must be after Start Date.');
        return;
      }
    }

    if (currentStep === 3) {
      loadPlacesForCountry();
    }

    if (currentStep === 5) {
      // Submit Form
      const name  = document.getElementById('contact-name').value.trim();
      const phone = document.getElementById('contact-phone').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const notes = document.getElementById('contact-notes').value.trim();

      if (!name) { alert('Please enter your full name.'); return; }
      if (!email) { alert('Please enter your email address.'); return; }
      if (!phone) { alert('Please enter your phone number.'); return; }

      const otpInstance = window.EnquiryOtp ? (EnquiryOtp.getInstance('contact') || EnquiryOtp.getInstance('customizetrip')) : null;
      if (otpInstance && !otpInstance.requireVerified()) {
        return;
      }

      const sDate = startDateInput.value;
      const eDate = endDateInput.value;
      let durationDays = 0;
      if (sDate && eDate) {
        const d1 = new Date(sDate);
        const d2 = new Date(eDate);
        durationDays = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
      }

      const payload = {
        destination: destSlug,
        destination_name: destName,
        start_date: sDate,
        end_date: eDate,
        duration_days: durationDays,
        adults: adultsCount,
        children: childCount,
        children_ages: childAges,
        hotel_rating: selectedHotel,
        places_to_visit: selectedPlaces,
        name,
        email,
        phone,
        notes
      };

      btnNext.disabled = true;
      btnNext.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      try {
        const res = await MT.apiPost('/api/enquiries', payload);
        if (res && (res.success || res.enquiry_id || res.message)) {
          document.getElementById('success-modal').classList.remove('hidden');
        } else {
          alert('Submission failed. Please try again.');
        }
      } catch (err) {
        console.error('Submission error:', err);
        alert('An error occurred submitting your enquiry.');
      } finally {
        btnNext.disabled = false;
      }
      return;
    }

    if (currentStep < 5) {
      currentStep++;
      updateStepUI();
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepUI();
    }
  });

  // Step Indicators Direct Click
  for (let i = 1; i <= 5; i++) {
    const ind = document.getElementById(`step-ind-${i}`);
    if (ind) {
      ind.addEventListener('click', () => {
        if (i < currentStep) {
          currentStep = i;
          updateStepUI();
        }
      });
    }
  }

  // Initial Step Setup
  updateStepUI();
});
