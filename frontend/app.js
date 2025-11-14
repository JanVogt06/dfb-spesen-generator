// ===== State Management =====
let currentSession = null;
let matchesData = [];

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Event Listeners
    document.getElementById('credentialsForm').addEventListener('submit', handleGenerate);

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('matchModal').classList.contains('show')) {
            closeModal();
        }
    });
}

// ===== Main Generation Flow =====
async function handleGenerate(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('generateBtn');
    const btnText = btn.querySelector('span');

    if (!username || !password) {
        showStatus('Bitte geben Sie Benutzername und Passwort ein', 'error');
        return;
    }

    // UI Updates
    btn.disabled = true;
    btnText.textContent = 'Generiere...';
    showLoadingScreen();
    hideWelcomeScreen();

    try {
        // Start generation
        const response = await fetch(`${API_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                use_env_credentials: false
            })
        });

        if (!response.ok) {
            throw new Error('Fehler beim Starten der Generierung');
        }

        const data = await response.json();
        currentSession = data.session_id;

        showStatus('Generierung gestartet...', 'loading');

        // Wait for completion
        await waitForCompletion(currentSession);

    } catch (error) {
        console.error('Generation error:', error);
        showStatus('Fehler: ' + error.message, 'error');
        hideLoadingScreen();
        showWelcomeScreen();
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Spesen generieren';
    }
}

async function waitForCompletion(sessionId) {
    let attempts = 0;
    const maxAttempts = 60; // Max 2 minutes
    const checkInterval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${API_URL}/api/session/${sessionId}`);

            if (!response.ok) {
                throw new Error('Session nicht gefunden');
            }

            const data = await response.json();

            // Update progress bar with real data
            if (data.progress) {
                updateProgressBar(data.progress);
            }

            if (data.status === 'completed') {
                // Set to 100% before showing success
                updateProgressBar({ current: 100, total: 100, step: "Abgeschlossen!" });
                await sleep(500); // Short delay to show 100%

                showStatus(`Erfolgreich! ${data.files.length} Dokumente generiert`, 'success');
                await loadMatchesData(sessionId);
                hideLoadingScreen();
                showMatchesContainer();
                return;
            } else if (data.status === 'failed') {
                throw new Error('Generierung fehlgeschlagen');
            }

            attempts++;
            await sleep(checkInterval);

        } catch (error) {
            console.error('Status check error:', error);
            throw error;
        }
    }

    throw new Error('Timeout - Generierung dauert zu lange');
}

function updateProgressBar(progress) {
    const progressBar = document.getElementById('progressBar');
    const loadingText = document.querySelector('.loading-content p');

    if (!progress) return;

    const { current, total, step } = progress;

    // Calculate percentage
    let percentage = 0;
    if (total > 0) {
        percentage = Math.min(100, Math.round((current / total) * 100));
    } else if (current > 0) {
        // If we don't know total yet, show indeterminate progress
        percentage = 50;
    }

    // Update progress bar width
    progressBar.style.width = `${percentage}%`;
    progressBar.style.animation = 'none'; // Remove CSS animation
    progressBar.style.transition = 'width 0.3s ease';

    // Update text
    if (step) {
        if (total > 0) {
            loadingText.textContent = `${step} (${current}/${total})`;
        } else {
            loadingText.textContent = step;
        }
    }
}

async function loadMatchesData(sessionId) {
    try {
        const response = await fetch(`${API_URL}/api/download/${sessionId}/spesen_data.json`);

        if (!response.ok) {
            throw new Error('Fehler beim Laden der Spieldaten');
        }

        matchesData = await response.json();
        displayMatches(matchesData);
    } catch (error) {
        console.error('Load matches error:', error);
        throw error;
    }
}

// ===== Display Functions =====
function displayMatches(matches) {
    const grid = document.getElementById('matchesGrid');
    const countEl = document.getElementById('matchesCount');

    grid.innerHTML = '';
    countEl.textContent = `${matches.length} Spiel${matches.length !== 1 ? 'e' : ''} gefunden`;

    matches.forEach((match, index) => {
        const card = createMatchCard(match, index);
        grid.appendChild(card);
    });
}

function createMatchCard(match, index) {
    const info = match.spiel_info || {};
    const card = document.createElement('div');
    card.className = 'match-card';
    card.onclick = () => showMatchDetails(match, index);

    const heimTeam = info.heim_team || 'Unbekannt';
    const gastTeam = info.gast_team || 'Unbekannt';
    const anpfiff = info.anpfiff || '';
    const spielklasse = info.spielklasse || '';
    const mannschaftsart = info.mannschaftsart || '';

    card.innerHTML = `
        <div class="match-teams">${heimTeam} - ${gastTeam}</div>
        <div class="match-date">${anpfiff}</div>
        <div class="match-info">
            <span class="match-badge">${spielklasse}</span>
            ${mannschaftsart ? `<span class="match-badge">${mannschaftsart}</span>` : ''}
        </div>
    `;

    return card;
}

