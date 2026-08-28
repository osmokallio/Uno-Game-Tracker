Uno Game Tracker
A modern, single-file web application for tracking scores in the card game Uno. This tool is designed for ease of use, with no server-side setup required. Just open the HTML file in your browser and start playing.

Features
Player Management: Easily add, remove, and reorder players before starting a game.

Real-time Scorekeeping: Enter scores for each player at the end of a round, and the totals are updated automatically.

Focused Live Game: Starting a game gives the scoreboard the full width of the app. Each player card combines the live total, round input, rank, dealer and leader status, latest result, round wins, and a color-coded 500-point risk meter.

Fast Round Entry: Save a round directly from the player cards with Enter or the sticky action bar, which stays within thumb reach on mobile.

Dealer Tracking: The dealer role automatically rotates to the next player after each round.

Game Logic: The game automatically ends when one or more players reach 500 points, and the player with the lowest score is declared the winner.

Undo Functionality: Made a mistake? Easily undo the last submitted round.

Persistent State: Your game is automatically saved in your browser's local storage, so you can close the tab and resume later.

Data Portability: Export your entire game history and player list to a JSON file for backup or for importing on another device.

Dark & Light Modes: Includes a theme toggler that respects your system's preferred color scheme.

Detailed Statistics: Open completed-game insights in a dedicated side panel with separate Summary, Players, and History tabs, including total wins, head-to-head records, longest win streaks, filters, and every recorded round.

Consistent Player Colors: Every player keeps the same automatically assigned color across live cards, comparison tables, and charts.

Responsive Design: The interface is fully responsive and works great on desktops, tablets, and mobile phones.

How to Use
Download the index.html file.

Open the file in any modern web browser (like Chrome, Firefox, Safari, or Edge).

An internet connection is required for the Tailwind CSS and Chart.js CDN resources. Core scorekeeping remains available if Chart.js cannot be loaded, but charts are hidden.

Add player names.

Click "Start game" and select the first dealer.

After each round, enter the points each player has in their hand (the round winner gets 0).

Press Enter in a score field or click "Save round" to proceed.

The game ends when a player's score reaches 500.

Technologies Used
HTML: For the structure of the application.

Tailwind CSS: For a modern, utility-first styling approach.

JavaScript: For all the game logic, state management, and interactivity.

Chart.js: For rendering the score progression and statistics charts.

Development Checks

Install the development dependencies and run the HTML validation and DOM integration tests:

    npm install
    npm run check

​

Basic Game Rules

    Player Requirements

        Minimum: 2 players required

        Maximum: No hard limit (practical limit ~10 for UI)

        Players cannot be added/removed during active game

        Player order can be changed by dragging (desktop and mobile) before game starts

    Dealer Rules

        Initial dealer selected at game start via modal selection

        Dealer rotates clockwise (next player in list) after each round

        Dealer rotation follows the player list order

        Current dealer highlighted with yellow glow on scoreboard

    Round Scoring Rules

        One player must score exactly 0 points (the round winner who went out)

        All other players must score 0 or more points (no negative scores)

        If multiple players claim 0 points, user must select the actual winner

        All scores must be numeric values

    Score Accumulation

        Points accumulate across all rounds

        Each player's total = sum of all their round scores

        Score history tracked for chart visualization

    Winning Conditions

        Game ends when any player reaches 500 or more total points

        Winner is the player(s) with the lowest total score at game end

        Multiple winners possible in case of a tie for lowest score

    Round Management

        Rounds numbered sequentially starting from 1

        Last round can be undone (undo button)

        Cannot undo after game completion

        Each round must have scores for all players

Data & History Rules

    Game History

        All completed games saved to history

        Each game records: date, players, winners, final scores, all rounds

        History persists in browser localStorage

        Can be exported/imported as JSON

    Statistics Rules

        Win counts only from completed games

        Win streaks calculated across all games chronologically

        Head-to-head records track wins/losses between specific players

        Co-winners in a tied game are not counted as winning against each other

        Filters apply to displayed stats but not all-time records

UI/UX Rules

    Game State Rules

        Only one game can be active at a time

        Starting new game requires confirmation if game in progress

        Game state auto-saves after every action

        Players can be reordered by dragging BEFORE game starts or AFTER game ends

        Players cannot be reordered DURING active game

        Player order determines dealer rotation sequence

        Drag handle (≡ icon) visible only when reordering is enabled

        Touch-based dragging supported on mobile devices

        Add/remove player buttons disabled during active game

    Validation Rules

        Empty player names rejected

        Duplicate player names rejected

        Round submission requires all player scores

        At least one player must score 0 per round

        Import data must match expected JSON structure

Chart & Display Rules

    Visual Feedback

        Current dealer gets yellow glow effect

        Round winners shown in green in history tables

        Game winners get green highlight on final scoreboard

        Score progression chart shows all players' cumulative scores

        Dragging player shows opacity change and border highlight

        Cursor changes (grab → grabbing) during drag operations

    Dark Mode

        Theme preference saved to localStorage

        System preference detected on first load

        Charts update colors based on theme

        All UI elements support dark mode styling

Player Reordering Details

    Drag-and-Drop Functionality

        Desktop: Click and drag the handle icon (≡) to reorder

        Mobile: Touch and drag the handle icon to reorder

        Visual feedback: Dragged item becomes semi-transparent, drop target shows border

        When available: Only before starting a game or after a game ends

        When disabled: During active gameplay (prevents dealer sequence confusion)

        Purpose: Arrange players in physical seating order for easier gameplay

        Impact: Player order determines clockwise dealer rotation
