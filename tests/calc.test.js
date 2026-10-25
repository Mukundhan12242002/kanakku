const K = require('../src/calc.js');
let fails = 0;
function eq(name, got, want, tol) {
  tol = tol == null ? 0.5 : tol;
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' got=' + got + ' want=' + want);
}

// Property: sale 50L, guideline 40L, resale -> base 50L, stamp 3.5L, reg 1.0L
let p = K.propertyCost({ saleValue: 5000000, guidelineValue: 4000000, kind: 'resale', loanAmount: 3500000, rate: 8.5, years: 20 });
eq('base', p.base, 5000000);
eq('stamp', p.stamp, 350000);
eq('reg', p.reg, 100000);
eq('gst resale', p.gst, 0);
eq('total govt', p.govt, 450000);
eq('emi 35L 8.5% 20y', p.emi, 30375, 5);
// Guideline higher than sale price
p = K.propertyCost({ saleValue: 4000000, guidelineValue: 5000000, kind: 'resale' });
eq('base uses guideline', p.base, 5000000);
// Under construction GST 5%
p = K.propertyCost({ saleValue: 6000000, guidelineValue: 5000000, kind: 'uc', loanAmount: 0 });
eq('gst uc', p.gst, 300000);
// Women concession only up to 10 lakh
p = K.propertyCost({ saleValue: 900000, guidelineValue: 800000, womanBuyer: true, kind: 'resale' });
eq('women reg 1%', p.reg, 9000);
p = K.propertyCost({ saleValue: 1500000, guidelineValue: 800000, womanBuyer: true, kind: 'resale' });
eq('women no cut above 10L', p.reg, 30000);
// Loan capped at sale value
p = K.propertyCost({ saleValue: 1000000, guidelineValue: 0, loanAmount: 2000000, rate: 8, years: 10 });
eq('loan cap', p.loan, 1000000);
// EMI zero interest
eq('emi zero rate', K.emi(120000, 0, 1), 10000);

// Gratuity: basic+DA 40,000, total 1,00,000, 10 years, covered
let g = K.gratuity({ basicDA: 40000, totalRem: 100000, years: 10, months: 0, kind: 'permanent', divisor: 26 });
eq('gratuity old', g.oldAmt, 230769, 1);
eq('gratuity new', g.newAmt, 288462, 1);
eq('wage new', g.wageNew, 50000);
// 4 years 11 months permanent: not eligible
g = K.gratuity({ basicDA: 40000, totalRem: 100000, years: 4, months: 11, kind: 'permanent', divisor: 26 });
eq('permanent <5y not eligible', g.eligible ? 1 : 0, 0);
// Fixed term at 1 year: eligible
g = K.gratuity({ basicDA: 30000, totalRem: 50000, years: 1, months: 0, kind: 'fixed', divisor: 26 });
eq('fixed 1y eligible', g.eligible ? 1 : 0, 1);
eq('fixed 1y amount', g.newAmt, 30000 * 15 / 26, 1);
// Part-year rule: 7 months rounds up, 6 months does not
g = K.gratuity({ basicDA: 26000, totalRem: 40000, years: 6, months: 7, kind: 'permanent', divisor: 26 });
eq('counted 7 years', g.counted, 7);
g = K.gratuity({ basicDA: 26000, totalRem: 40000, years: 6, months: 6, kind: 'permanent', divisor: 26 });
eq('counted 6 years', g.counted, 6);
// Ceiling
g = K.gratuity({ basicDA: 500000, totalRem: 900000, years: 30, months: 0, kind: 'permanent', divisor: 26 });
eq('ceiling', g.newAmt, 2000000);
// Death waives the 5-year rule
g = K.gratuity({ basicDA: 30000, totalRem: 50000, years: 2, months: 0, kind: 'permanent', divisor: 26, deathOrDisability: true });
eq('death waives', g.eligible ? 1 : 0, 1);

// TNEB
let b = K.tnebBill(300);
eq('300 units energy', b.energy, 495);
eq('300 units total', b.total, 519.75, 0.01);
b = K.tnebBill(600);
eq('600 units energy', b.energy, 3030);
eq('600 units total', b.total, 3181.5, 0.01);
b = K.tnebBill(500);
eq('500 units energy', b.energy, 200 * 4.95 + 100 * 6.65, 0.01);
b = K.tnebBill(501);
eq('501 units energy (cliff)', b.energy, 300 * 4.95 + 100 * 6.65 + 1 * 8.80, 0.01);
b = K.tnebBill(150);
eq('150 units free', b.total, 0);
b = K.tnebBill(150, { freeUnits: 100 });
eq('150 units, 100-free scheme', b.energy, 50 * 4.95, 0.01);
let a = K.applianceUnits([{ name: 'fan', count: 2, watts: 75, hours: 10 }], 60);
eq('appliance units', a.total, 2 * 75 * 10 * 60 / 1000);

