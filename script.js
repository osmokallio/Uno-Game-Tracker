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
    const currentStarterDisplay = document.getElementById('current-round-starter');
    const scoreHeader = document.getElementById('score-header');
    const scoreBody = document.getElementById('score-body');
    const scoreFooter = document.getElementById('score-footer');
    const totalRow = document.getElementById('total-row');
    const scoreInputArea = document.getElementById('score-input-area');
    const addRoundButton = document.getElementById('add-round-button');
    const roundError = document.getElementById('round-error');

    const gameOverMessage = document.getElementById('game-over-message');
    const winnerInfo = document.getElementById('winner-info');
    const newGameButton = document.getElementById('new-game-button');

    const chartContainer = document.getElementById('chart-container');
    const scoreChartCanvas = document.getElementById('scoreChartCanvas');

    // File Management & Stats Elements
    const csvUploadInput = document.getElementById('csv-upload');
    const loadStatus = document.getElementById('load-status');
    const downloadCsvButton = document.getElementById('download-csv-button');
    const toggleStatsButton = document.getElementById('toggle-stats-button');
    const statsDisplaySection = document.getElementById('stats-display-section');
    const statsContent = document.getElementById('stats-content');
    const statsLoadingMessage = document.getElementById('stats-loading-message');
    const statsErrorMessage = document.getElementById('stats-error-message');
    const overallStatsDisplay = document.getElementById('overall-stats');
    const sessionStatsDisplay = document.getElementById('session-stats');
    const perGameStatsDisplay = document.getElementById('per-game-stats');
    const winsPerPlayerList = document.getElementById('wins-per-player');
    const otherOverallStatsList = document.getElementById('other-overall-stats');
    const sessionsListDiv = document.getElementById('sessions-list');
    const gamesListDiv = document.getElementById('games-list');
    const totalGamesSpan = document.getElementById('total-games');
    const closeStatsButton = document.getElementById('close-stats-button');

    // --- Constants ---
    const SCORE_LIMIT = 500;

    // --- Game State Variables ---
    let players = [];
    let currentGameData = null; // { gameNumber, startingPlayer, players, rounds: [], totals: [], isOver: false, currentDealerIndex, gameEndTime: null }
    let allGamesData = []; // Array to store all game data objects (loaded + current session)
    let scoreChart = null;
    let gameCounter = 0;

    // --- Chart Colors ---
    const chartColors = [
         '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
         '#E7E9ED', '#808080', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00'
     ];

    // --- Initialization ---
    function initializeUI() {
        playerSetupSection.style.display = 'block';
        starterSelectionSection.style.display = 'none';
        gameSection.style.display = 'none';
        gameOverMessage.style.display = 'none';
        newGameButton.style.display = 'none';
        chartContainer.style.display = 'none';
        statsDisplaySection.style.display = 'none'; // Stats hidden initially
        loadStatus.textContent = 'Ei tiedostoa ladattu.';
        loadStatus.className = 'status-message'; // Default class
        csvUploadInput.value = '';
        downloadCsvButton.disabled = true;
    }

    // --- File Upload & CSV Parsing ---
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            loadStatus.textContent = 'Ei tiedostoa valittu.';
            loadStatus.className = 'status-message error-message'; // Use error styling
            return;
        }
        if (!file.name.toLowerCase().endsWith('.csv')) {
             loadStatus.textContent = 'Virhe: Valitse .csv-päätteinen tiedosto.';
             loadStatus.className = 'status-message error-message';
             csvUploadInput.value = '';
             return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result;
            try {
                parseCsvData(csvContent); // This will update allGamesData, gameCounter, players
                loadStatus.textContent = `Tiedosto "${file.name}" ladattu. ${allGamesData.length} peliä löydetty.`;
                loadStatus.className = 'status-message'; // Success styling

                // Update UI after successful load
                if (players.length > 0) {
                     playerNamesInput.value = players.join(', ');
                     playerNamesInput.disabled = true;
                     setupButton.disabled = true;
                     populateStarterDropdown(players);
                     starterSelectionSection.style.display = 'block';
                     playerSetupSection.style.display = 'none';
                     downloadCsvButton.disabled = false; // Enable saving now that data exists
                     csvUploadInput.disabled = true; // Prevent reloading file in same session (simplicity)
                } else {
                     loadStatus.textContent += ' Varoitus: Pelaajatietoja ei löytynyt CSV:stä. Syötä pelaajat manuaalisesti.';
                     loadStatus.className = 'status-message error-message';
                     playerNamesInput.disabled = false;
                     setupButton.disabled = false;
                }
            } catch (error) {
                console.error("CSV Parsing Error:", error);
                loadStatus.textContent = `Virhe tiedoston "${file.name}" käsittelyssä: ${error.message}`;
                loadStatus.className = 'status-message error-message';
                // Reset state on error
                allGamesData = []; players = []; gameCounter = 0;
                playerNamesInput.disabled = false; setupButton.disabled = false;
                downloadCsvButton.disabled = true;
                csvUploadInput.value = ''; // Clear selection
            }
        };
        reader.onerror = function() {
            loadStatus.textContent = `Virhe tiedoston "${file.name}" lukemisessa.`;
            loadStatus.className = 'status-message error-message';
            csvUploadInput.value = '';
        };
        reader.readAsText(file, 'UTF-8'); // Specify UTF-8 encoding
    }

    function parseCsvData(csvString) {
        const lines = csvString.replace(/^\uFEFF/, '').split(/\r?\n/); // Remove BOM, Split lines
        let loadedGames = [];
        let currentParsedGame = null;
        let highestGameNumber = 0;
        let parsedPlayers = [];

        function parseCsvLine(line) {
            const values = [];
            let currentVal = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') { currentVal += '"'; i++; }
                    else { inQuotes = !inQuotes; }
                } else if (char === ',' && !inQuotes) {
                    values.push(currentVal.trim()); currentVal = '';
                } else { currentVal += char; }
            }
            values.push(currentVal.trim());
            return values;
        }

        lines.forEach(line => {
            if (!line.trim()) { // Handle blank lines as potential game separators
                if (currentParsedGame && currentParsedGame.rounds.length > 0) {
                    loadedGames.push(currentParsedGame);
                }
                currentParsedGame = null;
                return;
            }
            const values = parseCsvLine(line);

            if (values[0] === 'Peli' && values.length > 1) {
                if (currentParsedGame && currentParsedGame.rounds.length > 0) { loadedGames.push(currentParsedGame); }
                const gameNum = parseInt(values[1], 10);
                if (!isNaN(gameNum)) {
                    currentParsedGame = { gameNumber: gameNum, players: [], rounds: [], totals: [], isOver: false, gameEndTime: null, startingPlayer: null };
                    if (gameNum > highestGameNumber) highestGameNumber = gameNum;
                } else { currentParsedGame = null; }
            } else if (currentParsedGame && values[0] === 'Pelin päättymisaika' && values.length > 1) {
                currentParsedGame.gameEndTime = values[1];
                currentParsedGame.isOver = true;
            } else if (currentParsedGame && values[0] === 'Kierros') {
                 if (parsedPlayers.length === 0) { parsedPlayers = values.slice(1); } // ["Pelaaja1", "Pelaaja2",...]
                 currentParsedGame.players = [...parsedPlayers];
                 currentParsedGame.totals = new Array(parsedPlayers.length).fill(0);
            } else if (currentParsedGame && /^\d+$/.test(values[0])) { // Round data row
                if (currentParsedGame.players.length > 0 && values.length === currentParsedGame.players.length + 1) {
                    const roundScores = values.slice(1).map(score => parseInt(score, 10));
                    if (roundScores.every(score => !isNaN(score))) {
                        currentParsedGame.rounds.push(roundScores);
                        roundScores.forEach((score, index) => { currentParsedGame.totals[index] += score; });
                    } else { console.warn(`Skipping invalid round scores in game ${currentParsedGame.gameNumber}, round ${values[0]}`); }
                }
            } else if (currentParsedGame && values[0] === 'Yhteensä') { // Total row encountered
                 // We recalculate totals, so mostly used as a game end marker
                if (currentParsedGame && currentParsedGame.rounds.length > 0) {
                     // Can consider the game finished here if not already marked by end time
                     // currentParsedGame.isOver = true; (optional)
                     loadedGames.push(currentParsedGame); // Save game data
                }
                currentParsedGame = null; // Reset for next game block
            }
        });
        // Add the last game if loop finished while parsing it
        if (currentParsedGame && currentParsedGame.rounds.length > 0) { loadedGames.push(currentParsedGame); }

        // Update global state
        if (loadedGames.length > 0) {
            allGamesData = loadedGames;
            gameCounter = highestGameNumber;
            if (parsedPlayers.length > 0) {
                players = [...parsedPlayers];
            } else if (allGamesData[0]?.players?.length > 0) {
                players = [...allGamesData[0].players]; // Fallback
                console.warn("Could not parse players from header reliably, using players from first game.");
            } else { throw new Error("Could not determine player list from loaded file."); }
        } else { throw new Error("No valid game data found in CSV file."); }
    }


    // --- Player Setup & Game Start ---
    function populateStarterDropdown(playerList) {
        startingPlayerSelect.innerHTML = '';
        playerList.forEach((player, index) => {
            const option = document.createElement('option'); option.value = index; option.textContent = player; startingPlayerSelect.appendChild(option);
        });
    }

    function setupPlayers() { // Only used if file is NOT loaded
        const names = playerNamesInput.value.split(',').map(name => name.trim()).filter(name => name.length > 0);
        if (names.length < 2) {
            setupError.textContent = 'Syötä vähintään kahden pelaajan nimet.'; setupError.style.display = 'block'; return;
        }
        players = names;
        setupError.style.display = 'none'; playerSetupSection.style.display = 'none';
        populateStarterDropdown(players);
        starterSelectionSection.style.display = 'block';
        downloadCsvButton.disabled = false; // Enable saving
    }

    function startGame() {
        if (players.length < 2) return; // Should not happen if UI flow is correct

        const startingPlayerIndex = parseInt(startingPlayerSelect.value, 10);
        gameCounter++; // Increment based on loaded counter or 0

        currentGameData = {
            gameNumber: gameCounter,
            startingPlayer: players[startingPlayerIndex],
            players: [...players],
            rounds: [], totals: players.map(() => 0),
            isOver: false, currentDealerIndex: startingPlayerIndex, gameEndTime: null
        };

        // Build UI
        gameNumberDisplay.textContent = currentGameData.gameNumber;
        buildScoreTable(); createScoreInputs(); updateRoundStarterDisplay();

        // Reset and Show Game Area
        gameOverMessage.style.display = 'none'; newGameButton.style.display = 'none';
        roundError.style.display = 'none'; addRoundButton.disabled = false;
        scoreInputArea.querySelectorAll('.score-input').forEach(input => input.disabled = false); // Re-enable inputs
        starterSelectionSection.style.display = 'none'; gameSection.style.display = 'block';
        chartContainer.style.display = 'block';

        initializeChart();
    }

    // --- UI Building Helpers ---
    function buildScoreTable() {
        scoreHeader.innerHTML = ''; const headerRow = scoreHeader.insertRow();
        headerRow.insertCell().textContent = 'Kierros';
        currentGameData.players.forEach(player => { headerRow.insertCell().textContent = player; });
        scoreBody.innerHTML = ''; // Clear previous rounds
        totalRow.innerHTML = ''; // Clear previous totals
        const tdTotalLabel = totalRow.insertCell(); tdTotalLabel.textContent = 'Yhteensä';
        currentGameData.players.forEach((_, index) => {
            const td = totalRow.insertCell(); td.id = `total-player-${index}`; td.textContent = '0';
        });
    }

    function createScoreInputs() {
        scoreInputArea.innerHTML = '<h2>Syötä Kierroksen Pisteet</h2>'; // Reset
        currentGameData.players.forEach((player, index) => {
            const div = document.createElement('div'); const label = document.createElement('label');
            label.htmlFor = `score-input-${index}`; label.textContent = `${player}:`;
            const input = document.createElement('input'); input.type = 'number'; input.id = `score-input-${index}`;
            input.className = 'score-input'; input.min = "0"; input.placeholder = "Pisteet";
            div.appendChild(label); div.appendChild(input); scoreInputArea.appendChild(div);
        });
        scoreInputArea.appendChild(addRoundButton); // Re-add button
        scoreInputArea.appendChild(roundError); // Ensure error message is still there
    }

    // --- Round Logic ---
    function updateRoundStarterDisplay() {
        if (!currentGameData) return;
        const roundNum = currentGameData.rounds.length + 1;
        const dealerName = currentGameData.players[currentGameData.currentDealerIndex];
        currentRoundDisplay.textContent = roundNum;
        currentStarterDisplay.textContent = dealerName;
    }

    function addRound() {
        if (!currentGameData || currentGameData.isOver) return;

        const scores = []; let isValid = true; let zeroCount = 0;
        roundError.style.display = 'none';

        const inputs = scoreInputArea.querySelectorAll('.score-input');
        inputs.forEach((input, index) => {
            const score = parseInt(input.value, 10);
            if (isNaN(score) || score < 0) { isValid = false; }
             else { scores[index] = score; if (score === 0) zeroCount++; }
        });

        if (!isValid) { roundError.textContent = 'Pisteiden on oltava numeroita (0 tai suurempi).'; roundError.style.display = 'block'; return; }
        if (zeroCount !== 1) { roundError.textContent = 'Tasan yhden pelaajan pisteiden tulee olla 0.'; roundError.style.display = 'block'; return; }

        // Data Update
        currentGameData.rounds.push(scores);

        // UI Update (Table)
        const roundNum = currentGameData.rounds.length;
        const row = scoreBody.insertRow(); row.insertCell().textContent = roundNum;
        scores.forEach(score => { row.insertCell().textContent = score; });

        // UI Update (Totals) & Data Update (Totals)
        scores.forEach((score, index) => {
            currentGameData.totals[index] += score;
            document.getElementById(`total-player-${index}`).textContent = currentGameData.totals[index];
        });

        // Clear inputs
        inputs.forEach(input => input.value = '');

        // Chart Update
        updateChart();

        // Check Game End Condition
        const gameEnded = currentGameData.totals.some(total => total >= SCORE_LIMIT);
        if (gameEnded && !currentGameData.isOver) {
            endGame();
        } else {
            currentGameData.currentDealerIndex = (currentGameData.currentDealerIndex + 1) % currentGameData.players.length;
            updateRoundStarterDisplay();
        }
    }

    // --- Charting ---
    function initializeChart() {
        if (scoreChart) { scoreChart.destroy(); }
        const ctx = scoreChartCanvas.getContext('2d');
        const datasets = currentGameData.players.map((player, index) => ({
            label: player, data: [0], borderColor: chartColors[index % chartColors.length], tension: 0.1, fill: false
        }));
        scoreChart = new Chart(ctx, {
            type: 'line', data: { labels: [0], datasets: datasets },
            options: { responsive: true, maintainAspectRatio: true, scales: { x: { title: { display: true, text: 'Kierros' } }, y: { title: { display: true, text: 'Pisteet Yhteensä' }, beginAtZero: true } } }
        });
    }

    function updateChart() {
         if (!scoreChart || !currentGameData) return;
         const roundNum = currentGameData.rounds.length;
         scoreChart.data.labels.push(roundNum);
         scoreChart.data.datasets.forEach((dataset, index) => { dataset.data.push(currentGameData.totals[index]); });
         scoreChart.update();
    }

    // --- Game End & New Game ---
    function endGame() {
        currentGameData.isOver = true;
        currentGameData.gameEndTime = new Date().toLocaleString('fi-FI');

        // Find winner(s)
        const minScore = Math.min(...currentGameData.totals);
        const winners = currentGameData.players.filter((_, index) => currentGameData.totals[index] === minScore);
        let winnerText = winners.length === 1 ? `Voittaja on ${winners[0]} (${minScore} p.)!` : `Tasapeli! Voittajat: ${winners.join(', ')} (${minScore} p.)!`;
        winnerInfo.textContent = winnerText;

        // Update UI
        gameOverMessage.style.display = 'block'; addRoundButton.disabled = true;
        scoreInputArea.querySelectorAll('.score-input').forEach(input => input.disabled = true);
        newGameButton.style.display = 'inline-block';

        // Store completed game data (make a deep copy) - check if it already exists from loading
         const existingGameIndex = allGamesData.findIndex(g => g.gameNumber === currentGameData.gameNumber);
         if (existingGameIndex !== -1) {
             allGamesData[existingGameIndex] = JSON.parse(JSON.stringify(currentGameData)); // Update existing
         } else {
            allGamesData.push(JSON.parse(JSON.stringify(currentGameData))); // Add new
         }
    }

    function startNewGame() { // Starts a new game within the current session/loaded data context
        if (scoreChart) { scoreChart.destroy(); scoreChart = null; }

        // Reset UI elements for a new game
        gameSection.style.display = 'none'; chartContainer.style.display = 'none';
        gameOverMessage.style.display = 'none'; newGameButton.style.display = 'none';
        scoreHeader.innerHTML = ''; scoreBody.innerHTML = ''; totalRow.innerHTML = '';
        scoreInputArea.innerHTML = '<h2>Syötä Kierroksen Pisteet</h2>';
        scoreInputArea.appendChild(addRoundButton); scoreInputArea.appendChild(roundError);

        // Reset current game data variable
        currentGameData = null;

        // Show starter selection again (players are already set)
        if (players.length > 0) {
            populateStarterDropdown(players); // Ensure dropdown is up-to-date
            starterSelectionSection.style.display = 'block';
        } else {
            // Fallback if something went wrong
            playerSetupSection.style.display = 'block';
             playerNamesInput.disabled = false;
             setupButton.disabled = false;
        }
    }

    // --- CSV Export ---
    function escapeCsvCell(cellData) {
        const str = String(cellData ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function generateCsvContent() {
        let csvContent = "";
        let dataToExport = [...allGamesData]; // Start with loaded/completed games

        // Add/Update current game data if it exists
         if (currentGameData && currentGameData.rounds.length > 0) {
            const gameIndex = dataToExport.findIndex(game => game.gameNumber === currentGameData.gameNumber);
            if (gameIndex !== -1) {
                dataToExport[gameIndex] = JSON.parse(JSON.stringify(currentGameData)); // Update if exists
            } else {
                dataToExport.push(JSON.parse(JSON.stringify(currentGameData))); // Add if new
            }
        }
        // Sort by game number before exporting for consistency
        dataToExport.sort((a, b) => a.gameNumber - b.gameNumber);


        const addGameToCSV = (gameData) => {
             if (!gameData || !gameData.players) return;
            csvContent += `"Peli",${escapeCsvCell(gameData.gameNumber)}\n`;
            if (gameData.gameEndTime) { csvContent += `"Pelin päättymisaika",${escapeCsvCell(gameData.gameEndTime)}\n`; }
            csvContent += ["Kierros", ...gameData.players].map(escapeCsvCell).join(',') + "\n"; // Header
            gameData.rounds.forEach((roundScores, roundIndex) => { // Rounds
                csvContent += [roundIndex + 1, ...roundScores].map(escapeCsvCell).join(',') + "\n";
            });
            csvContent += ["Yhteensä", ...gameData.totals].map(escapeCsvCell).join(',') + "\n"; // Totals
            csvContent += "\n"; // Blank line
        };

        dataToExport.forEach(addGameToCSV);
        return csvContent;
    }

    function downloadCSV() {
        const csvData = generateCsvContent();
        if (!csvData) { alert("Ei tallennettavaa pelidataa."); return; }

        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.setAttribute('href', url);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `uno_pisteet_${timestamp}.csv`);
        link.style.visibility = 'hidden'; document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
    }

     // --- Statistics Display Logic (Integrated) ---
    function toggleStatsDisplay() {
        if (statsDisplaySection.style.display === 'none') {
            statsLoadingMessage.style.display = 'block'; statsErrorMessage.style.display = 'none';
            overallStatsDisplay.style.display = 'none'; sessionStatsDisplay.style.display = 'none';
            perGameStatsDisplay.style.display = 'none';
            statsDisplaySection.style.display = 'block';

            let dataForStats = [...allGamesData];
            if (currentGameData && currentGameData.rounds.length > 0) {
                const gameIndex = dataForStats.findIndex(game => game.gameNumber === currentGameData.gameNumber);
                if (gameIndex !== -1) { dataForStats[gameIndex] = JSON.parse(JSON.stringify(currentGameData)); }
                else { dataForStats.push(JSON.parse(JSON.stringify(currentGameData))); }
            }

            if (dataForStats.length === 0) {
                statsLoadingMessage.style.display = 'none';
                statsErrorMessage.textContent = "Ei tilastoitavaa dataa."; statsErrorMessage.style.display = 'block';
                return;
            }

            setTimeout(() => { // Small delay for better UX
                try {
                    displayOverallStats_internal(dataForStats);
                    displaySessionStats_internal(dataForStats);
                    displayPerGameStats_internal(dataForStats);
                    overallStatsDisplay.style.display = 'block'; sessionStatsDisplay.style.display = 'block';
                    perGameStatsDisplay.style.display = 'block'; statsLoadingMessage.style.display = 'none';
                } catch (error) {
                    console.error("Error calculating stats:", error); statsLoadingMessage.style.display = 'none';
                    statsErrorMessage.textContent = `Virhe tilastoja laskiessa: ${error.message}`; statsErrorMessage.style.display = 'block';
                }
             }, 50);
        } else {
            statsDisplaySection.style.display = 'none'; // Hide stats
        }
    }

    // --- Statistics Calculation/Display Functions (Copied & Adapted) ---
     function displayOverallStats_internal(games) {
         const totalGamesPlayed = games.length;
         totalGamesSpan.textContent = totalGamesPlayed; // Use direct reference

         const playerWins = {}; const playerScores = {}; const playerRounds = {};
         let allPlayers = new Set();

         games.forEach(game => {
             if (!game.players || game.players.length === 0) return;
             game.players.forEach(p => allPlayers.add(p));
             game.players.forEach(player => {
                 if (!playerWins[player]) playerWins[player] = 0;
                 if (!playerScores[player]) playerScores[player] = 0;
                 if (!playerRounds[player]) playerRounds[player] = 0;
             });
             game.rounds.forEach(roundScores => {
                 roundScores.forEach((score, index) => {
                     const player = game.players[index];
                     if(player){ playerScores[player] += score; playerRounds[player]++; }
                 });
             });
             if (game.isOver && game.totals && game.totals.length > 0) {
                 const minScore = Math.min(...game.totals.filter(s => typeof s === 'number')); // Ensure scores are numbers
                 game.players.forEach((player, index) => {
                     if (game.totals[index] === minScore) { playerWins[player]++; }
                 });
             }
         });

         winsPerPlayerList.innerHTML = ''; // Use direct reference
         const sortedPlayersByWins = Array.from(allPlayers).sort((a, b) => (playerWins[b] || 0) - (playerWins[a] || 0));
         sortedPlayersByWins.forEach(player => {
             const gamesPlayedByPlayer = games.filter(g => g.players && g.players.includes(player)).length;
             const winPercentage = gamesPlayedByPlayer > 0 ? ((playerWins[player] || 0) / gamesPlayedByPlayer * 100).toFixed(1) : 0;
             const li = document.createElement('li');
             li.textContent = `${player}: ${playerWins[player] || 0} voittoa (${winPercentage}%)`;
             winsPerPlayerList.appendChild(li);
         });

         otherOverallStatsList.innerHTML = ''; // Use direct reference
         sortedPlayersByWins.forEach(player => {
             const avgScorePerRound = playerRounds[player] > 0 ? (playerScores[player] / playerRounds[player]).toFixed(1) : 'N/A';
             const li = document.createElement('li');
             li.textContent = `${player}: Keskim. pisteet/kierros: ${avgScorePerRound}`;
             otherOverallStatsList.appendChild(li);
         });
     }

     function displaySessionStats_internal(games) {
         const sessions = {};
         games.forEach(game => {
             if (!game.gameEndTime) return;
             try { // Assuming 'fi-FI' format: "DD.MM.YYYY, HH:MM:SS"
                 const dateTimeParts = game.gameEndTime.split(',');
                 const dateParts = dateTimeParts[0].split('.');
                 if (dateParts.length === 3) {
                     const dateKey = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`; // YYYY-MM-DD
                     const gameDate = new Date(dateParts[2], parseInt(dateParts[1]) - 1, dateParts[0]);
                     if (!sessions[dateKey]) { sessions[dateKey] = { games: [], date: gameDate }; }
                     sessions[dateKey].games.push(game);
                 } else { console.warn("Could not parse date:", game.gameEndTime); }
             } catch (e) { console.warn("Error parsing gameEndTime:", game.gameEndTime, e); }
         });

         sessionsListDiv.innerHTML = ''; // Use direct reference
         const sortedSessionKeys = Object.keys(sessions).sort((a, b) => sessions[b].date - sessions[a].date);

         if (sortedSessionKeys.length === 0) { sessionsListDiv.innerHTML = "<p>Ei päättyneitä pelejä sessioittain.</p>"; return; }

         sortedSessionKeys.forEach(dateKey => {
             const session = sessions[dateKey];
             const sessionDiv = document.createElement('div');
             const dateString = session.date.toLocaleDateString('fi-FI');
             const h3 = document.createElement('h3'); h3.textContent = `Pelipäivä: ${dateString}`; sessionDiv.appendChild(h3);
             const p = document.createElement('p'); p.textContent = `Pelattuja pelejä: ${session.games.length}`; sessionDiv.appendChild(p);

             const dailyWins = {};
             session.games.forEach(game => {
                 if (game.isOver && game.totals && game.totals.length > 0) {
                     const minScore = Math.min(...game.totals.filter(s => typeof s === 'number'));
                     game.players.forEach((player, index) => {
                         if (game.totals[index] === minScore) { if (!dailyWins[player]) dailyWins[player] = 0; dailyWins[player]++; }
                     });
                 }
             });
             const maxDailyWins = Math.max(0, ...Object.values(dailyWins));
             const dailyWinners = Object.keys(dailyWins).filter(player => dailyWins[player] === maxDailyWins);
             if (dailyWinners.length > 0) {
                 const winnersP = document.createElement('p');
                 winnersP.innerHTML = `Päivän voittaja(t): <strong>${dailyWinners.join(', ')}</strong> (${maxDailyWins} voittoa)`;
                 sessionDiv.appendChild(winnersP);
             }
             sessionsListDiv.appendChild(sessionDiv);
         });
     }

     // --- Statistics Calculation/Display Functions (Copied & Adapted) ---
// ... (displayOverallStats_internal ja displaySessionStats_internal pysyvät samoina)...

function displayPerGameStats_internal(games) {
    gamesListDiv.innerHTML = ''; // Tyhjennä vanhat

    if (games.length === 0) {
        gamesListDiv.innerHTML = "<p>Ei pelejä näytettäväksi.</p>";
        return;
    }

    // Järjestä pelit numerojärjestykseen, uusin ensin
    const sortedGames = [...games].sort((a, b) => b.gameNumber - a.gameNumber);

    sortedGames.forEach(game => {
        const gameDiv = document.createElement('div');
        // Lisätään luokka helpompaa kohdistusta varten tarvittaessa
        gameDiv.className = 'game-stats-entry';
        // Poistetaan aiemmat tyylit täältä ja siirretään CSS:ään jos tarpeen
        // gameDiv.style.marginBottom = '15px';
        // gameDiv.style.paddingBottom = '15px';
        // gameDiv.style.borderBottom = '1px solid #eee';

        const h4 = document.createElement('h4');
        h4.textContent = `Peli ${game.gameNumber}`;
        if (game.gameEndTime) {
            h4.textContent += ` (Päättynyt: ${game.gameEndTime})`;
        } else if (game.rounds && game.rounds.length > 0) {
             h4.textContent += ` (Kesken, ${game.rounds.length} kierrosta)`;
        } else {
             h4.textContent += ` (Ei aloitettu?)`;
        }
        gameDiv.appendChild(h4);

        // Tarkista onko pelaajia ja kokonaispisteitä
        if (game.players && game.players.length > 0 && game.totals) {
            // --- Näytä Lopputulos Taulukko (kuten ennen) ---
            const totalsTable = document.createElement('table');
            totalsTable.className = 'game-totals-table'; // Lisää luokka
            const totalsCaption = totalsTable.createCaption();
            totalsCaption.textContent = "Lopputulos";

            const totalsThead = totalsTable.createTHead();
            const totalsHeaderRow = totalsThead.insertRow();
            totalsHeaderRow.insertCell().textContent = "Pelaaja";
            totalsHeaderRow.insertCell().textContent = "Pisteet";

            const totalsTbody = totalsTable.createTBody();
             const minScore = game.isOver ? Math.min(...game.totals.filter(s => typeof s === 'number')) : Infinity;

            game.players.forEach((player, index) => {
                const score = game.totals[index] ?? '-';
                const row = totalsTbody.insertRow();
                row.insertCell().textContent = player;
                row.insertCell().textContent = score;

                if (game.isOver && score === minScore && typeof score === 'number') {
                    row.style.fontWeight = 'bold';
                    row.style.backgroundColor = '#dff0d8';
                }
            });
            gameDiv.appendChild(totalsTable);

            // --- UUSI OSUUS: Näytä Kierroskohtaiset Pisteet ---
            if (game.rounds && game.rounds.length > 0) {
                 const roundsTable = document.createElement('table');
                 roundsTable.className = 'game-rounds-table'; // Lisää luokka
                 roundsTable.style.marginTop = '10px'; // Pieni väli taulukoiden väliin

                 const roundsCaption = roundsTable.createCaption();
                 roundsCaption.textContent = "Kierrospisteet";

                 // Luo Header rivi kierrostaulukolle
                 const roundsThead = roundsTable.createTHead();
                 const roundsHeaderRow = roundsThead.insertRow();
                 roundsHeaderRow.insertCell().textContent = "Kierros"; // Ensimmäinen sarake kierrosnumeroille
                 game.players.forEach(player => {
                     roundsHeaderRow.insertCell().textContent = player; // Sarakkeet pelaajille
                 });

                 // Luo Body rivit kierrostaulukolle
                 const roundsTbody = roundsTable.createTBody();
                 game.rounds.forEach((roundScores, roundIndex) => {
                     const roundRow = roundsTbody.insertRow();
                     roundRow.insertCell().textContent = roundIndex + 1; // Kierrosnumero
                     // Lisää kunkin pelaajan pisteet tälle kierrokselle
                     // Oletetaan, että roundScores-taulukon järjestys vastaa game.players-taulukon järjestystä
                     game.players.forEach((_, playerIndex) => {
                         const score = roundScores[playerIndex] ?? '-'; // Ota pisteet tai näytä '-' jos puuttuu
                         roundRow.insertCell().textContent = score;
                     });
                 });
                 gameDiv.appendChild(roundsTable); // Lisää kierrostaulukko diviin
            }
            // --- UUSI OSUUS LOPPUU ---

        } else {
            const p = document.createElement('p');
            p.textContent = "Pelaaja- tai pistetietoja ei saatavilla tälle pelille.";
            gameDiv.appendChild(p);
        }

        gamesListDiv.appendChild(gameDiv); // Lisää koko pelin div listaan
    });
}


    // --- Event Listeners ---
    csvUploadInput.addEventListener('change', handleFileUpload);
    downloadCsvButton.addEventListener('click', downloadCSV);
    setupButton.addEventListener('click', setupPlayers);
    startGameButton.addEventListener('click', startGame);
    addRoundButton.addEventListener('click', addRound);
    newGameButton.addEventListener('click', startNewGame);
    toggleStatsButton.addEventListener('click', toggleStatsDisplay);
    closeStatsButton.addEventListener('click', () => { statsDisplaySection.style.display = 'none'; }); // Listener for close button inside stats


    // --- Initial Page Load ---
    initializeUI();
});