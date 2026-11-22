// app.js - Client-Side Interactive Engine for SmartPrint
// Department of AI&DS, SKCET - Batch 9

// Application State
const state = {
  currentUser: {
    name: 'Yasvanth V',
    roll: '26AD470'
  },
  selectedFile: {
    name: 'EIDT_Review1_SmartPrint.pdf',
    pages: 16,
    sizeMB: 2.4,
    uploaded: true
  },
  activeToken: 'SKC-2026-A101',
  activeOrder: null,
  orders: [],
  stats: {},
  currentView: 'student',
  shopFilter: 'All',
  selectedPaymentMethod: 'upi',
  rates: {
    bw: 1.50,
    color: 5.00,
    duplexDiscount: 0.15,
    paperPremium: 1.00,
    binding: {
      none: 0,
      staple: 1.00,
      spiral: 25.00,
      soft: 40.00
    }
  }
};

// Web Audio API Sound Chime
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.18); // A5
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (err) {
    console.log('Audio chime not supported or blocked:', err);
  }
}

// Show Toast Alert
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-amber-500 text-slate-900',
    error: 'bg-rose-600 text-white'
  };

  const icons = {
    success: 'fa-circle-check',
    info: 'fa-bell',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark'
  };

  toast.className = `p-4 rounded-xl shadow-xl flex items-start gap-3 text-xs pointer-events-auto transform transition-all toast-anim ${bgColors[type] || bgColors.info} max-w-sm`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type]} text-base flex-shrink-0 mt-0.5"></i>
    <div class="flex-1">
      <p class="font-bold text-sm">${title}</p>
      <p class="text-[11px] opacity-90 mt-0.5">${message}</p>
    </div>
    <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 p-0.5">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// View Switcher
function switchView(viewName) {
  state.currentView = viewName;
  const views = ['student', 'shop', 'showcase'];
  
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const tab = document.getElementById(`nav-${v}`);
    if (v === viewName) {
      el.classList.remove('hidden');
      tab.classList.add('bg-white', 'text-blue-700', 'shadow-sm', 'font-semibold');
      tab.classList.remove('text-slate-600', 'font-medium');
    } else {
      el.classList.add('hidden');
      tab.classList.remove('bg-white', 'text-blue-700', 'shadow-sm', 'font-semibold');
      tab.classList.add('text-slate-600', 'font-medium');
    }
  });

  if (viewName === 'shop') {
    refreshOrders();
  }
}

// User Profile Switching
function toggleUserModal() {
  const modal = document.getElementById('user-modal');
  modal.classList.toggle('hidden');
}

function switchUser(name, roll) {
  state.currentUser = { name, roll };
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-display-roll').textContent = roll;
  document.getElementById('user-avatar').textContent = name.charAt(0);
  document.getElementById('history-roll-label').textContent = roll;
  toggleUserModal();
  showToast('Profile Switched', `Active student is now ${name} (${roll})`, 'info');
  refreshOrders();
}

// File Selection & Drag-and-Drop
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  setUploadedFile(file.name, Math.max(1, Math.round(file.size / 50000)), (file.size / (1024 * 1024)).toFixed(1));
}

function useSampleDoc(name, pages, mb) {
  setUploadedFile(name, pages, mb);
  showToast('Sample Document Loaded', `${name} (${pages} pages) selected for demo`, 'info');
}

function setUploadedFile(name, pages, sizeMB) {
  state.selectedFile = {
    name,
    pages,
    sizeMB,
    uploaded: true
  };

  const uploadPrompt = document.getElementById('upload-prompt');
  const fileDetails = document.getElementById('file-details');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileMetaDisplay = document.getElementById('file-meta-display');
  const fileIcon = document.getElementById('file-icon');

  uploadPrompt.classList.add('hidden');
  fileDetails.classList.remove('hidden');

  fileNameDisplay.textContent = name;
  fileMetaDisplay.textContent = `${sizeMB} MB • ~${pages} pages`;

  const ext = name.split('.').pop().toUpperCase();
  fileIcon.textContent = ext || 'DOC';
  if (ext === 'PDF') fileIcon.className = 'w-10 h-10 rounded bg-red-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0';
  else if (ext.startsWith('PPT')) fileIcon.className = 'w-10 h-10 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0';
  else fileIcon.className = 'w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0';

  updatePriceCalculation();
}

