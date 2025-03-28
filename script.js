document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const playerSetupSection = document.getElementById('player-setup-section');
    const playerNamesInput = document.getElementById('player-names');
    const setupButton = document.getElementById('setup-button');
    const setupError = document.getElementById('setup-error');

    const starterSelectionSection = document.getElementById('starter-selection-section');
    const startingPlayerSelect = document.getElementById('starting-player-select');
    const startGameButton = document.getElementById('start-game-button');

    const gameSection = document.getElementById('game-section');
    const gameNumberDisplay = document.getElementById('game-number');
    const currentRoundDisplay = document.getElementById('current-round-number');
    const currentStarterDisplay = document.getElementById('current-round-starter'); // Strong element
    const dealerDisplaySpan = document.querySelector('.dealer-display'); // Parent span for highlight class
    const scoreHeader = document.getElementById('score-header');
    const scoreBody = document.getElementById('score-body');
    const scoreFooter = document.getElementById('score-footer');
    const totalRow = document.getElementById('total-row');
    const scoreInputArea = document.getElementById('score-input-area');
    const scoreInputsContainer = document.getElementById('score-inputs-container'); // Div containing inputs
    const addRoundButton = document.getElementById('add-round-button');
    const roundError = document.getElementById('round-error');

    const gameOverMessage = document.getElementById('game-over-message'); // Div for message content
    const winnerInfo = document.getElementById('winner-info'); // Paragraph inside game-over-message (if needed, or just set innerHTML)

    const chartContainer = document.getElementById('chart-container');
    const scoreChartCanvas = document.getElementById('scoreChartCanvas');

    const newGameButton = document.getElementById('new-game-button');

    // File Management & Stats Elements
    const csvUploadInput = document.getElementById('csv-upload');
    const loadStatus = document.getElementById('load-status');
    const downloadCsvButton = document.getElementById('download-csv-button');
    const toggleStatsButton = document.getElementById('toggle-stats-button');
    const statsDisplaySection = document.getElementById('stats-display-section');
    const statsFilters = document.getElementById('stats-filters');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterPlayersList = document.getElementById('filter-players-list');
    const applyFiltersButton = document.getElementById('apply-filters-button');
    const resetFiltersButton = document.getElementById('reset-filters-button');
    const statsContent = document.getElementById('stats-content');
    const statsLoadingMessage = document.getElementById('stats-loading-message');
    const statsErrorMessage = document.getElementById('stats-error-message');
    const overallStatsDisplay = document.getElementById('overall-stats');
    const sessionStatsDisplay = document.getElementById('session-stats');
    const perGameStatsDisplay = document.getElementById('per-game-stats');
    const winsPerPlayerList = document.getElementById('wins-per-player');
    const winStreaksList = document.getElementById('win-streaks');
    const headToHeadStatsDiv = document.getElementById('head-to-head-stats');
    const hiloRoundsStatsList = document.getElementById('hilo-rounds-stats');
    const sessionsListDiv = document.getElementById('sessions-list');
    const gamesListDiv = document.getElementById('games-list');
    const totalGamesSpan = document.getElementById('total-games');
    const closeStatsButton = document.getElementById('close-stats-button');
    const winsBarChartCanvas = document.getElementById('winsBarChartCanvas'); // Canvas for new chart

    // --- Constants ---
    const SCORE_LIMIT = 500;
    const WENT_OUT_INDEX_CSV_HEADER = "WentOutIndex"; // Header for new CSV column

    // --- Game State Variables ---
    let players = [];
    // Structure for currentGameData & objects in allGamesData:
    // { gameNumber, startingPlayer, players: [], rounds: [[score1, score2,...], ...], roundWinners: [index1, index2,...], totals: [], isOver: false, currentDealerIndex, gameEndTime: null }
    let currentGameData = null;
    let allGamesData = [];
    let scoreChart = null; // Current game line chart
    let winsBarChart = null; // Stats bar chart
    let gameCounter = 0;
    let unsavedChanges = false; // Flag for unsaved data in current session

    // --- Chart Colors ---
    const chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56', '#C9CBCF'];

    // --- Initialization ---
    function initializeUI() {
        playerSetupSection.style.display = 'block';
        starterSelectionSection.style.display = 'none';
        gameSection.style.display = 'none';
        gameOverMessage.style.display = 'none';
        newGameButton.style.display = 'none';
        chartContainer.style.display = 'none';
        statsDisplaySection.style.display = 'none';
        loadStatus.textContent = 'Ei tiedostoa ladattu.';
        loadStatus.className = 'status-message';
        csvUploadInput.value = '';
        csvUploadInput.disabled = false; // Enable upload initially
        downloadCsvButton.disabled = true;
        unsavedChanges = false;
    }

    // --- Confirmation Dialog ---
    function confirmAction(message) {
        return confirm(message); // Use browser's built-in confirm
    }

    // --- File Upload & CSV Parsing ---
    function handleFileUpload(event) {
        // Confirmation before loading if potentially unsaved data exists
        if (unsavedChanges && !confirmAction("Haluatko varmasti ladata uuden tiedoston? Nykyisen session tallentamattomat tiedot (pelaamasi pelit/kierrokset) menetetään.")) {
            csvUploadInput.value = ''; // Reset file input if cancelled
            return;
        }

        const file = event.target.files[0];
        // ... (rest of file validation remains same) ...
         if (!file) { /* ... */ return; }
         if (!file.name.toLowerCase().endsWith('.csv')) { /* ... */ return; }

        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result;
            try {
                parseCsvData(csvContent); // Updates allGamesData, gameCounter, players
                loadStatus.textContent = `Tiedosto "${file.name}" ladattu. ${allGamesData.length} peliä löydetty.`;
                loadStatus.className = 'status-message';

                if (players.length > 0) {
                    playerNamesInput.value = players.join(', ');
                    playerNamesInput.disabled = true; setupButton.disabled = true;
                    populateStarterDropdown(players); // Update player lists
                    updatePlayerFilterCheckboxes(players); // Update stats filters
                    starterSelectionSection.style.display = 'block';
                    playerSetupSection.style.display = 'none';
                    downloadCsvButton.disabled = false;
                    csvUploadInput.disabled = true; // Disable after successful load
                    unsavedChanges = false; // Reset flag after successful load
                } else { /* ... handle no players found ... */ }
            } catch (error) { /* ... handle parsing error ... */ }
        };
        reader.onerror = function() { /* ... handle read error ... */ };
        reader.readAsText(file, 'UTF-8');
    }

    function parseCsvData(csvString) {
        // Robustness: Basic check for empty/too short content
        if (!csvString || csvString.length < 10) {
            throw new Error("Tiedosto vaikuttaa tyhjältä tai liian lyhyeltä.");
        }

        const lines = csvString.replace(/^\uFEFF/, '').split(/\r?\n/); // Remove BOM, Split lines
        let loadedGames = [];
        let currentParsedGame = null;
        let highestGameNumber = 0;
        let parsedPlayers = [];
        let expectedColumns = 0;
        let wentOutIndexCol = -1; // Index of the "WentOutIndex" column

        function parseCsvLine(line) { /* ... (same as before) ... */
             const values = []; let currentVal = ''; let inQuotes = false;
             for (let i = 0; i < line.length; i++) {
                 const char = line[i];
                 if (char === '"') { if (inQuotes && line[i + 1] === '"') { currentVal += '"'; i++; } else { inQuotes = !inQuotes; } }
                 else if (char === ',' && !inQuotes) { values.push(currentVal.trim()); currentVal = ''; }
                 else { currentVal += char; }
             }
             values.push(currentVal.trim()); return values;
        }

        lines.forEach((line, lineIndex) => {
            if (!line.trim()) { // Blank line potentially ends a game block
                if (currentParsedGame && currentParsedGame.rounds.length > 0) { loadedGames.push(currentParsedGame); }
                currentParsedGame = null; return;
            }
            const values = parseCsvLine(line);

            try { // Add try block per line for better error pinpointing
                if (values[0] === 'Peli' && values.length > 1) {
                    if (currentParsedGame && currentParsedGame.rounds.length > 0) { loadedGames.push(currentParsedGame); }
                    const gameNum = parseInt(values[1], 10);
                    if (!isNaN(gameNum)) {
                        currentParsedGame = { gameNumber: gameNum, players: [], rounds: [], roundWinners: [], totals: [], isOver: false, gameEndTime: null, startingPlayer: null };
                        if (gameNum > highestGameNumber) highestGameNumber = gameNum;
                        wentOutIndexCol = -1; // Reset for each game
                    } else { currentParsedGame = null; throw new Error("Virheellinen pelinumero."); }
                } else if (currentParsedGame && values[0] === 'Pelin päättymisaika') {
                    if(values.length > 1) currentParsedGame.gameEndTime = values[1];
                    currentParsedGame.isOver = true;
                } else if (currentParsedGame && values[0] === 'Kierros') { // Header row
                     if (values.length < 2) throw new Error("Header-rivillä liian vähän sarakkeita.");
                    if (parsedPlayers.length === 0) { parsedPlayers = values.slice(1).filter(p => p !== WENT_OUT_INDEX_CSV_HEADER); } // Get players first time
                    currentParsedGame.players = [...parsedPlayers];
                    currentParsedGame.totals = new Array(parsedPlayers.length).fill(0);
                    expectedColumns = parsedPlayers.length + 1; // Round num + players
                    // Check for the new WentOutIndex column
                    wentOutIndexCol = values.indexOf(WENT_OUT_INDEX_CSV_HEADER); // Find index, -1 if not found
                     if (wentOutIndexCol !== -1) expectedColumns++; // Expect one more column if header exists
                } else if (currentParsedGame && /^\d+$/.test(values[0])) { // Round data row
                    if (values.length < expectedColumns) throw new Error(`Odotettiin ${expectedColumns} saraketta, löytyi ${values.length}.`);
                    if (currentParsedGame.players.length === 0) throw new Error("Pelaajia ei määritelty ennen kierrostietoja.");

                    const roundScores = values.slice(1, currentParsedGame.players.length + 1).map(score => parseInt(score, 10));
                    if (roundScores.some(isNaN)) throw new Error("Virheellisiä pistearvoja.");

                    currentParsedGame.rounds.push(roundScores);
                    roundScores.forEach((score, index) => { currentParsedGame.totals[index] += score; });

                    // Parse WentOutIndex if column exists
                    let winnerIndex = -1;
                    if (wentOutIndexCol !== -1 && values.length > wentOutIndexCol) {
                        winnerIndex = parseInt(values[wentOutIndexCol], 10);
                        if (isNaN(winnerIndex)) winnerIndex = -1; // Default to -1 if not a number
                    } else {
                        // Fallback for old CSVs: find index based on score 0
                        winnerIndex = roundScores.indexOf(0);
                    }
                    currentParsedGame.roundWinners.push(winnerIndex);

                } else if (currentParsedGame && values[0] === 'Yhteensä') { // Total row
                    if (currentParsedGame && currentParsedGame.rounds.length > 0) { loadedGames.push(currentParsedGame); }
                    currentParsedGame = null;
                }
                 // Ignore other unknown lines silently? Or throw error? Let's ignore for now.

             } catch (err) {
                 // Provide context for the error
                 throw new Error(`Virhe CSV-tiedoston rivillä ${lineIndex + 1} ("${line.substring(0, 50)}..."): ${err.message}`);
             }
        });
        // Add last game if needed
        if (currentParsedGame && currentParsedGame.rounds.length > 0) { loadedGames.push(currentParsedGame); }

        // Update global state
        if (loadedGames.length > 0) {
            allGamesData = loadedGames; gameCounter = highestGameNumber;
             if (parsedPlayers.length > 0) { players = [...parsedPlayers]; }
             else if (allGamesData[0]?.players?.length > 0) { players = [...allGamesData[0].players]; console.warn("Pelaajia ei voitu lukea headerista, käytetään ensimmäisen pelin pelaajia."); }
             else { throw new Error("Pelaajia ei löytynyt tiedostosta."); }
        } else { throw new Error("Ei löytynyt kelvollista pelidataa."); }
    }


    // --- Player Setup & Game Start ---
    function populateStarterDropdown(playerList) { /* ... (same as before) ... */
         startingPlayerSelect.innerHTML = ''; playerList.forEach((p, i) => { const o = document.createElement('option'); o.value = i; o.textContent = p; startingPlayerSelect.appendChild(o); });
     }

    function setupPlayers() { /* ... (same as before, now sets unsavedChanges) ... */
         const names = playerNamesInput.value.split(',').map(name => name.trim()).filter(name => name.length > 0);
         if (names.length < 2) { setupError.textContent = 'Syötä vähintään kahden pelaajan nimet.'; setupError.style.display = 'block'; return; }
         players = names; updatePlayerFilterCheckboxes(players); // Update filters
         setupError.style.display = 'none'; playerSetupSection.style.display = 'none';
         populateStarterDropdown(players); starterSelectionSection.style.display = 'block';
         downloadCsvButton.disabled = false;
         unsavedChanges = true; // Manual setup implies potential changes
     }

    function startGame() {
        if (players.length < 2) return;
        // No confirmation needed here, starting a game *after* setup/load is expected

        const startingPlayerIndex = parseInt(startingPlayerSelect.value, 10);
        gameCounter++;

        currentGameData = {
            gameNumber: gameCounter, startingPlayer: players[startingPlayerIndex], players: [...players],
            rounds: [], roundWinners: [], // Initialize new array
            totals: players.map(() => 0), isOver: false,
            currentDealerIndex: startingPlayerIndex, gameEndTime: null
        };

        // UI Build / Reset
        gameNumberDisplay.textContent = currentGameData.gameNumber;
        buildScoreTable(); createScoreInputs(); updateRoundStarterDisplay();
        gameOverMessage.style.display = 'none'; gameOverMessage.innerHTML = ''; // Clear content too
        newGameButton.style.display = 'none'; roundError.style.display = 'none';
        addRoundButton.disabled = false;
        scoreInputsContainer.querySelectorAll('.score-input').forEach(input => input.disabled = false);
        starterSelectionSection.style.display = 'none'; gameSection.style.display = 'block';
        chartContainer.style.display = 'block';

        initializeChart();
        unsavedChanges = true; // Starting a game marks unsaved changes
    }

    // --- UI Building Helpers ---
    function buildScoreTable() { /* ... (same as before) ... */
        scoreHeader.innerHTML = ''; const hr = scoreHeader.insertRow(); hr.insertCell().textContent = 'Kierros';
        currentGameData.players.forEach(p => { hr.insertCell().textContent = p; });
        scoreBody.innerHTML = ''; totalRow.innerHTML = '';
        const tdl = totalRow.insertCell(); tdl.textContent = 'Yhteensä';
        currentGameData.players.forEach((_, i) => { const td = totalRow.insertCell(); td.id = `total-player-${i}`; td.textContent = '0'; });
    }

    function createScoreInputs() {
        scoreInputsContainer.innerHTML = ''; // Clear only the container
        currentGameData.players.forEach((player, index) => {
            const div = document.createElement('div'); const label = document.createElement('label');
            label.htmlFor = `score-input-${index}`; label.textContent = `${player}:`;
            const input = document.createElement('input'); input.type = 'number'; input.id = `score-input-${index}`;
            input.className = 'score-input'; input.min = "0"; input.placeholder = "Pisteet";
            div.appendChild(label); div.appendChild(input); scoreInputsContainer.appendChild(div);
        });
         // Ensure button and error are outside the container or re-added correctly if needed
         // They are currently outside scoreInputsContainer in HTML, which is fine.
    }

    // --- Round Logic ---
    function updateRoundStarterDisplay() {
        if (!currentGameData) return;
        const roundNum = currentGameData.rounds.length + 1;
        const dealerIndex = currentGameData.currentDealerIndex;
        const dealerName = currentGameData.players[dealerIndex];
        currentRoundDisplay.textContent = roundNum;
        currentStarterDisplay.textContent = dealerName;
        // Dealer Highlight
        document.querySelectorAll('.dealer-display').forEach(el => el.classList.remove('highlight')); // Remove from others if structure changes
        if (dealerDisplaySpan) dealerDisplaySpan.classList.add('highlight'); // Add to current
    }

    function addRound() {
        if (!currentGameData || currentGameData.isOver) return;

        const scores = []; let isValid = true; let zeroCount = 0; let winnerIndex = -1;
        roundError.style.display = 'none';

        const inputs = scoreInputsContainer.querySelectorAll('.score-input');
        inputs.forEach((input, index) => {
            const score = parseInt(input.value, 10);
            if (isNaN(score) || score < 0) { isValid = false; }
            else { scores[index] = score; if (score === 0) { zeroCount++; winnerIndex = index; } }
        });

        if (!isValid) { roundError.textContent = 'Pisteiden on oltava numeroita (0 tai suurempi).'; roundError.style.display = 'block'; return; }
        if (zeroCount !== 1) { roundError.textContent = 'Tasan yhden pelaajan pisteiden tulee olla 0.'; roundError.style.display = 'block'; return; }

        // Data Update
        currentGameData.rounds.push(scores);
        currentGameData.roundWinners.push(winnerIndex); // Store winner index

        // UI Update (Table)
        const roundNum = currentGameData.rounds.length;
        const row = scoreBody.insertRow(); row.insertCell().textContent = roundNum;
        scores.forEach(score => { row.insertCell().textContent = score; });
        row.classList.add('flash'); // Add class for animation
        setTimeout(() => row.classList.remove('flash'), 500); // Remove class after animation

        // UI & Data Update (Totals)
        scores.forEach((score, index) => {
            currentGameData.totals[index] += score;
            document.getElementById(`total-player-${index}`).textContent = currentGameData.totals[index];
        });

        inputs.forEach(input => input.value = ''); // Clear inputs
        updateChart(); // Chart Update
        unsavedChanges = true; // Adding a round marks unsaved changes

        // Check Game End Condition
        if (currentGameData.totals.some(total => total >= SCORE_LIMIT)) {
            endGame();
        } else {
            currentGameData.currentDealerIndex = (currentGameData.currentDealerIndex + 1) % currentGameData.players.length;
            updateRoundStarterDisplay();
        }
    }

    // --- Charting ---
    function initializeChart() { /* ... (same as before) ... */
         if (scoreChart) { scoreChart.destroy(); }
         const ctx = scoreChartCanvas.getContext('2d');
         const datasets = currentGameData.players.map((p, i) => ({ label: p, data: [0], borderColor: chartColors[i % chartColors.length], tension: 0.1, fill: false }));
         scoreChart = new Chart(ctx, { type: 'line', data: { labels: [0], datasets: datasets }, options: { responsive: true, scales: { x: { title: { display: true, text: 'Kierros' } }, y: { title: { display: true, text: 'Pisteet Yhteensä' }, beginAtZero: true } } } });
     }
    function updateChart() { /* ... (same as before) ... */
         if (!scoreChart || !currentGameData) return;
         const roundNum = currentGameData.rounds.length; scoreChart.data.labels.push(roundNum);
         scoreChart.data.datasets.forEach((ds, i) => { ds.data.push(currentGameData.totals[i]); });
         scoreChart.update();
     }

     // New: Wins Bar Chart for Stats
     function createWinsBarChart(dataForChart) {
        if(winsBarChart) winsBarChart.destroy(); // Destroy previous if exists

        const ctx = winsBarChartCanvas.getContext('2d');
        const winCounts = calculateWinCounts(dataForChart); // Use helper
        const chartLabels = Object.keys(winCounts);
        const chartData = Object.values(winCounts);

        winsBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Pelivoitot',
                    data: chartData,
                    backgroundColor: chartLabels.map((_, i) => chartColors[i % chartColors.length]),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow flexibility in container
                indexAxis: 'y', // Horizontal bar chart can be nice for names
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: 'Voittojen määrä'} },
                    y: { title: { display: true, text: 'Pelaaja'} }
                },
                plugins: { legend: { display: false } } // Hide legend if only one dataset
            }
        });
    }

    // --- Game End & New Game ---
    function endGame() {
        currentGameData.isOver = true;
        currentGameData.gameEndTime = new Date().toLocaleString('fi-FI');

        const minScore = Math.min(...currentGameData.totals);
        const winners = currentGameData.players.filter((_, index) => currentGameData.totals[index] === minScore);
        let winnerText = winners.length === 1 ? `Voittaja on ${winners[0]} (${minScore} p.)!` : `Tasapeli! Voittajat: ${winners.join(', ')} (${minScore} p.)!`;

        gameOverMessage.innerHTML = `<h2>Peli Päättyi!</h2><p>${winnerText}</p>`; // Set content
        gameOverMessage.style.display = 'block';
        addRoundButton.disabled = true;
        scoreInputsContainer.querySelectorAll('.score-input').forEach(input => input.disabled = true);
        newGameButton.style.display = 'inline-block';

        // Store completed game data
        const existingGameIndex = allGamesData.findIndex(g => g.gameNumber === currentGameData.gameNumber);
        if (existingGameIndex !== -1) { allGamesData[existingGameIndex] = JSON.parse(JSON.stringify(currentGameData)); }
        else { allGamesData.push(JSON.parse(JSON.stringify(currentGameData))); }
        unsavedChanges = true; // Game ended, data changed
    }

    function startNewGame() {
        // Confirmation before starting if current game is ongoing
        if (currentGameData && !currentGameData.isOver && !confirmAction("Haluatko varmasti aloittaa uuden pelin? Nykyisen keskeneräisen pelin tietoja ei tallenneta (paitsi lopulliseen CSV-tiedostoon).")) {
            return; // Cancel start
        }

        if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
        gameSection.style.display = 'none'; chartContainer.style.display = 'none';
        gameOverMessage.style.display = 'none'; newGameButton.style.display = 'none';
        scoreHeader.innerHTML = ''; scoreBody.innerHTML = ''; totalRow.innerHTML = '';
        scoreInputsContainer.innerHTML = ''; // Clear inputs container
        currentGameData = null; // Reset current game

        if (players.length > 0) {
            populateStarterDropdown(players);
            starterSelectionSection.style.display = 'block';
        } else { playerSetupSection.style.display = 'block'; /* ... */ }
        // unsavedChanges remains true until saved
    }

    // --- CSV Export ---
    function escapeCsvCell(cellData) { /* ... (same as before) ... */
        const str = String(cellData ?? ''); if (str.includes(',') || str.includes('"') || str.includes('\n')) { return `"${str.replace(/"/g, '""')}"`; } return str;
    }

    function generateCsvContent() {
        let csvContent = "";
        let dataToExport = [...allGamesData];
        if (currentGameData) { // Always include current game data if exists
            const gameIndex = dataToExport.findIndex(game => game.gameNumber === currentGameData.gameNumber);
            if (gameIndex !== -1) { dataToExport[gameIndex] = JSON.parse(JSON.stringify(currentGameData)); }
            else { dataToExport.push(JSON.parse(JSON.stringify(currentGameData))); }
        }
        dataToExport.sort((a, b) => a.gameNumber - b.gameNumber);

        const addGameToCSV = (gameData) => {
            if (!gameData || !gameData.players) return;
            csvContent += `"Peli",${escapeCsvCell(gameData.gameNumber)}\n`;
            if (gameData.gameEndTime) { csvContent += `"Pelin päättymisaika",${escapeCsvCell(gameData.gameEndTime)}\n`; }
            // Add WentOutIndex to header if data exists
            const headers = ["Kierros", ...gameData.players];
            if(gameData.roundWinners && gameData.roundWinners.length > 0) {
                 headers.push(WENT_OUT_INDEX_CSV_HEADER);
            }
            csvContent += headers.map(escapeCsvCell).join(',') + "\n";
            // Rounds
            gameData.rounds.forEach((roundScores, roundIndex) => {
                let rowData = [roundIndex + 1, ...roundScores];
                 // Add winner index, default to -1 if missing for robustness
                let winnerIndex = gameData.roundWinners?.[roundIndex] ?? -1;
                if(headers.includes(WENT_OUT_INDEX_CSV_HEADER)) { // Only add if header is present
                    rowData.push(winnerIndex);
                }
                csvContent += rowData.map(escapeCsvCell).join(',') + "\n";
            });
            csvContent += ["Yhteensä", ...gameData.totals].map(escapeCsvCell).join(',') + "\n"; // Totals
            csvContent += "\n";
        };

        dataToExport.forEach(addGameToCSV);
        return csvContent;
    }

    function downloadCSV() {
        const csvData = generateCsvContent();
        if (!csvData) { alert("Ei tallennettavaa pelidataa."); return; }

        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.setAttribute('href', url);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `uno_pisteet_${timestamp}.csv`);
        link.style.visibility = 'hidden'; document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
        unsavedChanges = false; // Mark as saved after download
        loadStatus.textContent = "Data tallennettu CSV-tiedostoon."; // Update status
        loadStatus.className = 'status-message';
    }

     // --- Statistics Display Logic ---
     function toggleStatsDisplay() {
         if (statsDisplaySection.style.display === 'none') {
             // Show Stats
             statsLoadingMessage.style.display = 'block'; statsErrorMessage.style.display = 'none';
             overallStatsDisplay.style.display = 'none'; sessionStatsDisplay.style.display = 'none';
             perGameStatsDisplay.style.display = 'none';
             statsDisplaySection.style.display = 'block';

             // Apply filters and display
             applyAndDisplayStats();

         } else {
             // Hide Stats
             statsDisplaySection.style.display = 'none';
             // Optionally destroy stats charts to free memory if needed
             if(winsBarChart) { winsBarChart.destroy(); winsBarChart = null; }
         }
     }

    function applyAndDisplayStats() {
         statsLoadingMessage.style.display = 'block';
         statsErrorMessage.style.display = 'none';
         overallStatsDisplay.style.display = 'none';
         sessionStatsDisplay.style.display = 'none';
         perGameStatsDisplay.style.display = 'none';
         if(winsBarChart) { winsBarChart.destroy(); winsBarChart = null; } // Clear old chart

        setTimeout(() => { // Delay for UX
             try {
                 let dataForStats = [...allGamesData];
                 if (currentGameData) { // Include current game (snapshot)
                    const gameIndex = dataForStats.findIndex(g => g.gameNumber === currentGameData.gameNumber);
                    const currentSnapshot = JSON.parse(JSON.stringify(currentGameData)); // Use a copy
                    if (gameIndex !== -1) { dataForStats[gameIndex] = currentSnapshot; }
                    else { dataForStats.push(currentSnapshot); }
                 }

                 // Apply Filters
                 const filters = getStatsFilters();
                 const filteredData = applyFilters(dataForStats, filters);

                 if (filteredData.length === 0) {
                     statsLoadingMessage.style.display = 'none';
                     statsErrorMessage.textContent = "Ei dataa valituilla suodattimilla.";
                     statsErrorMessage.style.display = 'block';
                     return;
                 }

                 // Calculate and Display
                 displayOverallStats_internal(filteredData);
                 displaySessionStats_internal(filteredData);
                 displayPerGameStats_internal(filteredData);
                 createWinsBarChart(filteredData); // Create new bar chart

                 overallStatsDisplay.style.display = 'block';
                 sessionStatsDisplay.style.display = 'block';
                 perGameStatsDisplay.style.display = 'block';
                 statsLoadingMessage.style.display = 'none';

             } catch (error) {
                 console.error("Error calculating/displaying stats:", error);
                 statsLoadingMessage.style.display = 'none';
                 statsErrorMessage.textContent = `Virhe tilastoja näyttäessä: ${error.message}`;
                 statsErrorMessage.style.display = 'block';
             }
         }, 50);
     }


     // --- Statistics Filters ---
     function updatePlayerFilterCheckboxes(playerList) {
         filterPlayersList.innerHTML = ''; // Clear old
         if (playerList.length > 0) {
             playerList.forEach(player => {
                 const label = document.createElement('label');
                 const checkbox = document.createElement('input');
                 checkbox.type = 'checkbox';
                 checkbox.value = player;
                 checkbox.checked = true; // Default to all checked
                 checkbox.className = 'filter-player-checkbox';
                 label.appendChild(checkbox);
                 label.appendChild(document.createTextNode(` ${player}`));
                 filterPlayersList.appendChild(label);
             });
         } else {
             filterPlayersList.innerHTML = '<small>(Ei pelaajia)</small>';
         }
     }

     function getStatsFilters() {
         const selectedPlayers = [];
         filterPlayersList.querySelectorAll('.filter-player-checkbox:checked').forEach(cb => {
             selectedPlayers.push(cb.value);
         });
         return {
             startDate: filterDateStart.value ? new Date(filterDateStart.value) : null,
             endDate: filterDateEnd.value ? new Date(filterDateEnd.value) : null,
             players: selectedPlayers
         };
     }

     function applyFilters(data, filters) {
         return data.filter(game => {
             // Date Filter (based on gameEndTime)
             let dateMatch = true;
             if (game.gameEndTime && (filters.startDate || filters.endDate)) {
                 try {
                     const dateTimeParts = game.gameEndTime.split(',');
                     const dateParts = dateTimeParts[0].split('.');
                     if (dateParts.length === 3) {
                         // Compare dates only, ignore time for simplicity
                         const gameDate = new Date(dateParts[2], parseInt(dateParts[1]) - 1, dateParts[0]);
                         gameDate.setHours(0, 0, 0, 0); // Normalize to start of day
                          if (filters.startDate) {
                              const filterStart = new Date(filters.startDate); filterStart.setHours(0,0,0,0);
                              if (gameDate < filterStart) dateMatch = false;
                          }
                          if (filters.endDate) {
                              const filterEnd = new Date(filters.endDate); filterEnd.setHours(0,0,0,0);
                              if (gameDate > filterEnd) dateMatch = false;
                          }
                     } else { dateMatch = false; } // Invalid date format
                 } catch { dateMatch = false; } // Error parsing date
             } else if (filters.startDate || filters.endDate) {
                 // If filtering by date but game has no end time, exclude it? Or include? Let's exclude.
                 dateMatch = false;
             }

             // Player Filter (game must include ALL selected players to match)
             let playerMatch = true;
             if (filters.players.length > 0 && game.players) {
                 playerMatch = filters.players.every(pFilter => game.players.includes(pFilter));
             } else if (filters.players.length > 0 && !game.players) {
                  playerMatch = false; // Cannot match if game has no players defined
             }


             return dateMatch && playerMatch;
         });
     }

     function resetFilters() {
         filterDateStart.value = '';
         filterDateEnd.value = '';
         filterPlayersList.querySelectorAll('.filter-player-checkbox').forEach(cb => {
             cb.checked = true; // Check all players
         });
         applyAndDisplayStats(); // Re-apply with default filters
     }


     // --- Statistics Calculation/Display Functions ---

     // Helper to get win counts
     function calculateWinCounts(games) {
        const playerWins = {};
        games.forEach(game => {
            if (game.isOver && game.players && game.totals) {
                const minScore = Math.min(...game.totals.filter(s => typeof s === 'number'));
                if(minScore === Infinity) return; // No valid scores
                game.players.forEach((player, index) => {
                    if (!playerWins[player]) playerWins[player] = 0;
                    if (game.totals[index] === minScore) {
                        playerWins[player]++;
                    }
                });
            }
        });
        return playerWins;
     }

     // Overall Stats
    function displayOverallStats_internal(games) {
        totalGamesSpan.textContent = games.length;
        const playerWins = calculateWinCounts(games); // Use helper

        const playerScores = {}; const playerRoundsPlayed = {}; const playerGamesPlayed = {};
        let allPlayersInFiltered = new Set();
        let bestRound = { score: Infinity, player: null, game: null, round: null };
        let worstRound = { score: -Infinity, player: null, game: null, round: null };

        games.forEach(game => {
            if (!game.players) return;
            game.players.forEach(p => {
                allPlayersInFiltered.add(p);
                 if (!playerScores[p]) playerScores[p] = 0;
                 if (!playerRoundsPlayed[p]) playerRoundsPlayed[p] = 0;
                 if (!playerGamesPlayed[p]) playerGamesPlayed[p] = 0;
                 playerGamesPlayed[p]++;
            });
            game.rounds.forEach((roundScores, roundIndex) => {
                roundScores.forEach((score, playerIndex) => {
                    const player = game.players[playerIndex];
                    if(player){
                         playerScores[player] += score;
                         playerRoundsPlayed[player]++;
                         // Check Hi/Lo (only if score is not 0?) - Let's count 0 too.
                         if (score < bestRound.score) bestRound = { score, player, game: game.gameNumber, round: roundIndex + 1};
                         if (score > worstRound.score) worstRound = { score, player, game: game.gameNumber, round: roundIndex + 1};
                    }
                });
            });
        });

        // Wins List
        winsPerPlayerList.innerHTML = '';
        const sortedPlayersByWins = Array.from(allPlayersInFiltered).sort((a, b) => (playerWins[b] || 0) - (playerWins[a] || 0));
        sortedPlayersByWins.forEach(player => {
             const gamesPlayed = playerGamesPlayed[player] || 0;
             const winPercentage = gamesPlayed > 0 ? (((playerWins[player] || 0) / gamesPlayed) * 100).toFixed(1) : 0;
             winsPerPlayerList.innerHTML += `<li>${player}: ${playerWins[player] || 0} voittoa (${winPercentage}%)</li>`;
        });

         // Win Streaks
        const streaks = calculateWinStreaks(games);
        winStreaksList.innerHTML = '';
         sortedPlayersByWins.forEach(player => { // Sort by wins for consistency
             winStreaksList.innerHTML += `<li>${player}: ${streaks[player] || 0}</li>`;
         });


        // Head-to-Head
         displayHeadToHead(games, Array.from(allPlayersInFiltered));


        // Hi/Lo Rounds
         hiloRoundsStatsList.innerHTML = '';
         if (bestRound.player) {
             hiloRoundsStatsList.innerHTML += `<li>Matalin kierros: ${bestRound.score}p (${bestRound.player}, Peli ${bestRound.game}, Kr ${bestRound.round})</li>`;
         } else { hiloRoundsStatsList.innerHTML += `<li>Matalin kierros: -</li>`; }
         if (worstRound.player) {
             hiloRoundsStatsList.innerHTML += `<li>Korkein kierros: ${worstRound.score}p (${worstRound.player}, Peli ${worstRound.game}, Kr ${worstRound.round})</li>`;
         } else { hiloRoundsStatsList.innerHTML += `<li>Korkein kierros: -</li>`; }

     }

     // Session Stats
     function displaySessionStats_internal(games) { /* ... (logic largely same, uses filtered games) ... */
         const sessions = {}; // Group by date
         games.forEach(game => {
             if (!game.gameEndTime) return;
             try {
                 const dateTimeParts = game.gameEndTime.split(','); const dateParts = dateTimeParts[0].split('.');
                 if (dateParts.length === 3) {
                     const dateKey = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
                     const gameDate = new Date(dateParts[2], parseInt(dateParts[1]) - 1, dateParts[0]);
                     if (!sessions[dateKey]) { sessions[dateKey] = { games: [], date: gameDate }; }
                     sessions[dateKey].games.push(game);
                 }
             } catch {} // Ignore parsing errors here
         });

         sessionsListDiv.innerHTML = '';
         const sortedSessionKeys = Object.keys(sessions).sort((a, b) => sessions[b].date - sessions[a].date);
         if (sortedSessionKeys.length === 0) { sessionsListDiv.innerHTML = "<p>Ei päättyneitä pelejä sessioittain valitulla suodattimella.</p>"; return; }

         sortedSessionKeys.forEach(dateKey => {
             const session = sessions[dateKey]; const sessionDiv = document.createElement('div');
             const dateString = session.date.toLocaleDateString('fi-FI');
             sessionDiv.innerHTML = `<h3>Pelipäivä: ${dateString}</h3><p>Pelattuja pelejä: ${session.games.length}</p>`;
             const dailyWins = calculateWinCounts(session.games); // Use helper for session games
             const maxDailyWins = Math.max(0, ...Object.values(dailyWins));
             const dailyWinners = Object.keys(dailyWins).filter(player => dailyWins[player] === maxDailyWins);
             if (dailyWinners.length > 0) {
                 sessionDiv.innerHTML += `<p>Päivän voittaja(t): <strong>${dailyWinners.join(', ')}</strong> (${maxDailyWins} voittoa)</p>`;
             }
             sessionsListDiv.appendChild(sessionDiv);
         });
     }

     // Per Game Stats (Updated to show round winner)
     function displayPerGameStats_internal(games) {
        gamesListDiv.innerHTML = '';
        if (games.length === 0) { gamesListDiv.innerHTML = "<p>Ei pelejä valitulla suodattimella.</p>"; return; }
        const sortedGames = [...games].sort((a, b) => b.gameNumber - a.gameNumber);

        sortedGames.forEach(game => {
            const gameDiv = document.createElement('div'); gameDiv.className = 'game-stats-entry';
            const h4 = document.createElement('h4'); h4.textContent = `Peli ${game.gameNumber}`;
            if (game.gameEndTime) { h4.textContent += ` (Päättynyt: ${game.gameEndTime})`; }
            else if (game.rounds?.length > 0) { h4.textContent += ` (Kesken, ${game.rounds.length} kierrosta)`; }
            else { h4.textContent += ` (Ei dataa)`; }
            gameDiv.appendChild(h4);

            // Totals Table
            if (game.players && game.totals) {
                const totalsTable = document.createElement('table'); totalsTable.className = 'game-totals-table';
                const totalsCaption = totalsTable.createCaption(); totalsCaption.textContent = "Lopputulos";
                const totalsThead = totalsTable.createTHead(); const totalsHeaderRow = totalsThead.insertRow();
                totalsHeaderRow.insertCell().textContent = "Pelaaja"; totalsHeaderRow.insertCell().textContent = "Pisteet";
                const totalsTbody = totalsTable.createTBody();
                const minScore = game.isOver ? Math.min(...game.totals.filter(s => typeof s === 'number')) : Infinity;
                game.players.forEach((player, index) => {
                    const score = game.totals[index] ?? '-'; const row = totalsTbody.insertRow();
                    row.insertCell().textContent = player; row.insertCell().textContent = score;
                    if (game.isOver && score === minScore && typeof score === 'number') { row.style.fontWeight = 'bold'; row.style.backgroundColor = '#dff0d8'; }
                });
                gameDiv.appendChild(totalsTable);
            }

            // Rounds Table (Shows winner)
            if (game.players && game.rounds && game.rounds.length > 0) {
                const roundsTable = document.createElement('table'); roundsTable.className = 'game-rounds-table'; roundsTable.style.marginTop = '10px';
                const roundsCaption = roundsTable.createCaption(); roundsCaption.textContent = "Kierrospisteet";
                const roundsThead = roundsTable.createTHead(); const roundsHeaderRow = roundsThead.insertRow();
                roundsHeaderRow.insertCell().textContent = "Kr"; // Shorter header
                game.players.forEach(player => { roundsHeaderRow.insertCell().textContent = player; });
                // Add header for winner if data exists
                 if(game.roundWinners && game.roundWinners.some(idx => idx !== -1 && idx !== undefined && idx !== null)) {
                    roundsHeaderRow.insertCell().textContent = "Voittaja"; // Header for round winner column
                 }


                const roundsTbody = roundsTable.createTBody();
                game.rounds.forEach((roundScores, roundIndex) => {
                    const roundRow = roundsTbody.insertRow();
                    roundRow.insertCell().textContent = roundIndex + 1;
                    const winnerIndex = game.roundWinners?.[roundIndex] ?? -1; // Get winner index for this round
                    game.players.forEach((player, playerIndex) => {
                         const score = roundScores[playerIndex] ?? '-';
                         const cell = roundRow.insertCell();
                         cell.textContent = score;
                         // Highlight cell of player who went out
                         if (playerIndex === winnerIndex) {
                             cell.classList.add('went-out');
                         }
                    });
                     // Add winner name cell if header exists
                    if(roundsHeaderRow.cells.length > game.players.length + 1) { // Check if winner column was added
                        const winnerName = (winnerIndex !== -1 && game.players[winnerIndex]) ? game.players[winnerIndex] : "-";
                        roundRow.insertCell().textContent = winnerName;
                    }
                });
                gameDiv.appendChild(roundsTable);
            }
            gamesListDiv.appendChild(gameDiv);
        });
    }

    // --- New Statistics Calculation Helpers ---

    function calculateWinStreaks(games) {
        const streaks = {}; // { player: currentStreak }
        const maxStreaks = {}; // { player: maxStreak }
        let lastWinner = null;

        // Sort games by number to process chronologically
        const sortedGames = [...games].sort((a, b) => a.gameNumber - b.gameNumber);

        sortedGames.forEach(game => {
            if (!game.isOver || !game.players || !game.totals) {
                lastWinner = null; // Break streak if game not valid/over
                return;
            }
            const minScore = Math.min(...game.totals.filter(s => typeof s === 'number'));
            if (minScore === Infinity) { lastWinner = null; return; } // No valid winner

            const winners = game.players.filter((_, index) => game.totals[index] === minScore);
            const winner = winners.length === 1 ? winners[0] : null; // Only count single winners for streaks

            game.players.forEach(player => { // Initialize if needed
                if (!streaks[player]) streaks[player] = 0;
                if (!maxStreaks[player]) maxStreaks[player] = 0;
            });

            if (winner) {
                if (winner === lastWinner) {
                    streaks[winner]++; // Continue streak
                } else {
                    // Reset old winner's current streak if different
                    if (lastWinner && streaks[lastWinner]) streaks[lastWinner] = 0;
                    // Start new streak
                    streaks[winner] = 1;
                }
                // Update max streak for the winner
                if (streaks[winner] > maxStreaks[winner]) {
                    maxStreaks[winner] = streaks[winner];
                }
                 // Reset streaks for losers of this game
                 game.players.forEach(player => {
                     if (player !== winner) streaks[player] = 0;
                 });
                 lastWinner = winner;
            } else {
                // Tie or no winner, reset all current streaks and last winner
                 Object.keys(streaks).forEach(player => streaks[player] = 0);
                 lastWinner = null;
            }
        });
        return maxStreaks;
    }

    function calculateHiLoRounds(games) {
         let bestRound = { score: Infinity, details: [] }; // Store multiple if score is tied
         let worstRound = { score: -Infinity, details: [] };

        games.forEach(game => {
            if (!game.rounds || !game.players) return;
            game.rounds.forEach((roundScores, roundIndex) => {
                roundScores.forEach((score, playerIndex) => {
                    if (typeof score !== 'number') return; // Skip invalid scores
                     const player = game.players[playerIndex];
                     const detail = `${score}p (${player}, P${game.gameNumber} K${roundIndex + 1})`;

                     if (score < bestRound.score) {
                         bestRound = { score: score, details: [detail] };
                     } else if (score === bestRound.score) {
                         bestRound.details.push(detail);
                     }

                     if (score > worstRound.score) {
                         worstRound = { score: score, details: [detail] };
                     } else if (score === worstRound.score) {
                         worstRound.details.push(detail);
                     }
                });
            });
        });
        // Limit number of details shown if tied?
        const maxDetails = 3;
        if(bestRound.details.length > maxDetails) bestRound.details = bestRound.details.slice(0, maxDetails).concat(`...ja ${bestRound.details.length - maxDetails} muuta`);
        if(worstRound.details.length > maxDetails) worstRound.details = worstRound.details.slice(0, maxDetails).concat(`...ja ${worstRound.details.length - maxDetails} muuta`);

        return { bestRound, worstRound };
    }


     function displayHeadToHead(games, playerList) {
         headToHeadStatsDiv.innerHTML = ''; // Clear previous
         if (playerList.length < 2) {
            headToHeadStatsDiv.innerHTML = "<small>Ei tarpeeksi pelaajia keskinäisiin tilastoihin.</small>";
            return;
         }

        const h2hTable = document.createElement('table');
        const h2hThead = h2hTable.createTHead();
        const h2hHeaderRow = h2hThead.insertRow();
        h2hHeaderRow.insertCell().textContent = "Pelaaja"; // Corner cell
         playerList.forEach(p => { h2hHeaderRow.insertCell().textContent = p; }); // Column headers

        const h2hTbody = h2hTable.createTBody();
         playerList.forEach(playerA => {
            const row = h2hTbody.insertRow();
            row.insertCell().textContent = playerA; // Row header

            playerList.forEach(playerB => {
                const cell = row.insertCell();
                if (playerA === playerB) {
                    cell.textContent = "-"; // No stats against self
                    cell.style.backgroundColor = "#f1f3f5";
                } else {
                    let winsA = 0; let winsB = 0; let gamesPlayed = 0;
                    games.forEach(game => {
                        // Consider only games where BOTH players participated
                        if (game.isOver && game.players?.includes(playerA) && game.players.includes(playerB)) {
                            gamesPlayed++;
                            const minScore = Math.min(...game.totals.filter(s => typeof s === 'number'));
                            if (minScore === Infinity) return;
                             const winners = game.players.filter((p, i) => game.totals[i] === minScore);
                             if (winners.includes(playerA)) winsA++;
                             if (winners.includes(playerB)) winsB++;
                            // Note: If both won (tie), both get a "win" point in this simple count
                        }
                    });
                    // Display as "Wins A - Wins B (Games)"
                     cell.textContent = `${winsA} - ${winsB} (${gamesPlayed})`;
                     if (winsA > winsB) cell.style.backgroundColor = '#d4edda'; // Greenish tint if A won more
                     else if (winsB > winsA) cell.style.backgroundColor = '#f8d7da'; // Reddish tint if B won more
                }
            });
        });

         headToHeadStatsDiv.appendChild(h2hTable);
    }


    // --- Event Listeners ---
    csvUploadInput.addEventListener('change', handleFileUpload);
    downloadCsvButton.addEventListener('click', downloadCSV);
    setupButton.addEventListener('click', setupPlayers);
    startGameButton.addEventListener('click', startGame);
    addRoundButton.addEventListener('click', addRound);
    newGameButton.addEventListener('click', startNewGame);
    toggleStatsButton.addEventListener('click', toggleStatsDisplay);
    closeStatsButton.addEventListener('click', () => { statsDisplaySection.style.display = 'none'; if(winsBarChart) { winsBarChart.destroy(); winsBarChart = null; } });
    applyFiltersButton.addEventListener('click', applyAndDisplayStats);
    resetFiltersButton.addEventListener('click', resetFilters);


    // --- Initial Page Load ---
    initializeUI();
    updatePlayerFilterCheckboxes([]); // Initial empty state for filters
});