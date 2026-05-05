import backend from './dist/index.js';

async function runTests() {
  await backend.init();
  console.log('Backend initialized');
  
  try {
    console.log('--- Test 1: Auth ---');
    const authRes = await backend.auth.login('admin', 'admin123');
    if (authRes) {
      console.log('Login admin: SUCCESS', authRes.username);
    } else {
      console.log('Login admin: FAILED (Wrong credentials or user not found)');
    }
  } catch (e) {
    console.log('Login admin: ERROR', e);
  }

  try {
    console.log('--- Test 2: Products ---');
    const pRes = await backend.products.getAll({});
    console.log('Get products: SUCCESS, total = ', pRes.data?.length);
  } catch (e) {
    console.log('Get products: ERROR', e);
  }

  try {
    console.log('--- Test 3: Stock ---');
    const sRes = await backend.stock.getDashboard();
    console.log('Get stock dashboard: SUCCESS', sRes);
  } catch (e) {
    console.log('Get stock dashboard: ERROR', e);
  }
  
  try {
    console.log('--- Test 4: Sales ---');
    const s2Res = await backend.sales.getAll({});
    console.log('Get sales: SUCCESS, total = ', s2Res.data?.length);
  } catch (e) {
    console.log('Get sales: ERROR', e);
  }
  
  try {
    console.log('--- Test 5: Reports ---');
    const date = new Date().toISOString().slice(0, 10);
    const rRes = await backend.reports.getDailyReport(date);
    console.log('Get daily report: SUCCESS', rRes);
  } catch (e) {
    console.log('Get daily report: ERROR', e);
  }
  
  process.exit(0);
}

runTests();
