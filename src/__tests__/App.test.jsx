const fs = require('fs');

test('html contains setup heading', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  expect(/Aseta Pelaajat/i.test(html)).toBe(true);
});