function clearSelectedFile(e) {
  if (e) e.stopPropagation();
  state.selectedFile = null;
  document.getElementById('file-input').value = '';
  document.getElementById('upload-prompt').classList.remove('hidden');
  document.getElementById('file-details').classList.add('hidden');
  updatePriceCalculation();
}

// Page Range Handling
function togglePageRangeInput() {
  const type = document.getElementById('page-range-type').value;
  const customInput = document.getElementById('custom-range-input');
  if (type === 'custom') {
    customInput.classList.remove('hidden');
    customInput.focus();
  } else {
    customInput.classList.add('hidden');
  }
  updatePriceCalculation();
}

function adjustCopies(delta) {
  const input = document.getElementById('copies-input');
  let val = parseInt(input.value) || 1;
  val = Math.max(1, Math.min(50, val + delta));
  input.value = val;
  updatePriceCalculation();
}

// Calculate Pages from Custom String (e.g. "1-5, 8, 11-13")
function parseCustomPages(str, maxPages) {
  if (!str || !str.trim()) return maxPages;
  const parts = str.split(',');
  const pageSet = new Set();
  
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
          pageSet.add(i);
        }
      }
    } else {
      const page = parseInt(trimmed);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        pageSet.add(page);
      }
    }
  });

  return pageSet.size > 0 ? pageSet.size : maxPages;
}