function showMatchDetails(match, index) {
    const modal = document.getElementById('matchModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const info = match.spiel_info || {};
    const venue = match.spielstaette || {};
    const referees = match.schiedsrichter || [];

    modalTitle.textContent = `${info.heim_team || '?'} - ${info.gast_team || '?'}`;

    let modalContent = `
        <div class="modal-section">
            <h3>Spielinformationen</h3>
            ${createDetailRow('Anpfiff', info.anpfiff || '-')}
            ${createDetailRow('Spielklasse', info.spielklasse || '-')}
            ${createDetailRow('Mannschaftsart', info.mannschaftsart || '-')}
            ${createDetailRow('Staffel', info.staffel || '-')}
            ${createDetailRow('Spieltag', info.spieltag || '-')}
        </div>

        <div class="modal-section">
            <h3>Spielstätte</h3>
            ${createDetailRow('Name', venue.name || '-')}
            ${createDetailRow('Adresse', venue.adresse || '-')}
            ${createDetailRow('Platztyp', venue.platz_typ || '-')}
        </div>

        <div class="modal-section">
            <h3>Schiedsrichter</h3>
            ${createRefereesSection(referees)}
        </div>

        <div class="download-section">
            ${createDownloadButtons(info)}
        </div>
    `;

    modalBody.innerHTML = modalContent;
    modal.classList.add('show');
}

function createDetailRow(label, value) {
    return `
        <div class="detail-row">
            <div class="detail-label">${label}:</div>
            <div class="detail-value">${value}</div>
        </div>
    `;
}

function createRefereesSection(referees) {
    if (referees.length === 0) {
        return '<p class="detail-value">Keine Schiedsrichter-Informationen verfügbar</p>';
    }

    return referees.map(ref => `
        <div class="referee-card">
            <div class="referee-role">${ref.rolle || 'Schiedsrichter'}</div>
            <div class="referee-info">
                ${ref.name || '-'}<br>
                ${ref.strasse || ''}<br>
                ${ref.plz_ort || ''}
            </div>
        </div>
    `).join('');
}

function createDownloadButtons(info) {
    const filename = generateFilename(info);

    return `
        <button class="btn btn-success" onclick="downloadFile('${filename}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>DOCX herunterladen</span>
        </button>
        <button class="btn btn-secondary" onclick="downloadAll()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Alle als ZIP</span>
        </button>
    `;
}

function generateFilename(info) {
    const heim = (info.heim_team || 'Heim').replace(/\//g, '-');
    const gast = (info.gast_team || 'Gast').replace(/\//g, '-');
    const datum = (info.anpfiff || '').split('·')[1]?.trim()?.replace(/\./g, '-') || '';
    return `Spesen_${heim}_vs_${gast}_${datum}.docx`;
}

// ===== Download Functions =====
function downloadFile(filename) {
    if (!currentSession) {
        showStatus('Keine Session verfügbar', 'error');
        return;
    }
    window.open(`${API_URL}/api/download/${currentSession}/${filename}`, '_blank');
}

function downloadAll() {
    if (!currentSession) {
        showStatus('Keine Session verfügbar', 'error');
        return;
    }
    window.open(`${API_URL}/api/download/${currentSession}/all`, '_blank');
}

// ===== Modal Functions =====
function closeModal() {
    document.getElementById('matchModal').classList.remove('show');
}

// ===== Status Banner =====
function showStatus(message, type = '') {
    const banner = document.getElementById('statusBanner');
    const messageEl = document.getElementById('statusMessage');
    const iconEl = document.getElementById('statusIcon');

    messageEl.textContent = message;
    banner.className = `status-banner ${type}`;

    // Set icon based on type
    if (type === 'success') {
        iconEl.innerHTML = '✓';
    } else if (type === 'error') {
        iconEl.innerHTML = '✕';
    } else if (type === 'loading') {
        iconEl.innerHTML = '⟳';
    } else {
        iconEl.innerHTML = 'ℹ';
    }

    banner.style.display = 'flex';

    // Auto-hide success and error messages
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            banner.style.display = 'none';
        }, 5000);
    }
}

function closeStatus() {
    document.getElementById('statusBanner').style.display = 'none';
}

// ===== Screen Management =====
function showWelcomeScreen() {
    document.getElementById('welcomeScreen').style.display = 'flex';
}

function hideWelcomeScreen() {
    document.getElementById('welcomeScreen').style.display = 'none';
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('progressBar');

    // Reset progress bar
    progressBar.style.width = '0%';
    progressBar.style.animation = 'none';

    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function showMatchesContainer() {
    document.getElementById('matchesContainer').style.display = 'block';
}

function hideMatchesContainer() {
    document.getElementById('matchesContainer').style.display = 'none';
}

// ===== Utility Functions =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Error Handling =====
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showStatus('Ein unerwarteter Fehler ist aufgetreten', 'error');
});