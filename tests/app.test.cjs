const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

async function createApp(savedState) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));

  const dom = new JSDOM(html, {
    url: 'https://uno.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.matchMedia = () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      });
      if (savedState !== undefined) {
        window.localStorage.setItem('unoTrackerState', savedState);
      }
    },
  });

  await new Promise(resolve => dom.window.addEventListener('load', () => setTimeout(resolve, 0)));
  return { dom, window: dom.window, document: dom.window.document, errors };
}

function click(app, element) {
  element.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
}

function change(app, element) {
  element.dispatchEvent(new app.window.Event('change', { bubbles: true }));
}

function addPlayer(app, name) {
  app.document.querySelector('#new-player-name').value = name;
  click(app, app.document.querySelector('#add-player-btn'));
}

function startGame(app) {
  click(app, app.document.querySelector('#new-game-btn'));
  click(app, app.document.querySelector('#player-order-continue-btn'));
  click(app, app.document.querySelector('#dealer-options button'));
}

test('confirms player order before selecting the starting dealer', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  ['Alice', 'Bob', 'Charlie'].forEach(name => addPlayer(app, name));
  click(app, app.document.querySelector('#new-game-btn'));
  assert.equal(app.document.querySelector('#player-order-modal').classList.contains('active'), true);
  assert.equal(app.document.querySelector('#dealer-selection-modal').classList.contains('active'), false);

  click(app, app.document.querySelector('#player-order-cancel-btn'));
  assert.equal(app.document.querySelector('#player-order-modal').classList.contains('active'), false);
  assert.equal(JSON.parse(app.window.localStorage.getItem('unoTrackerState')).currentGame, null);

  click(app, app.document.querySelector('#new-game-btn'));
  let rows = app.document.querySelectorAll('.player-order-row');
  click(app, rows[2].querySelector('.move-player-up'));
  rows = app.document.querySelectorAll('.player-order-row');
  click(app, rows[1].querySelector('.move-player-up'));
  rows = app.document.querySelectorAll('.player-order-row');
  assert.deepEqual([...rows].map(row => row.childNodes[1].textContent), ['Charlie', 'Alice', 'Bob']);

  click(app, app.document.querySelector('#player-order-continue-btn'));
  assert.deepEqual(
    [...app.document.querySelectorAll('#dealer-options button')].map(button => button.textContent),
    ['Charlie', 'Alice', 'Bob']
  );
  click(app, app.document.querySelector('#dealer-options button'));

  const saved = JSON.parse(app.window.localStorage.getItem('unoTrackerState'));
  assert.deepEqual(saved.players, ['Charlie', 'Alice', 'Bob']);
  assert.deepEqual(saved.currentGame.players.map(player => player.name), ['Charlie', 'Alice', 'Bob']);
  assert.equal(app.document.querySelector('#current-dealer-name').textContent, 'Charlie');

  const scoreInputs = app.document.querySelectorAll('.score-input');
  scoreInputs[0].value = '0';
  scoreInputs[1].value = '10';
  scoreInputs[2].value = '20';
  click(app, app.document.querySelector('#add-round-btn'));
  assert.equal(app.document.querySelector('#current-dealer-name').textContent, 'Alice');
  assert.deepEqual(app.errors, []);
});