// Dynamic Price Calculation
function updatePriceCalculation() {
  const file = state.selectedFile || { pages: 16, name: 'Sample' };
  const maxPages = file.pages;

  const rangeType = document.getElementById('page-range-type').value;
  let calculatedPages = maxPages;
  if (rangeType === 'custom') {
    const customStr = document.getElementById('custom-range-input').value;
    calculatedPages = parseCustomPages(customStr, maxPages);
    document.getElementById('pages-count-caption').textContent = `Printing ${calculatedPages} of ${maxPages} total pages`;
  } else {
    document.getElementById('pages-count-caption').textContent = `Printing all ${maxPages} detected pages`;
  }

  const copies = parseInt(document.getElementById('copies-input').value) || 1;
  
  // Options
  const colorMode = document.querySelector('input[name="color_mode"]:checked')?.value || 'bw';
  const sides = document.querySelector('input[name="sides"]:checked')?.value || 'double';
  const paperType = document.getElementById('paper-type-select').value;
  const binding = document.getElementById('binding-select').value;

  // Radio button visual styling
  document.getElementById('opt-color-bw').className = colorMode === 'bw' 
    ? 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
    : 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-slate-200 hover:border-slate-300';
  document.getElementById('opt-color-full').className = colorMode === 'color'
    ? 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
    : 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-slate-200 hover:border-slate-300';

  document.getElementById('opt-side-double').className = sides === 'double'
    ? 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
    : 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-slate-200 hover:border-slate-300';
  document.getElementById('opt-side-single').className = sides === 'single'
    ? 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
    : 'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all border-slate-200 hover:border-slate-300';

  // Base cost
  const ratePerPage = colorMode === 'color' ? state.rates.color : state.rates.bw;
  const rawSubtotal = calculatedPages * copies * ratePerPage;

  // Duplex discount (SDG 12)
  let discount = 0;
  if (sides === 'double' && calculatedPages > 1) {
    discount = rawSubtotal * state.rates.duplexDiscount;
  }

  // Paper add-on
  const paperAddon = paperType === 'premium' ? (calculatedPages * copies * state.rates.paperPremium) : 0;

  // Binding cost
  const bindingCost = (state.rates.binding[binding] || 0) * copies;

  const grandTotal = Math.max(1, rawSubtotal - discount + paperAddon + bindingCost);

  // Update DOM Summary
  const modeLabel = colorMode === 'color' ? 'Color @ ₹5.00' : 'B&W @ ₹1.50';
  document.getElementById('price-breakdown-pages').textContent = `${calculatedPages} Pages × ${copies} Cop${copies > 1 ? 'ies' : 'y'} (${modeLabel})`;
  document.getElementById('price-subtotal').textContent = `₹${rawSubtotal.toFixed(2)}`;

  const discountRow = document.getElementById('price-discount-row');
  if (discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('price-discount').textContent = `-₹${discount.toFixed(2)}`;
  } else {
    discountRow.classList.add('hidden');
  }

  const bindingRow = document.getElementById('price-binding-row');
  if (bindingCost > 0 || paperAddon > 0) {
    bindingRow.classList.remove('hidden');
    const bindingNames = { staple: 'Corner Staple', spiral: 'Spiral Binding', soft: 'Soft Binding' };
    let addonText = bindingNames[binding] || '';
    if (paperAddon > 0) addonText += (addonText ? ' + ' : '') + 'Executive Paper';
    document.getElementById('price-binding-label').textContent = addonText;
    document.getElementById('price-binding-cost').textContent = `+₹${(bindingCost + paperAddon).toFixed(2)}`;
  } else {
    bindingRow.classList.add('hidden');
  }

  document.getElementById('price-grand-total').textContent = `₹${grandTotal.toFixed(2)}`;

  return {
    calculatedPages,
    copies,
    colorMode,
    sides,
    paperType,
    binding,
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
}

// Payment Modal Logic
function handleOrderSubmit(e) {
  e.preventDefault();
  if (!state.selectedFile) {
    showToast('Missing Document', 'Please upload or select a document to print.', 'warning');
    return;
  }

  const calc = updatePriceCalculation();
  document.getElementById('checkout-amount-display').textContent = `₹${calc.grandTotal.toFixed(2)}`;
  document.getElementById('checkout-doc-caption').textContent = `${state.selectedFile.name} • ${calc.calculatedPages} pages (${calc.copies} copies)`;

  selectPaymentMethod('upi');
  drawQRCode('checkout-qr-canvas', `upi://pay?pa=skcet.smartprint@okaxis&pn=SKCET%20SmartPrint&am=${calc.grandTotal}&cu=INR`);

  document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

function selectPaymentMethod(method) {
  state.selectedPaymentMethod = method;
  const methods = ['upi', 'card', 'cash'];
  
  methods.forEach(m => {
    const btn = document.getElementById(`pay-method-${m}`);
    if (m === method) {
      btn.className = 'p-2.5 rounded-xl border-2 border-blue-600 bg-blue-50/50 text-center text-xs font-bold text-blue-900 transition-all';
    } else {
      btn.className = 'p-2.5 rounded-xl border border-slate-200 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all';
    }
  });

  const qrSection = document.getElementById('upi-qr-section');
  if (method === 'upi') {
    qrSection.classList.remove('hidden');
  } else {
    qrSection.classList.add('hidden');
  }
}

// Confirm Payment & Place Order
async function confirmPaymentAndPlaceOrder() {
  const calc = updatePriceCalculation();
  const specialNotes = document.getElementById('special-notes').value;

  const orderPayload = {
    student_name: state.currentUser.name,
    roll_no: state.currentUser.roll,
    document_name: state.selectedFile.name,
    file_size: Math.round(state.selectedFile.sizeMB * 1024 * 1024),
    total_pages: state.selectedFile.pages,
    page_range: document.getElementById('page-range-type').value === 'custom' ? document.getElementById('custom-range-input').value : 'All',
    calculated_pages: calc.calculatedPages,
    copies: calc.copies,
    color_mode: calc.colorMode,
    sides: calc.sides,
    paper_type: calc.paperType,
    binding: calc.binding,
    special_notes: specialNotes,
    total_price: calc.grandTotal,
    payment_method: state.selectedPaymentMethod,
    payment_status: state.selectedPaymentMethod === 'cash' ? 'pending_cash' : 'paid'
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();
    if (result.success && result.data) {
      closePaymentModal();
      state.activeToken = result.data.token;
      state.activeOrder = result.data;
      showToast('Order Placed! 🚀', `Your digital token is ${result.data.token}. Tracking queue...`, 'success');
      playChimeSound();
      renderActiveToken(result.data);
      refreshOrders();
    } else {
      throw new Error(result.error || 'Server error');
    }
  } catch (err) {
    // Local / Offline fallback
    console.warn('Backend unavailable, using client-side order creation:', err);
    closePaymentModal();
    const token = `SKC-2026-B${Math.floor(Math.random() * 900 + 100)}`;
    const mockOrder = {
      ...orderPayload,
      id: Date.now(),
      token,
      status: 'Received',
      estimated_wait_min: 5,
      queue_position: 2,
      created_at: new Date().toLocaleTimeString()
    };
    state.activeToken = token;
    state.activeOrder = mockOrder;
    state.orders.unshift(mockOrder);
    showToast('Order Placed! 🚀', `Generated token ${token} (Local Mode)`, 'success');
    playChimeSound();
    renderActiveToken(mockOrder);
    renderStudentHistory();
    renderShopQueue();
  }
}

// Render Active Token Pass
function renderActiveToken(order) {
  if (!order) return;
  state.activeOrder = order;

  document.getElementById('token-id-display').textContent = `#${order.token}`;
  document.getElementById('token-doc-name').textContent = order.document_name;

  const sideLabel = order.sides === 'double' ? 'Duplex' : 'Single-side';
  const colorLabel = order.color_mode === 'color' ? 'Color' : 'B&W';
  const bindingLabel = order.binding !== 'none' ? ` • ${order.binding.toUpperCase()}` : '';
  document.getElementById('token-specs-summary').textContent = `${order.calculated_pages}p • ${colorLabel} • ${sideLabel}${bindingLabel}`;

  const payText = order.payment_status === 'paid' ? `Paid via ${order.payment_method.toUpperCase()}` : 'Pay at Counter';
  document.getElementById('token-paid-amount').textContent = `₹${order.total_price.toFixed(2)} • ${payText}`;

  // Queue Position
  const posBadge = document.getElementById('token-queue-pos');
  if (order.status === 'Ready' || order.status === 'Collected') {
    posBadge.textContent = 'At Counter';
  } else if (order.queue_position) {
    posBadge.textContent = `#${order.queue_position} in line`;
  } else {
    posBadge.textContent = 'Queued';
  }

  // Draw QR
  drawQRCode('token-qr-canvas', `TOKEN:${order.token}|SKCET|${order.roll_no}`);

  // Stepper Visuals (5 Stages)
  updateStepper(order.status, order.estimated_wait_min);
}

function updateStepper(status, estWaitMin) {
  const fillLine = document.getElementById('stepper-fill-line');
  const estTimeDisplay = document.getElementById('stepper-time-est');
  const readyBox = document.getElementById('ready-notification-box');
  const statusBadge = document.getElementById('active-status-badge');

  // Reset nodes
  for (let i = 1; i <= 5; i++) {
    const node = document.getElementById(`step-node-${i}`);
    node.className = 'w-7 h-7 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold';
  }

  if (status === 'Received') {
    fillLine.style.width = '10%';
    document.getElementById('step-node-1').className = 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow ring-4 ring-blue-100';
    estTimeDisplay.textContent = `Est. Wait: ~${estWaitMin || 6} mins`;
    readyBox.classList.add('hidden');
    statusBadge.textContent = 'Received in Queue';
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold badge-received';
  } else if (status === 'Processing') {
    fillLine.style.width = '50%';
    document.getElementById('step-node-1').className = 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold';
    document.getElementById('step-node-2').className = 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold';
    document.getElementById('step-node-3').className = 'w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow ring-4 ring-amber-100 animate-pulse';
    estTimeDisplay.textContent = 'Printing Right Now 🖨️';
    readyBox.classList.add('hidden');
    statusBadge.textContent = 'Printing in Progress';
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold badge-processing';
  } else if (status === 'Ready') {
    fillLine.style.width = '75%';
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`step-node-${i}`).className = 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold';
    }
    document.getElementById('step-node-4').className = 'w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow ring-4 ring-emerald-100 animate-bounce';
    estTimeDisplay.textContent = 'Ready for Pickup! 🎉';
    readyBox.classList.remove('hidden');
    statusBadge.textContent = 'Ready for Collection';
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold badge-ready';
  } else if (status === 'Collected') {
    fillLine.style.width = '100%';
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`step-node-${i}`).className = 'w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold';
    }
    estTimeDisplay.textContent = 'Order Completed ✅';
    readyBox.classList.add('hidden');
    statusBadge.textContent = 'Collected';
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold badge-collected';
  }
}

