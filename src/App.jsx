import React, { useState, useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

const SCORE_LIMIT = 500;

function PlayerSetup({ onSetup }) {
  const [names, setNames] = useState('');
  const handle = () => {
    const players = names.split(',').map(n => n.trim()).filter(Boolean);
    if (players.length >= 2) onSetup(players);
    else alert('Syötä vähintään kaksi pelaajaa pilkulla erotettuna');
  };

  return (
    <div className="bg-white p-4 rounded shadow max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">Aseta Pelaajat</h2>
      <input
        className="border p-2 w-full mb-2"
        value={names}
        onChange={e => setNames(e.target.value)}
        placeholder="Esim. Liisa, Matti"
      />
      <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handle}>
        Aloita Peli
      </button>
    </div>
  );
}

function ScoreChart({ players, totalsHistory }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: totalsHistory.map((_, i) => i),
        datasets: players.map((p, idx) => ({ label: p, data: totalsHistory.map(t => t[idx]), fill: false }))
      },
      options: {
        responsive: true,
        scales: { x: { title: { display: true, text: 'Kierros' } }, y: { beginAtZero: true } }
      }
    });
    return () => chartRef.current.destroy();
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.data.labels = totalsHistory.map((_, i) => i);
    chartRef.current.data.datasets.forEach((ds, i) => {
      ds.data = totalsHistory.map(t => t[i]);
    });
    chartRef.current.update();
  }, [totalsHistory]);

  return <canvas ref={canvasRef} />;
}

function Game({ players, onReset }) {
  const [rounds, setRounds] = useState([]);
  const [inputs, setInputs] = useState(players.map(() => ''));
  const [isOver, setIsOver] = useState(false);

  const totalsHistory = [players.map(() => 0), ...rounds.reduce((acc, round) => {
    const last = acc[acc.length - 1];
    const next = last.map((t, i) => t + round[i]);
    acc.push(next);
    return acc;
  }, [])];

  const addRound = () => {
    const scores = inputs.map(v => parseInt(v, 10));
    if (scores.some(v => isNaN(v) || v < 0)) return alert('Pisteiden on oltava numeroita');
    setRounds([...rounds, scores]);
    setInputs(players.map(() => ''));
    const newTotals = totalsHistory[totalsHistory.length - 1]
      .map((t, i) => t + scores[i]);
    if (newTotals.some(t => t >= SCORE_LIMIT)) setIsOver(true);
  };

  const downloadCsv = () => {
    const headers = ['Kierros', ...players];
    let csv = headers.join(',') + '\n';
    rounds.forEach((scores, i) => {
      csv += [i + 1, ...scores].join(',') + '\n';
    });
    csv += ['Yhteensä', ...totalsHistory[totalsHistory.length - 1]].join(',');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uno.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Pisteet</h2>
      <div className="overflow-auto mb-2">
        <table className="min-w-full text-center border">
          <thead>
            <tr>
              <th className="border px-2">Kierros</th>
              {players.map(p => (
                <th key={p} className="border px-2">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((scores, i) => (
              <tr key={i}>
                <td className="border px-2">{i + 1}</td>
                {scores.map((s, idx) => (
                  <td key={idx} className="border px-2">{s}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border font-bold">Yhteensä</td>
              {totalsHistory[totalsHistory.length - 1].map((t, i) => (
                <td key={i} className="border font-bold">{t}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {!isOver && (
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <label className="w-20">{p}</label>
              <input
                className="border p-1 w-24"
                type="number"
                value={inputs[i]}
                onChange={e => {
                  const v = [...inputs];
                  v[i] = e.target.value;
                  setInputs(v);
                }}
              />
            </div>
          ))}
          <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={addRound}>
            Lisää Kierros
          </button>
        </div>
      )}

      {isOver && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Peli päättyi!</h3>
          <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={onReset}>Uusi Peli</button>
        </div>
      )}

      <div className="mt-4">
        <ScoreChart players={players} totalsHistory={totalsHistory} />
      </div>

      <button className="mt-4 bg-indigo-500 text-white px-3 py-1 rounded" onClick={downloadCsv}>Tallenna CSV</button>
    </div>
  );
}

export default function App() {
  const [players, setPlayers] = useState(null);
  const fileInputRef = useRef(null);

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const lines = evt.target.result.trim().split(/\r?\n/);
      const [, ...playerNames] = lines[0].split(',');
      setPlayers(playerNames);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {!players ? (
        <div className="space-y-2">
          <PlayerSetup onSetup={setPlayers} />
          <div>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} />
          </div>
        </div>
      ) : (
        <Game players={players} onReset={() => setPlayers(null)} />
      )}
    </div>
  );
}
