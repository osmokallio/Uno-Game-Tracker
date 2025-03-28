# Uno-Game-Tracker

# Project Definition: Browser-Based Uno Score Tracker (CSV Persistent with Detailed Stats)

## 1. Overview

This project defines a client-side web application for tracking scores during games of classic Uno. The application allows users to input player names, record scores after each round (hand), automatically calculates totals, manages game progression according to specific rules (score limit, rotating dealer), and supports multiple games within a session.

It allows users to **export all recorded game data to a CSV file** at the end of a session and **import a previously saved CSV file** at the beginning of a new session to continue tracking history.

The application features an **integrated, toggleable statistics section** displaying overall, per-session/day, and detailed per-game statistics based on the currently loaded data. The per-game view includes both final totals and a **round-by-round score breakdown**. A score progression graph for the *current* game is also displayed. The application runs entirely within the user's web browser using HTML, CSS, and JavaScript, requiring no server-side backend.

## 2. Core Features

* **Player Setup:** Allows users to define participating players manually *or* loads them automatically from an imported CSV file.
* **CSV Data Import:** Allows users to load game history from a previously exported CSV file at the start of a session using a file input.
* **Starting Player Selection:** Allows users to select which player deals the first hand of a *new* game.
* **Round Score Entry:** Provides inputs for entering each player's score for a completed round.
* **Automatic Totals:** Calculates and displays the cumulative score for each player for the current game.
* **Rotating Dealer:** Automatically tracks and displays the dealer for the current round, rotating sequentially for subsequent rounds.
* **Single Zero Score Validation:** Enforces the rule that exactly one player must score zero points in any given round.
* **Game End Condition:** Automatically detects when a player's score reaches or exceeds 500 points, ending the current game.
* **Winner Declaration:** Identifies and displays the player(s) with the lowest score when a game ends.
* **Multiple Game Support:** Allows users to play and record multiple consecutive games within the same browser session, appending to any loaded CSV data.
* **Score Progression Graph:** Displays a line chart (using Chart.js) showing each player's total score progression over the rounds of the *current* game.
* **Integrated Statistics Display:**
    * A toggleable section within the main page displays statistics calculated from *all* loaded data (`allGamesData` + `currentGameData` if active).
    * Includes: Overall stats (total games, wins/player, win %, avg score/round), Session/Day stats (grouping games by end date), and detailed Per-Game summaries.
    * **Per-Game Stats Detail:** Shows final scores with winner highlighting, **plus a separate table detailing the scores for every round/hand within that game.**
* **CSV Data Export:** Generates and downloads a CSV file containing detailed score data for *all* games (loaded + current session), including timestamps for completed games. This is the primary method for data persistence between sessions.
* **Dynamic UI Updates:** The user interface updates dynamically to reflect the current game state.

## 3. Technical Requirements

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Charting Library:** Chart.js (loaded via CDN)
* **Environment:** Standard modern web browser (Chrome, Firefox, Edge, Safari) with JavaScript enabled.
* **Dependencies:** Chart.js (external via CDN).
* **Persistence:**
    * Game data persists in JavaScript memory *during a single browser session*.
    * Long-term persistence relies on **manual user export to CSV** and **manual user import from CSV** at the start of subsequent sessions.

## 4. File Structure

/uno-score-tracker/
├── index.html     # Main HTML structure, game UI, and statistics display area
├── style.css      # CSS for styling
└── script.js      # JavaScript for application logic (gameplay, CSV handling, stats calculation)


## 5. Detailed Feature Breakdown (Highlights of Key Logic)

* **Initialization (`initializeUI`):** Sets up the initial view, showing file import/player setup, hiding game and stats sections.
* **CSV Import (`handleFileUpload`, `parseCsvData`):** Reads a user-selected CSV file, reconstructs `allGamesData`, `gameCounter`, and `players`. Handles the application's specific CSV format.
* **Player Setup (`setupPlayers`, `populateStarterDropdown`):** Reads names manually *only if* no CSV was loaded.
* **Start Game (`startGame`):** Initializes `currentGameData`, increments `gameCounter`, builds UI, initializes Chart.js.
* **Add Round (`addRound`):** Reads/validates scores, updates `currentGameData`, updates UI table/totals/chart, checks game end, rotates dealer.
* **End Game (`endGame`):** Marks game as over, records end time, determines/displays winner, disables inputs, adds/updates completed game in `allGamesData`.
* **Start New Game (`startNewGame`):** Resets UI for a new game within the session (keeps `allGamesData`).
* **CSV Export (`downloadCSV`, `generateCsvContent`):** Collects all data (`allGamesData` + `currentGameData`), sorts by game number, formats to CSV, triggers download. Includes BOM for Excel compatibility.
* **Statistics (`toggleStatsDisplay`, `displayOverallStats_internal`, `displaySessionStats_internal`, `displayPerGameStats_internal`):**
    * `toggleStatsDisplay` controls the visibility of the `#stats-display-section`.
    * When shown, it gathers current data and calls calculation/display functions.
    * `displayOverallStats_internal`: Calculates and displays total games, wins per player, win %, average scores.
    * `displaySessionStats_internal`: Groups completed games by date (`gameEndTime`) and displays games played per day and winner(s) of the day (most game wins).
    * `displayPerGameStats_internal`: For each game (loaded or played), displays:
        * Game number and status.
        * A table showing final total scores per player, highlighting the winner(s).
        * **A second table showing the scores for each player for every round played in that specific game.**

## 6. Data Structures (JavaScript)

* `players`: Array of strings. `['Alice', 'Bob', 'Charlie']`
* `currentGameData`: Object representing the active game.
    ```javascript
    {
        gameNumber: 3,
        startingPlayer: 'Bob',
        players: ['Alice', 'Bob', 'Charlie'],
        rounds: [ [42, 0, 11], [10, 50, 0] ], // Array of arrays (scores per round)
        totals: [52, 50, 11], // Array of numbers (cumulative scores)
        isOver: false,
        currentDealerIndex: 0,
        gameEndTime: null // or timestamp string
    }
    ```
* `allGamesData`: Array holding `gameData` objects for all loaded and completed games.
* `scoreChart`: Chart.js instance variable.
* `gameCounter`: Number tracking the highest game number.

## 7. CSV Export Format (Example)

```csv
"Peli","1"
"Pelin päättymisaika","28.3.2025, 10:30:00"
"Kierros","Alice","Bob","Charlie"
"1","15","0","55"
"2","0","22","10"
"3","102","30","0"
"Yhteensä","117","52","65"

"Peli","2"
"Pelin päättymisaika","28.3.2025, 10:45:12"
"Kierros","Alice","Bob","Charlie"
"1","0","40","5"
"Yhteensä","0","40","5"