// Track Token from Input
async function trackTokenFromInput() {
  const token = document.getElementById('track-token-input').value.trim();
  if (!token) {
    showToast('Enter Token', 'Please type a token like SKC-2026-A101', 'warning');
    return;
  }

  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data.success && data.data) {
      state.activeToken = data.data.token;
      renderActiveToken(data.data);
      showToast('Token Found', `Loaded status for ${data.data.token}`, 'success');
    } else {
      showToast('Not Found', `Token ${token} not found in database.`, 'error');
    }
  } catch (err) {
    const found = state.orders.find(o => o.token.toUpperCase() === token.toUpperCase());
    if (found) {
      state.activeToken = found.token;
      renderActiveToken(found);
      showToast('Token Found', `Loaded status for ${found.token}`, 'success');
    } else {
      showToast('Not Found', `Token ${token} not found.`, 'error');
    }
  }
}

// Shop Operator Dashboard Logic
async function advanceStatus(orderId, nextStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Status Updated', `Order #${data.data.token} marked as ${nextStatus}`, 'success');
      if (nextStatus === 'Ready') {
        playChimeSound();
      }
      refreshOrders();
    }
  } catch (err) {
    // Local fallback
    const target = state.orders.find(o => o.id === orderId);
    if (target) {
      target.status = nextStatus;
      showToast('Status Updated', `Order #${target.token} marked as ${nextStatus}`, 'success');
      if (nextStatus === 'Ready') playChimeSound();
      if (state.activeToken === target.token) renderActiveToken(target);
      renderShopQueue();
      renderStudentHistory();
    }
  }
}