// Deed duty (state rate chart)
let d = K.deedDuty('sale', 5000000);
eq('sale deed stamp', d.stamp.amt, 350000); eq('sale deed reg', d.reg.amt, 100000);
d = K.deedDuty('settle-family', 10000000);
eq('family settlement stamp capped', d.stamp.amt, 40000); eq('family settlement reg capped', d.reg.amt, 10000);
eq('family settlement flagged capped', d.stamp.capped ? 1 : 0, 1);
d = K.deedDuty('settle-family', 1000000);
eq('family settlement 10L stamp', d.stamp.amt, 10000); eq('family settlement 10L not capped', d.reg.capped ? 1 : 0, 0);
d = K.deedDuty('partition-family', 20000000, 3);
eq('partition caps per share, stamp', d.stamp.amt, 120000); eq('partition caps per share, reg', d.reg.amt, 30000);
d = K.deedDuty('agree-sale', 500000);
eq('agreement to sell stamp', d.stamp.amt, 200); eq('agreement to sell reg', d.reg.amt, 5000);
d = K.deedDuty('lease99', 1000000);
eq('lease 99y stamp', d.stamp.amt, 40000); eq('lease 99y reg', d.reg.amt, 10000);
d = K.deedDuty('poa-family', 0);
eq('POA to family total', d.total, 3000);
d = K.deedDuty('mort-simple', 10000000);
eq('simple mortgage stamp cap', d.stamp.amt, 50000); eq('simple mortgage reg cap', d.reg.amt, 15000);
d = K.deedDuty('mortgage-deposit', 5000000);
eq('deposit of title deeds stamp', d.stamp.amt, 25000); eq('deposit reg', d.reg.amt, 8000);
eq('every deed id resolves', K.DEEDS.filter(function (x) { return K.deedDuty(x.id, 100000, 2); }).length, K.DEEDS.length);

// Loan schedule and prepayment
let ls = K.loanSchedule({ loan: 1200000, rate: 0, years: 10 });
eq('0% loan emi', ls.emi, 10000); eq('0% loan months', ls.months, 120); eq('0% loan interest', ls.interest, 0);
ls = K.loanSchedule({ loan: 3500000, rate: 8.5, years: 20 });
eq('schedule months', ls.months, 240, 1);
eq('schedule interest vs emi x n', ls.interest, 30375 * 240 - 3500000, 3000);
let pp = K.prepayment({ loan: 1200000, rate: 0, years: 10, extraMonthly: 10000 });
eq('prepay 0% months', pp.withPre.months, 60); eq('prepay 0% saves no interest', pp.interestSaved, 0);
pp = K.prepayment({ loan: 4000000, rate: 8.75, years: 20, extraMonthly: 5000 });
eq('prepay shortens loan', pp.monthsSaved > 0 ? 1 : 0, 1); eq('prepay saves interest', pp.interestSaved > 0 ? 1 : 0, 1);
pp = K.prepayment({ loan: 4000000, rate: 8.75, years: 20 });
eq('no prepayment saves nothing', pp.interestSaved, 0, 1);
pp = K.prepayment({ loan: 4000000, rate: 8.75, years: 20, lump: 500000, lumpMonth: 1 });
eq('lump sum in month 1 saves interest', pp.interestSaved > 500000 ? 1 : 0, 1);

// SIP
let sp = K.sipPlan({ sip: 1000, stepUp: 0, returnPct: 0, years: 2 });
eq('sip 0% flat', sp.value, 24000); eq('sip invested', sp.invested, 24000);
sp = K.sipPlan({ sip: 1000, stepUp: 10, returnPct: 0, years: 2 });
eq('sip 10% step-up 0% return', sp.value, 25200);
sp = K.sipPlan({ sip: 1000, stepUp: 0, returnPct: 12, years: 1 });
eq('sip 12% one year', sp.value, 12809.3, 1);
sp = K.sipPlan({ sip: 1000, stepUp: 0, returnPct: 0, years: 10, inflation: 6 });
eq('sip real value', sp.real, 120000 / Math.pow(1.06, 10), 1);

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