test('validates whole-number scores and preserves statistics filters', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  addPlayer(app, 'Alice');
  addPlayer(app, 'A&B');
  startGame(app);

  let inputs = app.document.querySelectorAll('.score-input');
  inputs[0].value = '0';
  inputs[1].value = '1.5';
  click(app, app.document.querySelector('#add-round-btn'));
  assert.match(app.document.querySelector('#score-entry-error').textContent, /whole numbers/);
  assert.equal(app.document.activeElement, inputs[1]);
  assert.equal(inputs[1].getAttribute('aria-invalid'), 'true');
  assert.equal(app.document.querySelector('#round-number').textContent, '1');

  inputs[1].value = '500';
  click(app, app.document.querySelector('#add-round-btn'));
  click(app, app.document.querySelector('#toggle-stats-btn'));

  const specialNameOption = [...app.document.querySelectorAll('#stats-player-filter option')]
    .find(option => option.value === 'A&B');
  assert.equal(specialNameOption.textContent, 'A&B');

  let playerFilter = app.document.querySelector('#stats-player-filter');
  playerFilter.value = 'A&B';
  change(app, playerFilter);
  playerFilter = app.document.querySelector('#stats-player-filter');
  assert.equal(playerFilter.value, 'A&B');
  assert.match(app.document.querySelector('#overall-stats').textContent, /Games1/);

  const saved = JSON.parse(app.window.localStorage.getItem('unoTrackerState'));
  assert.equal(saved.schemaVersion, 1);
  const gameDate = new Date(saved.games[0].date);
  const dateKey = [
    gameDate.getFullYear(),
    String(gameDate.getMonth() + 1).padStart(2, '0'),
    String(gameDate.getDate()).padStart(2, '0'),
  ].join('-');

  let dateFilter = app.document.querySelector('#stats-date-filter');
  dateFilter.value = dateKey;
  change(app, dateFilter);
  dateFilter = app.document.querySelector('#stats-date-filter');
  assert.equal(dateFilter.value, dateKey);
  assert.deepEqual(app.errors, []);
});

test('handles a __proto__ player name without corrupting scores', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  addPlayer(app, '__proto__');
  addPlayer(app, 'Bob');
  startGame(app);
  const inputs = app.document.querySelectorAll('.score-input');
  assert.equal(inputs[0].getAttribute('enterkeyhint'), 'next');
  assert.equal(inputs[1].getAttribute('enterkeyhint'), 'done');
  inputs[0].value = '0';
  inputs[1].value = '500';
  click(app, app.document.querySelector('#add-round-btn'));

  const saved = JSON.parse(app.window.localStorage.getItem('unoTrackerState'));
  assert.equal(saved.games[0].rounds[0].scores.__proto__, 0);
  assert.equal(saved.games[0].finalScores[0].score, 0);
  assert.deepEqual(app.errors, []);
});

test('migrates a one-player state and recovers from invalid storage', async t => {
  const onePlayerState = JSON.stringify({ players: ['Solo'], games: [], currentGame: null });
  const onePlayerApp = await createApp(onePlayerState);
  t.after(() => onePlayerApp.dom.window.close());
  assert.match(onePlayerApp.document.querySelector('#player-list').textContent, /Solo/);

  const invalidApp = await createApp('{broken json');
  t.after(() => invalidApp.dom.window.close());
  assert.match(invalidApp.document.querySelector('#info-modal-message').textContent, /Saved data was invalid/);
  assert.equal(invalidApp.window.localStorage.getItem('unoTrackerState'), null);
  assert.equal(invalidApp.window.localStorage.getItem('unoTrackerStateInvalidBackup'), '{broken json');
  assert.deepEqual(invalidApp.errors, []);
});

test('does not count co-winners as head-to-head wins', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  ['Alice', 'Bob', 'Charlie'].forEach(name => addPlayer(app, name));
  startGame(app);
  const inputs = app.document.querySelectorAll('.score-input');
  assert.equal(inputs[0].type, 'text');
  assert.equal(inputs[0].inputMode, 'numeric');
  assert.equal(inputs[0].pattern, '[0-9]*');
  assert.notEqual(inputs[0].placeholder, '0');
  inputs[0].value = '0';
  inputs[1].value = '0';
  inputs[2].value = '500';
  click(app, app.document.querySelector('#add-round-btn'));
  click(app, app.document.querySelector('#winner-options button'));
  click(app, app.document.querySelector('#toggle-stats-btn'));

  const aliceStats = app.document.querySelector('.h2h-player-row[data-player="Alice"]');
  assert.equal(aliceStats.querySelectorAll('td')[1].textContent, '0–0');
});