// Counter Express Token Verification
async function verifyCounterToken() {
  const tokenInput = document.getElementById('counter-token-input');
  const token = tokenInput.value.trim();
  if (!token) {
    showToast('Enter Token', 'Please enter a student token at counter', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/orders/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Handover Verified ✅', data.message, 'success');
      playChimeSound();
      tokenInput.value = '';
      refreshOrders();
    } else {
      showToast('Verification Notice', data.message || 'Token verification failed', 'warning');
    }
  } catch (err) {
    const order = state.orders.find(o => o.token.toUpperCase() === token.toUpperCase());
    if (order) {
      order.status = 'Collected';
      order.payment_status = 'paid';
      showToast('Handover Verified ✅', `Order #${token} handed over!`, 'success');
      playChimeSound();
      tokenInput.value = '';
      renderShopQueue();
      renderStudentHistory();
    } else {
      showToast('Not Found', `Token ${token} not found`, 'error');
    }
  }
}

function filterShopQueue(status) {
  state.shopFilter = status;
  const buttons = document.querySelectorAll('.shop-filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.filter === status) {
      btn.className = 'shop-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm';
    } else {
      btn.className = 'shop-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  });
  renderShopQueue();
}

function searchShopQueue() {
  renderShopQueue();
}

// Render Student History
function renderStudentHistory() {
  const tbody = document.getElementById('student-history-tbody');
  if (!tbody) return;

  const userOrders = state.orders.filter(o => 
    o.roll_no.toLowerCase() === state.currentUser.roll.toLowerCase()
  );

  if (userOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-slate-400 text-xs">
          No print orders yet for ${state.currentUser.name}. Submit your first job above!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = userOrders.map(o => {
    const badgeClass = {
      'Received': 'badge-received',
      'Processing': 'badge-processing',
      'Ready': 'badge-ready',
      'Collected': 'badge-collected'
    }[o.status] || 'badge-received';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-3 font-mono font-bold text-blue-700">#${o.token}</td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-800">${o.document_name}</div>
          <div class="text-[10px] text-slate-400">${o.created_at || 'Today'}</div>
        </td>
        <td class="py-3 px-3">
          <span class="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700">
            ${o.calculated_pages}p • ${o.color_mode.toUpperCase()} • ${o.sides === 'double' ? 'Duplex' : 'Single'}
          </span>
        </td>
        <td class="py-3 px-3 font-mono font-bold text-slate-800">₹${Number(o.total_price).toFixed(2)}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeClass}">
            ${o.status}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <button onclick="state.activeToken='${o.token}'; renderActiveToken(state.orders.find(x => x.token==='${o.token}')); showToast('Pass Loaded', 'Viewing token #${o.token}', 'info');" class="text-blue-600 hover:text-blue-800 font-semibold text-[11px]">
            Track Pass
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Shop Queue Table
function renderShopQueue() {
  const tbody = document.getElementById('shop-queue-tbody');
  if (!tbody) return;

  const search = document.getElementById('shop-search-input')?.value.toLowerCase().trim() || '';
  
  let filtered = state.orders;
  if (state.shopFilter !== 'All') {
    filtered = filtered.filter(o => o.status === state.shopFilter);
  }
  if (search) {
    filtered = filtered.filter(o => 
      o.token.toLowerCase().includes(search) ||
      o.student_name.toLowerCase().includes(search) ||
      o.roll_no.toLowerCase().includes(search) ||
      o.document_name.toLowerCase().includes(search)
    );
  }

  // Update counts
  document.getElementById('count-all').textContent = state.orders.length;
  document.getElementById('count-received').textContent = state.orders.filter(o => o.status === 'Received').length;
  document.getElementById('count-processing').textContent = state.orders.filter(o => o.status === 'Processing').length;
  document.getElementById('count-ready').textContent = state.orders.filter(o => o.status === 'Ready').length;
  document.getElementById('count-collected').textContent = state.orders.filter(o => o.status === 'Collected').length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
          No orders match the current filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const badgeClass = {
      'Received': 'badge-received',
      'Processing': 'badge-processing',
      'Ready': 'badge-ready',
      'Collected': 'badge-collected'
    }[o.status] || 'badge-received';

    // Action button based on current status
    let actionButtons = '';
    if (o.status === 'Received') {
      actionButtons = `
        <button onclick="advanceStatus(${o.id}, 'Processing')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1 ml-auto">
          <i class="fa-solid fa-play text-[9px]"></i> Start Print
        </button>
      `;
    } else if (o.status === 'Processing') {
      actionButtons = `
        <button onclick="advanceStatus(${o.id}, 'Ready')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1 ml-auto">
          <i class="fa-solid fa-bell text-[9px]"></i> Mark Ready
        </button>
      `;
    } else if (o.status === 'Ready') {
      actionButtons = `
        <button onclick="advanceStatus(${o.id}, 'Collected')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1 ml-auto">
          <i class="fa-solid fa-check text-[9px]"></i> Handover
        </button>
      `;
    } else {
      actionButtons = `<span class="text-slate-400 font-medium text-[11px]">Completed</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-3">
          <div class="font-mono font-bold text-blue-700">#${o.token}</div>
          <div class="text-[10px] text-slate-400">${o.created_at || 'Today'}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-800">${o.student_name}</div>
          <div class="text-[11px] font-mono text-slate-500">${o.roll_no}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-800 truncate max-w-[160px]">${o.document_name}</div>
          <div class="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline" onclick="showToast('Document Viewer', 'Opening ${o.document_name} for print spooling', 'info')">
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px] mr-0.5"></i> Spool / Preview
          </div>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
              ${o.calculated_pages}p × ${o.copies}c
            </span>
            <span class="px-1.5 py-0.5 ${o.color_mode === 'color' ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-700'} rounded text-[10px] font-bold">
              ${o.color_mode.toUpperCase()}
            </span>
            <span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">
              ${o.sides === 'double' ? 'Duplex' : 'Simplex'}
            </span>
            ${o.binding !== 'none' ? `<span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">${o.binding}</span>` : ''}
          </div>
          ${o.special_notes ? `<div class="text-[10px] text-amber-700 mt-1 italic truncate max-w-[200px]">Note: "${o.special_notes}"</div>` : ''}
        </td>
        <td class="py-3 px-3">
          <div class="font-mono font-bold text-slate-800">₹${Number(o.total_price).toFixed(2)}</div>
          <span class="text-[10px] ${o.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'} font-semibold">
            ${o.payment_status === 'paid' ? '● Paid' : '○ Cash Counter'}
          </span>
        </td>
        <td class="py-3 px-3">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
            ${o.status}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');
}

// Refresh Orders & Stats from Backend
async function refreshOrders() {
  try {
    const [ordersRes, statsRes] = await Promise.all([
      fetch('/api/orders'),
      fetch('/api/stats')
    ]);

    if (ordersRes.ok) {
      const oData = await ordersRes.json();
      if (oData.success && oData.data) {
        state.orders = oData.data;
      }
    }

    if (statsRes.ok) {
      const sData = await statsRes.json();
      if (sData.success && sData.data) {
        state.stats = sData.data;
        updateStatsUI(sData.data);
      }
    }
  } catch (err) {
    console.warn('API polling fallback to local memory state');
  }

  // Find active token or default
  let currentActive = state.orders.find(o => o.token === state.activeToken);
  if (!currentActive && state.orders.length > 0) {
    currentActive = state.orders[0];
    state.activeToken = currentActive.token;
  }
  if (currentActive) {
    renderActiveToken(currentActive);
  }

  renderStudentHistory();
  renderShopQueue();
}

function updateStatsUI(stats) {
  if (document.getElementById('stat-active-queue')) document.getElementById('stat-active-queue').textContent = stats.active_queue;
  if (document.getElementById('stat-ready-count')) document.getElementById('stat-ready-count').textContent = stats.ready_count;
  if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = `₹${stats.total_revenue.toFixed(2)}`;
  if (document.getElementById('stat-sheets-saved')) document.getElementById('stat-sheets-saved').textContent = stats.sheets_saved;
  if (document.getElementById('stat-avg-wait')) document.getElementById('stat-avg-wait').textContent = `${stats.avg_wait_min}m`;

  if (document.getElementById('shop-badge')) document.getElementById('shop-badge').textContent = stats.active_queue;
  if (document.getElementById('ticker-wait-time')) document.getElementById('ticker-wait-time').textContent = `~${stats.avg_wait_min} mins`;
  if (document.getElementById('ticker-sheets')) document.getElementById('ticker-sheets').textContent = stats.sheets_saved;
}

// QR Code Canvas Generator (Stand-alone high contrast pattern)
function drawQRCode(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Hash seed from string
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  // Draw simulated QR matrix with corner markers
  const gridSize = 21;
  const cellSize = size / gridSize;
  ctx.fillStyle = '#0f172a';

  function drawCorner(x, y) {
    ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawCorner(0, 0);
  drawCorner(gridSize - 7, 0);
  drawCorner(0, gridSize - 7);

  // Random matrix based on hash
  let rng = Math.abs(hash);
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= gridSize - 8) || (r >= gridSize - 8 && c < 8)) {
        continue; // Corner regions
      }
      rng = (rng * 9301 + 49297) % 233280;
      if (rng / 233280 > 0.55) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}

// ==========================================
// 16-Slide Presentation Deck Logic
// ==========================================
state.showcaseMode = 'dashboard';
state.currentSlide = 1;

function toggleShowcaseMode(mode) {
  state.showcaseMode = mode;
  const dashEl = document.getElementById('showcase-dashboard');
  const slidesEl = document.getElementById('showcase-slides');
  const btnDash = document.getElementById('btn-mode-dashboard');
  const btnSlides = document.getElementById('btn-mode-slides');

  if (!dashEl || !slidesEl) return;

  if (mode === 'slides') {
    dashEl.classList.add('hidden');
    slidesEl.classList.remove('hidden');
    if (btnSlides && btnDash) {
      btnSlides.className = 'px-3 py-1 rounded font-bold bg-white text-blue-700 shadow-xs flex items-center gap-1.5 transition-all';
      btnDash.className = 'px-3 py-1 rounded font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all';
    }
    renderSlide(state.currentSlide);
  } else {
    slidesEl.classList.add('hidden');
    dashEl.classList.remove('hidden');
    if (btnSlides && btnDash) {
      btnDash.className = 'px-3 py-1 rounded font-bold bg-white text-blue-700 shadow-xs flex items-center gap-1.5 transition-all';
      btnSlides.className = 'px-3 py-1 rounded font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all';
    }
  }
}

function changeSlide(delta) {
  goToSlide(state.currentSlide + delta);
}

function goToSlide(slideNum) {
  const target = Math.max(1, Math.min(16, parseInt(slideNum) || 1));
  state.currentSlide = target;
  renderSlide(target);
}

function renderSlide(slideNum) {
  for (let i = 1; i <= 16; i++) {
    const el = document.getElementById(`slide-frame-${i}`);
    if (el) {
      if (i === slideNum) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  const indicator = document.getElementById('slide-number-indicator');
  if (indicator) indicator.textContent = `Slide ${slideNum} / 16`;

  const selector = document.getElementById('slide-picker-select');
  if (selector) selector.value = slideNum;

  const prevBtn = document.getElementById('slide-btn-prev');
  if (prevBtn) prevBtn.disabled = (slideNum === 1);

  const nextBtn = document.getElementById('slide-btn-next');
  if (nextBtn) nextBtn.disabled = (slideNum === 16);
}

function toggleSlideFullscreen() {
  const elem = document.getElementById('slide-presentation-viewport');
  if (!elem) return;
  if (!document.fullscreenElement) {
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

// Keyboard shortcuts for presentation mode
window.addEventListener('keydown', (e) => {
  if (state.currentView === 'showcase' && state.showcaseMode === 'slides') {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      changeSlide(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      changeSlide(-1);
    }
  }
});

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
  setUploadedFile('EIDT_Review1_SmartPrint.pdf', 16, 2.4);
  refreshOrders();

  // Periodic queue status check every 8 seconds
  setInterval(refreshOrders, 8000);
});

