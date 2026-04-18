const filters = {
    studio: 'all',
    state: 'all'
};
function applyFilters() {
    const studioFilter = filters['studio'] || 'all';
    const stateFilter = filters['state'] || 'all';

    document.querySelectorAll(".log-row").forEach(row => {
        const rowStudio = row.dataset.studio;
        const rowStates = row.dataset.states.split(' ');

        const matchesStudio = (studioFilter === 'all' || rowStudio === studioFilter);
        // Match if state is 'all' OR if the specific state key exists in this row's data
        const matchesState = (stateFilter === 'all' || rowStates.includes(stateFilter));

        if (matchesStudio && matchesState) {
            row.classList.remove('d-none');
        } else {
            row.classList.add('d-none');
        }
    });
}

const chatSocket = new WebSocket('ws://' + window.location.host + '/ws/dashboard/');

chatSocket.onopen = function (e) {
    console.log("Connected to the server");
};

chatSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);

    // --- Update Studio UI Badges ---
    const updateStatus = (selector, isOn, activeClass) => {
        const el = document.querySelector(`[data-unit="${data.slug}"].${selector}`);
        if (el && isOn !== undefined) {
            el.classList.toggle(activeClass, isOn);
            el.classList.toggle('bg-secondary', !isOn);
        }
    };

    updateStatus('power-status', data.power, 'bg-danger');
    updateStatus('mic-status', data.mic, 'bg-success');
    updateStatus('record-status', data.record, 'bg-danger');

    // --- Update Studio "On Air" Stations ---
    const container = document.getElementById(`${data.slug}-on-air`);

    if (container && data.on_air !== undefined) {
        if (data.on_air.length > 0) {
            container.innerHTML = data.on_air.map(stName =>
                `<span class="badge p-2 bg-warning text-dark">${stName.toUpperCase()}</span>`
            ).join(' ');
        } else {
            container.innerHTML = '<span class="badge p-2 bg-secondary">OFF AIR</span>';
        }
    }

    const now = new Date();
    const dayName = now.toLocaleDateString('en-GB', { weekday: 'short' });
    const monthName = now.toLocaleDateString('en-GB', { month: 'short' });
    const dayNum = now.getDate();

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"],
            v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const timePart = now.toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const datePart = `${dayName} ${monthName} ${dayNum}${getOrdinal(dayNum)}`;
    const msg = data;

    const svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>`

    // --- Build the activity string with status icons ---
    let time = `<span class="d-none d-md-inline">${datePart}, </span><span class="fw-md-normal">${timePart}</span>`
    let power = `<span class="${msg.power ? 'text-danger' : ''}">${svg}</span>`;
    let mic = `<span class="${msg.mic ? 'text-danger' : ''}">${msg.mic ? '🟢' : '⚪'}</span>`;
    let record = `<span class="${msg.record ? 'text-danger' : ''}">${msg.record ? '🔴' : '⚪'}</span>`;
    let activity = "";

    // --- Build the station badges for the log row
    if (msg.on_air && msg.on_air.length > 0) {
        const stationBadges = msg.on_air.map(st =>
            `<span class="badge p-2 bg-warning text-dark">${st.toUpperCase()}</span>`
        ).join(' ');
        activity = stationBadges;
    } else {
        activity = `<span class="badge p-2 bg-secondary">OFF AIR</span>`;
    }

    // Filtering
    const activeStates = [];
    if (msg.power === true) activeStates.push('power');
    if (msg.mic === true) activeStates.push('mic');
    if (msg.record === true) activeStates.push('record');

    if (msg.on_air && msg.on_air.length > 0) {
        activeStates.push('on_air');
    }

    const studioFilter = filters.studio || 'all';
    const stateFilter = filters.state || 'all';

    const matchesStudio = (studioFilter === 'all' || data.slug === studioFilter);
    const matchesState = (stateFilter === 'all' || activeStates.includes(stateFilter));

    const visibilityClass = (matchesStudio && matchesState) ? "" : "d-none";

    const row = `
        <tr class="log-row ${data.level === 'danger' ? 'table-danger' : ''}" 
            data-studio="${data.slug}" 
            data-states="${activeStates.join(' ')}">
            <td class="px-3">${time}</td>
            <td class="px-3">${data.name}</td>
            <td class="px-3">${power}</td>
            <td class="px-3">${mic}</td>
            <td class="px-3">${record}</td>
            <td class="px-3">${activity}</td>
        </tr>`;

    const tbody = document.getElementById('log-table-body');
    if (tbody) {
        tbody.insertAdjacentHTML('afterbegin', row);
        if (tbody.rows.length > 50) {
            tbody.deleteRow(-1);
        }
    }
    applyFilters();
};

document.querySelectorAll(".filter-badge").forEach(item => {
    item.addEventListener("click", function (e) {
        e.preventDefault();

        const type = this.dataset.type;
        const value = this.dataset.value;

        if (this.classList.contains('active') && value !== 'all') {
            filters[type] = 'all';
            this.classList.remove("active");

            const allButton = document.querySelector(`.filter-badge[data-type="${type}"][data-value="all"]`);
            if (allButton) {
                allButton.classList.add("active");
            }
        }
        else {
            filters[type] = value;

            if (value === 'all') {
                document.querySelectorAll(`.filter-badge[data-type="${type}"]`).forEach(i => i.classList.remove("active"));
            } else {
                document.querySelectorAll(`.filter-badge[data-type="${type}"]`).forEach(i => i.classList.remove("active"));
            }

            this.classList.add("active");
        }

        applyFilters();
    });
});

document.getElementById('addUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    form.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('is-invalid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(div => {
        div.innerText = '';
    });

    const response = await fetch('/api/create-user/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': formData.get('csrfmiddlewaretoken') }
    });

    const result = await response.json();

    if (response.ok) {
        form.reset();
        const modalElement = document.getElementById('addUserModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);

        if (modalInstance) {
            modalInstance.hide();
        }

        const toast = new bootstrap.Toast(document.getElementById('successToast'));
        toast.show();
    } else {
        for (const [field, messages] of Object.entries(result.errors)) {
            const inputField = form.querySelector(`[name="${field}"]`);
            const errorDiv = document.getElementById(`error_${field}`);

            if (inputField && errorDiv) {
                inputField.classList.add('is-invalid');
                errorDiv.innerText = messages.join(' ');
            }
        }
    }
};

