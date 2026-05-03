const filters = {
    studio: 'all',
    state: 'all'
};

function applyFilters() {
    // Update the Header Text
    const filterDisplay = document.getElementById('active-filters');
    let labels = [];

    // Check Studio filter
    if (filters.studio && filters.studio !== 'all') {
        const studioName = document.querySelector(`.filter-badge[data-type="studio"][data-value="${filters.studio}"]`).innerText;
        labels.push(studioName);
    }

    // Check State filter
    if (filters.state && filters.state !== 'all') {
        const stateName = document.querySelector(`.filter-badge[data-type="state"][data-value="${filters.state}"]`).innerText;
        labels.push(stateName);
    }

    // Join with a separator or clear if empty
    filterDisplay.innerText = labels.length > 0 ? `Showing: ${labels.join(' + ')}` : '';

    // Filter the Table Rows (Your existing row logic)
    document.querySelectorAll('.log-row').forEach(row => {
        const studioMatch = filters.studio === 'all' || row.dataset.studio === filters.studio;
        const stateMatch = filters.state === 'all' || row.dataset.type === filters.state;

        if (studioMatch && stateMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

let chatSocket;

function connect() {
    chatSocket = new WebSocket('ws://' + window.location.host + '/ws/dashboard/');

    chatSocket.onopen = function () {
        console.log("Connected to the server");
    };

    chatSocket.onmessage = function (e) {
        const data = JSON.parse(e.data);

        const updateBadge = (studioSlug, type, isOn) => {
            const studioEl = document.querySelector(`[data-unit="${studioSlug}"]`);
            if (!studioEl) return;

            const badge = studioEl.querySelector(`[data-type="${type}"]`);
            if (badge) {
                const activeClass = (type === 'mic') ? 'bg-success' : 'bg-danger';

                badge.classList.toggle(activeClass, isOn);
                badge.classList.toggle('bg-secondary', !isOn);
                badge.classList.toggle('text-dark', !isOn);

                badge.style.opacity = "1";
                badge.classList.remove("pe-none");
            }
        };

        // --- Update Studio UI Badges ---
        ['power', 'mic', 'record'].forEach(key => {
            if (data[key] !== undefined) {
                updateBadge(data.slug, key, data[key]);
            }
        });

        // --- Update Studio "On Air" Stations ---
        const container = document.getElementById(`${data.slug}-on-air`);

        if (container && data.on_air !== undefined) {
            if (data.on_air.length > 0) {
                container.innerHTML = data.on_air.map(stName =>
                    `<span class="cmd-btn badge p-2 bg-warning text-dark">${stName.toUpperCase()}</span>`
                ).join(' ');
            } else {
                container.innerHTML = '<span class="badge p-2 bg-secondary text-dark">OFF AIR</span>';
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

        let time = `<span class="d-none d-md-inline">${datePart}, </span><span class="fw-md-normal">${timePart}</span>`
        const loggableKeys = ['power', 'mic', 'record', 'on_air'];
        const activeKey = loggableKeys.find(key => data[key] !== undefined);

        if (activeKey) {
            let eventHtml = "";
            const value = data[activeKey];

            if (activeKey === 'power') {
                eventHtml = `<span class="badge p-2 ${value ? 'bg-danger' : 'bg-secondary text-dark'}">POWER</span>`;
            } else if (activeKey === 'mic') {
                eventHtml = `<span class="badge p-2 ${value ? 'bg-success' : 'bg-secondary text-dark'}">MIC</span>`;
            } else if (activeKey === 'record') {
                eventHtml = `<span class="badge p-2 ${value ? 'bg-danger' : 'bg-secondary text-dark'}">RECORD</span>`;
            } else if (activeKey === 'on_air') {
                if (value && value.length > 0) {
                    eventHtml = value.map(st => `<span class="badge p-2 bg-warning text-dark">${st.toUpperCase()}</span>`).join(' ');
                } else {
                    eventHtml = `<span class="badge p-2 bg-secondary text-dark">OFF AIR</span>`;
                }
            }

            const row = `
                <tr class="log-row ${data.level === 'danger' ? 'table-danger' : ''}" 
                    data-studio="${data.slug}" data-type="${activeKey}">
                    <td class="px-3"><span class="text-muted d-none d-md-inline">${datePart}, </span>${timePart}</td>
                    <td class="px-3">${data.name}</td>
                    <td class="px-3">${eventHtml}</td>
                </tr>`;

            const tbody = document.getElementById('log-table-body');
            if (tbody) {
                tbody.insertAdjacentHTML('afterbegin', row);
                if (tbody.rows.length > 100) tbody.deleteRow(-1);
            }
        }
        applyFilters();
    };

    chatSocket.onclose = function (e) {
        console.log("Socket closed. Attempting to reconnect in 2 seconds...");
        // Wait 2 seconds, then try to reconnect
        setTimeout(function () {
            connect();
        }, 2000);
    };

    chatSocket.onerror = function (err) {
        console.error("Socket error: ", err.message);
        chatSocket.close();
    };
}

connect();


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

document.querySelectorAll('.cmd-btn').forEach(badge => {
    badge.addEventListener('click', function () {
        const parent = this.closest('[data-unit]');
        const studioSlug = parent.dataset.unit;
        const commandType = this.dataset.type;
        const stationName = this.dataset.value;

        const isActive = !this.classList.contains('bg-secondary')

        let payload = { "slug": studioSlug };

        if (commandType === 'on-air') {
            payload[commandType] = stationName;
        } else {
            payload[commandType] = !isActive;
        }
        this.style.opacity = "0.5";
        this.classList.add("pe-none");

        if (chatSocket.readyState === WebSocket.OPEN) {
            chatSocket.send(JSON.stringify(payload));
        }
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

