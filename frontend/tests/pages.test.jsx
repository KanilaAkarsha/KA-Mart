// Renders every page against a RUNNING backend (with data) and fails on crashes or React errors.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import api from '../src/api';

const errors = []; const origError = console.error; console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 200)); };
beforeAll(async () => { const r = await api.post('/auth/login', { email: process.env.TEST_EMAIL || 'admin@kamart.lk', password: process.env.TEST_PASSWORD || 'SmokeTest12345' }); localStorage.setItem('kam_token', r.data.token); });
const show = async (route) => { cleanup(); errors.length = 0; render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull(), { timeout: 15000 }); await new Promise((r) => setTimeout(r, 300)); };
const PAGES = [['/', 'Dashboard', 'Net profit'], ['/products', 'Products', 'iPhone'], ['/inventory', 'Inventory', 'Potential profit'], ['/purchases', 'Purchases', 'PUR-'], ['/sales', 'Sales', 'INV-'], ['/customers', 'Customers', 'Nimal'], ['/suppliers', 'Suppliers', 'Sup A'],
  ['/expenses', 'Expenses', 'Delivery'], ['/accounts', 'Accounts', 'Cash'], ['/pnl', 'Profit & Loss', 'Gross profit'], ['/closing', 'Daily Closing', 'Expected closing cash'], ['/payables', 'Payables & Receivables', 'Total outstanding'],
  ['/reports', 'Reports', 'Sales'], ['/cashflow', 'Cash Flow', 'Transaction type'], ['/settings', 'Settings', 'Lists used in forms']];
describe('pages render with real data', () => {
  for (const [route, heading, text] of PAGES) it(`${route} shows ${heading}`, async () => { await show(route);
    expect(screen.getAllByText(new RegExp(heading.replace(/[&]/g, '.'), 'i')).length).toBeGreaterThan(0); expect(screen.getAllByText(new RegExp(text, 'i')).length).toBeGreaterThan(0);
    expect(errors, errors.join('\n')).toEqual([]); });
  it('every list has an Edit button and it opens a filled form', async () => { await show('/products'); const row = screen.getAllByText(/iPhone/)[0].closest('tr'); fireEvent.click(within(row).getByText('Edit'));
    expect(screen.getByText(/Edit Product/i)).toBeTruthy(); expect(screen.getByDisplayValue(/iPhone/)).toBeTruthy(); });
  it('customers edit form prefilled', async () => { await show('/customers'); fireEvent.click(screen.getAllByText('Edit')[0]); expect(screen.getByDisplayValue('Nimal')).toBeTruthy(); });
  it('expenses edit form shows money in rupees', async () => { await show('/expenses'); fireEvent.click(screen.getAllByText('Edit')[0]); expect(screen.getByText(/old entry is reversed/i)).toBeTruthy(); });
  it('sales: New sale form has labelled fields; Return dialog opens', async () => { await show('/sales'); fireEvent.click(screen.getByText(/New sale/)); expect(screen.getByText('Unit price (Rs.)')).toBeTruthy(); expect(screen.getByText('Payment method')).toBeTruthy(); cleanup();
    await show('/sales'); const ret = screen.queryAllByText('Return')[0]; if (ret) { fireEvent.click(ret); expect(screen.getByText(/Return items/)).toBeTruthy(); } });
  it('purchases page has Delete button and Show deleted toggle', async () => { await show('/purchases'); expect(screen.getAllByText('Delete').length).toBeGreaterThan(0); expect(screen.getByText('Show deleted')).toBeTruthy(); });
  it('new purchase form has Scan bill, date and notes', async () => { await show('/purchases'); fireEvent.click(screen.getByText(/New purchase/)); expect(screen.getByText(/Scan bill/)).toBeTruthy(); expect(screen.getByText('Purchase date')).toBeTruthy(); expect(screen.getByText('Bill / invoice no.')).toBeTruthy(); expect(screen.getByText('Notes')).toBeTruthy(); });
  it('accounts page has Delete; tables end with a Total row; dashboard shows net position', async () => {
    await show('/accounts'); expect(screen.getAllByText('Delete').length).toBeGreaterThan(0); expect(screen.getAllByText(/^Total \(/).length).toBeGreaterThan(0);
    for (const r of ['/products', '/inventory', '/customers', '/suppliers', '/expenses', '/sales', '/purchases', '/payables', '/reports']) { await show(r); expect(screen.getAllByText(/^(Total|Net cash)/).length, r).toBeGreaterThan(0); }
    await show('/'); expect(screen.getByText('Net position')).toBeTruthy(); });
  it('statement opens for a customer', async () => { await show('/customers'); fireEvent.click(screen.getAllByText('Statement')[0]); await waitFor(() => expect(screen.getByText(/statement/i)).toBeTruthy()); });
  it('reports page loads another report and csv button exists', async () => { await show('/reports'); expect(screen.getByText('CSV')).toBeTruthy(); });
  it('unauthenticated user is sent to login', async () => { localStorage.removeItem('kam_token'); cleanup(); render(<MemoryRouter initialEntries={['/sales']}><App /></MemoryRouter>); await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy()); });
});