test('normalizes imported totals instead of rendering imported HTML', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  const payload = {
    players: ['Alice', 'Bob'],
    games: [{
      date: new Date().toISOString(),
      players: ['Alice', 'Bob'],
      winners: ['Alice'],
      finalScores: [
        { name: 'Alice', score: '<img src=x onerror=alert(1)>' },
        { name: 'Bob', score: 500 },
      ],
      rounds: [{ winner: 'Alice', scores: { Alice: 0, Bob: 500 } }],
    }],
    currentGame: null,
  };
  const file = new app.window.File([JSON.stringify(payload)], 'scores.json', { type: 'application/json' });
  const input = app.document.querySelector('#import-data-input');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  change(app, input);
  await new Promise(resolve => setTimeout(resolve, 20));

  assert.equal(app.document.querySelectorAll('img').length, 0);
  const imported = JSON.parse(app.window.localStorage.getItem('unoTrackerState'));
  assert.equal(imported.games[0].finalScores[0].score, 0);
  assert.equal(typeof imported.games[0].finalScores[0].score, 'number');
});

test('moves through compact score fields and shows live metrics after every round', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  addPlayer(app, 'Alice');
  addPlayer(app, 'Bob');
  startGame(app);

  const inputs = app.document.querySelectorAll('.score-input');
  inputs[0].value = '0';
  inputs[1].value = '40';
  inputs[0].dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(app.document.activeElement, inputs[1]);
  assert.equal(app.document.querySelector('#summary-rounds').textContent, '0');
  inputs[1].dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(resolve => app.window.requestAnimationFrame(resolve));

  const aliceCard = app.document.querySelector('.live-player-card[data-player="Alice"]');
  const bobCard = app.document.querySelector('.live-player-card[data-player="Bob"]');
  assert.equal(app.document.body.classList.contains('game-active'), true);
  assert.equal(app.document.querySelectorAll('#round-score-fields .score-input').length, 2);
  assert.equal(aliceCard.querySelector('.score-input'), null);
  assert.equal(app.document.activeElement, app.document.querySelector('#round-score-fields .score-input'));
  assert.equal(app.document.querySelector('#summary-rounds').textContent, '1');
  const saved = JSON.parse(app.window.localStorage.getItem('unoTrackerState'));
  assert.equal(saved.currentGame.rounds[0].scores.Alice, 0);
  assert.equal(saved.currentGame.rounds[0].winner, 'Alice');
  assert.equal(app.document.querySelector('#summary-leader').textContent, 'Alice');
  assert.equal(app.document.querySelector('#summary-spread').textContent, '40');
  assert.equal(aliceCard.querySelector('.leader-badge').textContent, 'Leader');
  assert.equal(aliceCard.querySelector('.round-wins').textContent, '1');
  assert.equal(bobCard.querySelector('.dealer-badge').textContent, 'Dealer');
  assert.equal(bobCard.querySelector('.last-round').textContent, '+40');
  assert.equal(bobCard.querySelector('.points-to-500').textContent, '460');
  assert.equal(bobCard.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '40');

  const bobComparison = app.document.querySelector('#live-stats-table tr[data-player="Bob"]');
  assert.match(bobComparison.textContent, /\+40/);
  assert.deepEqual(app.errors, []);
});

