import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App.jsx';

test('renders setup heading', () => {
  render(<App />);
  expect(screen.getByText(/Aseta Pelaajat/i)).toBeInTheDocument();
});