test('opens and closes the statistics drawer without rebuilding it on filter changes', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  addPlayer(app, 'Alice');
  addPlayer(app, 'Bob');
  startGame(app);
  const inputs = app.document.querySelectorAll('.score-input');
  inputs[0].value = '0';
  inputs[1].value = '500';
  click(app, app.document.querySelector('#add-round-btn'));

  assert.equal(app.document.body.classList.contains('game-complete'), true);
  assert.equal(app.document.querySelector('#current-game-title').textContent, 'Game results');
  assert.match(app.document.querySelector('.game-result-card').textContent, /Winner: Alice/);
  assert.ok(app.document.querySelector('#play-again-btn'));
  assert.equal(app.document.querySelector('#round-score-entry').classList.contains('hidden'), true);

  const toggle = app.document.querySelector('#toggle-stats-btn');
  click(app, toggle);
  await new Promise(resolve => app.window.requestAnimationFrame(resolve));

  const drawer = app.document.querySelector('#statistics-section');
  assert.equal(drawer.classList.contains('active'), true);
  assert.equal(drawer.getAttribute('aria-hidden'), 'false');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(app.document.activeElement.id, 'close-stats-btn');

  const overallStats = app.document.querySelector('#overall-stats');
  const playerFilter = app.document.querySelector('#stats-player-filter');
  playerFilter.value = 'Alice';
  change(app, playerFilter);
  assert.equal(app.document.querySelector('#overall-stats'), overallStats);

  click(app, app.document.querySelector('#stats-history-tab'));
  assert.equal(app.document.querySelector('#stats-history-tab').getAttribute('aria-selected'), 'true');
  assert.equal(app.document.querySelector('#stats-summary-panel').hidden, true);
  assert.equal(app.document.querySelector('#stats-history-panel').hidden, false);
  assert.match(app.document.querySelector('#game-history').textContent, /1 round/);
  assert.doesNotMatch(app.document.querySelector('#game-history').textContent, /1 rounds/);

  click(app, app.document.querySelector('#close-stats-btn'));
  assert.equal(drawer.classList.contains('active'), false);
  assert.equal(drawer.getAttribute('aria-hidden'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(app.document.activeElement, toggle);

  click(app, app.document.querySelector('#play-again-btn'));
  assert.equal(app.document.querySelector('#player-order-modal').classList.contains('active'), true);
  click(app, app.document.querySelector('#player-order-continue-btn'));
  click(app, app.document.querySelector('#dealer-options button'));
  assert.equal(app.document.body.classList.contains('game-complete'), false);
  assert.equal(app.document.querySelector('#current-game-title').textContent, 'Current Game');
  assert.equal(app.document.querySelector('#round-number').textContent, '1');
  assert.equal(app.document.querySelector('#current-dealer-name').textContent, 'Alice');
  assert.deepEqual(app.errors, []);
});

test('returns from completed results to player editing without showing both views', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  addPlayer(app, 'Alice');
  addPlayer(app, 'Bob');
  startGame(app);
  const inputs = app.document.querySelectorAll('.score-input');
  inputs[0].value = '0';
  inputs[1].value = '500';
  click(app, app.document.querySelector('#add-round-btn'));
  click(app, app.document.querySelector('#edit-players-btn'));

  assert.equal(app.document.body.classList.contains('game-complete'), false);
  assert.equal(app.document.querySelector('#game-area').classList.contains('hidden'), true);
  assert.equal(app.document.querySelector('#new-player-name').disabled, false);
  assert.equal(app.document.querySelector('#current-game-title').textContent, 'Current Game');
  assert.deepEqual(app.errors, []);
});


test('backs up completed games at any time without exporting the active game', async t => {
  const app = await createApp();
  t.after(() => app.dom.window.close());

  const exportButton = app.document.querySelector('header #export-data-btn');
  assert.ok(exportButton);
  assert.equal(exportButton.disabled, true);

  addPlayer(app, 'Alice');
  addPlayer(app, 'Bob');
  startGame(app);
  assert.equal(exportButton.disabled, true);

  let inputs = app.document.querySelectorAll('.score-input');
  inputs[0].value = '0';
  inputs[1].value = '500';
  click(app, app.document.querySelector('#add-round-btn'));
  assert.equal(app.document.body.classList.contains('game-complete'), true);
  assert.equal(exportButton.disabled, false);

  click(app, app.document.querySelector('#new-game-btn'));
  click(app, app.document.querySelector('#player-order-continue-btn'));
  click(app, app.document.querySelector('#dealer-options button'));
  assert.ok(JSON.parse(app.window.localStorage.getItem('unoTrackerState')).currentGame);
  assert.equal(exportButton.disabled, false);

  let exportedBlob = null;
  let downloadName = null;
  app.window.URL.createObjectURL = blob => {
    exportedBlob = blob;
    return 'blob:uno-backup';
  };
  app.window.URL.revokeObjectURL = () => {};
  app.window.HTMLAnchorElement.prototype.click = function() {
    downloadName = this.download;
  };

  click(app, exportButton);
  assert.ok(exportedBlob);
  assert.match(downloadName, /^uno-game-history-\d{4}-\d{2}-\d{2}\.json$/);

  const exportedText = await new Promise((resolve, reject) => {
    const reader = new app.window.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(exportedBlob);
  });
  const backup = JSON.parse(exportedText);
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.games.length, 1);
  assert.deepEqual(backup.players, ['Alice', 'Bob']);
  assert.equal(backup.currentGame, null);
  assert.deepEqual(app.errors, []);
});
