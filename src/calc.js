/* Kanakku calculation core. Pure functions, no DOM. Works in browsers and in Node for tests.
   Every group in RATES carries the date it was last checked against its sources.
   scripts/check_freshness.py fails when a group is older than the limit. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Kanakku = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RATES = {
    property: {
      checked: '2026-10-25',
      stampPct: 7,            // sale deed: 7% of market value (state rate chart)
      regPct: 2,              // G.O.(Ms.) No.34, w.e.f. 01.04.2023 (many sites still quote 4%)
      womenRegCutPct: 1,      // NOT in the state chart; reported by secondary sources only
      womenCapValue: 1000000,
      gstPct: 5,              // under-construction, non-affordable
      gstAffordablePct: 1
    },
    deeds: { checked: '2026-10-25' },
    gratuity: {
      checked: '2026-10-25',
      ceiling: 2000000,
      permanentMinYears: 5,
      fixedTermMinYears: 1,
      wageFloorPct: 50
    },
    tneb: {
      checked: '2026-10-25',
      dutyPct: 5,
      // Bi-monthly telescopic slabs, LT-IA domestic, TNERC Tariff Order No. 6 of 2025
      tier1Free200: [{ to: 200, rate: 0 }, { to: 400, rate: 4.95 }, { to: 500, rate: 6.65 }],
      tier1Free100: [{ to: 100, rate: 0 }, { to: 400, rate: 4.95 }, { to: 500, rate: 6.65 }],
      tier2: [
        { to: 100, rate: 0 }, { to: 400, rate: 4.95 }, { to: 500, rate: 6.65 },
        { to: 600, rate: 8.80 }, { to: 800, rate: 9.95 }, { to: 1000, rate: 11.05 },
        { to: Infinity, rate: 12.15 }
      ]
    }
  };

  /* Tamil Nadu duty by instrument. Source: state rate chart that consolidates
     G.O.(Ms.) No.34 (1 Apr 2023), G.O.Ms.No.69 (10 Jul 2023), TN Act 13 of 2024 and IGR Letter 28442/C1/2018.
     pct = percent of the value entered, cap = rupee ceiling, flat = fixed rupees.
     perShare = the cap applies to each share, so it is multiplied by the number of shares. */
  var DEEDS = [
    { id: 'sale', group: 'Sale and transfer', label: 'Sale or conveyance deed', valueLabel: 'Market value or guideline value, whichever is higher', stamp: { pct: 7 }, reg: { pct: 2 } },
    { id: 'gift', group: 'Sale and transfer', label: 'Gift deed (to a non-family member)', valueLabel: 'Market value of the property', stamp: { pct: 7 }, reg: { pct: 2 } },
    { id: 'exchange', group: 'Sale and transfer', label: 'Exchange deed', valueLabel: 'Market value of the property of greater value', stamp: { pct: 7 }, reg: { pct: 2 } },
    { id: 'salecert', group: 'Sale and transfer', label: 'Sale certificate (court, revenue authority or auction)', valueLabel: 'Auction price', stamp: { pct: 5 }, reg: { pct: 2 } },
    { id: 'settle-family', group: 'Family deeds', label: 'Settlement in favour of family', valueLabel: 'Market value of the property', stamp: { pct: 1, cap: 40000 }, reg: { pct: 1, cap: 10000 },
      note: 'Gifts between close family members are often registered as settlements. Ask the sub-registrar which one applies to you.' },
    { id: 'settle-other', group: 'Family deeds', label: 'Settlement in favour of a non-family member', valueLabel: 'Market value of the property', stamp: { pct: 7 }, reg: { pct: 2 } },
    { id: 'release-family', group: 'Family deeds', label: 'Release among family members', valueLabel: 'Market value of the property', stamp: { pct: 1, cap: 40000 }, reg: { pct: 1, cap: 10000 } },
    { id: 'release-other', group: 'Family deeds', label: 'Release to a non-family member or co-owner', valueLabel: 'Market value of the property', stamp: { pct: 7 }, reg: { pct: 1 } },
    { id: 'partition-family', group: 'Family deeds', label: 'Partition among family members', valueLabel: 'Market value of the property partitioned', stamp: { pct: 1, cap: 40000, perShare: true }, reg: { pct: 1, cap: 10000, perShare: true }, shares: true,
      note: 'The caps apply to each share. "Family" includes a legal heir of a deceased family member.' },
    { id: 'partition-other', group: 'Family deeds', label: 'Partition among non-family members', valueLabel: 'Market value of the separated shares', stamp: { pct: 4 }, reg: { pct: 1 } },
    { id: 'agree-sale', group: 'Agreements', label: 'Agreement to sell', valueLabel: 'Money advanced (or total price if possession is given)', stamp: { flat: 200 }, reg: { pct: 1 },
      note: 'Registration is 1% of the money advanced, or 1% of the total price if you take possession.' },
    { id: 'agree-build', group: 'Agreements', label: 'Agreement for construction of a building', valueLabel: 'Cost or value of construction', stamp: { pct: 1 }, reg: { pct: 3 } },
    { id: 'mort-simple', group: 'Loans and mortgages', label: 'Simple mortgage (without possession)', valueLabel: 'Loan amount', stamp: { pct: 1, cap: 50000 }, reg: { pct: 1, cap: 15000 } },
    { id: 'mort-poss', group: 'Loans and mortgages', label: 'Mortgage with possession', valueLabel: 'Loan amount', stamp: { pct: 4 }, reg: { pct: 1, cap: 200000 } },
    { id: 'mortgage-deposit', group: 'Loans and mortgages', label: 'Memorandum of deposit of title deeds', valueLabel: 'Loan amount', stamp: { pct: 0.5, cap: 40000 }, reg: { pct: 1, cap: 8000 } },
    { id: 'lease30', group: 'Leases', label: 'Lease below 30 years', valueLabel: 'Total rent, premium and advance over the lease', stamp: { pct: 1 }, reg: { pct: 1, cap: 40000 } },
    { id: 'lease99', group: 'Leases', label: 'Lease of 30 to 99 years', valueLabel: 'Total rent, premium and advance over the lease', stamp: { pct: 4 }, reg: { pct: 1, cap: 40000 } },
    { id: 'lease-long', group: 'Leases', label: 'Lease above 99 years or perpetual', valueLabel: 'Total rent, premium and advance over the lease', stamp: { pct: 7 }, reg: { pct: 1, cap: 40000 } },
    { id: 'poa-sell', group: 'Power of attorney', label: 'Power of attorney to sell, given for consideration', valueLabel: 'Market value of the property', stamp: { pct: 5 }, reg: { pct: 1 } },
    { id: 'poa-family', group: 'Power of attorney', label: 'Power of attorney to sell, to a family member', valueLabel: '', stamp: { flat: 1000 }, reg: { flat: 2000 } },
    { id: 'poa-other', group: 'Power of attorney', label: 'Power of attorney to sell, to a non-family member', valueLabel: 'Market value of the property', stamp: { pct: 1 }, reg: { pct: 1 } },
    { id: 'trust', group: 'Other', label: 'Declaration of trust', valueLabel: 'Corpus fund', stamp: { flat: 1000 }, reg: { pct: 1 } },
    { id: 'partnership', group: 'Other', label: 'Partnership deed', valueLabel: 'Capital invested', stamp: { flat: 1000 }, reg: { pct: 1 } },
    { id: 'cancel', group: 'Other', label: 'Cancellation deed', valueLabel: '', stamp: { flat: 1000 }, reg: { flat: 500 } }
  ];

  function n(x) { var v = Number(x); return isFinite(v) && v > 0 ? v : 0; }

  function inr(x) {
    var neg = x < 0;
    var s = Math.round(Math.abs(x)).toLocaleString('en-IN');
    return (neg ? '-' : '') + '₹' + s;
  }

  function trim2(x) { return String(Math.round(x * 100) / 100); }

  function words(x) {
    x = Math.abs(Number(x));
    if (!isFinite(x) || x < 1000) return '';
    if (x >= 1e7) return '₹' + trim2(x / 1e7) + ' crore';
    if (x >= 1e5) return '₹' + trim2(x / 1e5) + ' lakh';
    return '₹' + trim2(x / 1e3) + ' thousand';
  }

  function emi(principal, annualPct, years) {
    var P = n(principal), N = Math.round(n(years) * 12), r = n(annualPct) / 12 / 100;
    if (P === 0 || N === 0) return 0;
    if (r === 0) return P / N;
    var f = Math.pow(1 + r, N);
    return P * r * f / (f - 1);
  }

  function propertyCost(i, r) {
    r = r || RATES.property;
    var sale = n(i.saleValue), guide = n(i.guidelineValue);
    var base = Math.max(sale, guide);
    var stamp = base * r.stampPct / 100;
    var regPct = r.regPct;
    var womenApplied = !!i.womanBuyer && base > 0 && base <= r.womenCapValue;
    if (womenApplied) regPct = Math.max(0, regPct - r.womenRegCutPct);
    var reg = base * regPct / 100;
    var gstPct = i.kind === 'uc' ? r.gstPct : (i.kind === 'uc-affordable' ? r.gstAffordablePct : 0);
    var gst = sale * gstPct / 100;
    var govt = stamp + reg;
    var other = n(i.otherCosts);
    var loan = Math.min(n(i.loanAmount), sale);
    var down = sale - loan;
    return {
      sale: sale, guide: guide, base: base, usedGuideline: guide > sale,
      stamp: stamp, reg: reg, regPct: regPct, womenApplied: womenApplied,
      gst: gst, gstPct: gstPct, govt: govt, govtPct: base > 0 ? govt / base * 100 : 0,
      other: other, totalCost: sale + govt + gst + other,
      loan: loan, down: down, cash: down + govt + gst + other,
      emi: emi(loan, i.rate, i.years)
    };
  }

  function deedById(id) {
    for (var k = 0; k < DEEDS.length; k++) if (DEEDS[k].id === id) return DEEDS[k];
    return null;
  }

  function deedPart(p, v, shares, perShareDefault) {
    if (p.flat != null) return { amt: p.flat, raw: p.flat, cap: null, capped: false, flat: true, pct: null };
    var raw = v * p.pct / 100;
    var cap = p.cap != null ? p.cap * (p.perShare ? Math.max(1, Math.round(shares || 1)) : 1) : null;
    var amt = cap != null ? Math.min(raw, cap) : raw;
    return { amt: amt, raw: raw, cap: cap, capped: cap != null && raw > cap, flat: false, pct: p.pct };
  }

  function deedDuty(id, value, shares) {
    var d = deedById(id);
    if (!d) return null;
    var v = n(value);
    var s = deedPart(d.stamp, v, shares), r = deedPart(d.reg, v, shares);
    return { deed: d, value: v, stamp: s, reg: r, total: s.amt + r.amt, pctOfValue: v > 0 ? (s.amt + r.amt) / v * 100 : 0 };
  }

  function gratuity(i, r) {
    r = r || RATES.gratuity;
    var months = Math.round(n(i.years) * 12 + n(i.months));
    var fullYears = Math.floor(months / 12);
    var rem = months - fullYears * 12;
    var counted = fullYears + (rem > 6 ? 1 : 0);
    var minMonths = (i.kind === 'fixed' ? r.fixedTermMinYears : r.permanentMinYears) * 12;
    var eligible = !!i.deathOrDisability || months >= minMonths;
    var div = Number(i.divisor) === 30 ? 30 : 26;
    var basicDA = n(i.basicDA), total = n(i.totalRem);
    var wageOld = basicDA;
    var wageNew = Math.max(basicDA, total * r.wageFloorPct / 100);
    function amt(w) { return Math.min(w * 15 / div * counted, r.ceiling); }
    var oldAmt = eligible ? amt(wageOld) : 0, newAmt = eligible ? amt(wageNew) : 0;
    return {
      months: months, counted: counted, eligible: eligible, minMonths: minMonths,
      div: div, wageOld: wageOld, wageNew: wageNew, wageRaised: wageNew > wageOld,
      oldAmt: oldAmt, newAmt: newAmt, diff: newAmt - oldAmt,
      capped: eligible && (wageNew * 15 / div * counted) > r.ceiling
    };
  }

  function tnebBill(units, o) {
    o = o || {};
    var u = n(units);
    var t = RATES.tneb;
    var dutyPct = o.dutyPct != null ? Number(o.dutyPct) : t.dutyPct;
    var free = Number(o.freeUnits) === 100 ? 100 : 200;
    var tier1 = u <= 500;
    var sched = tier1 ? (free === 100 ? t.tier1Free100 : t.tier1Free200) : t.tier2;
    var prev = 0, rows = [], energy = 0;
    for (var k = 0; k < sched.length; k++) {
      var take = Math.max(0, Math.min(u, sched[k].to) - prev);
      if (take > 0) {
        var amount = take * sched[k].rate;
        rows.push({ from: prev + 1, to: sched[k].to, units: take, rate: sched[k].rate, amount: amount });
        energy += amount;
      }
      prev = sched[k].to;
    }
    var duty = energy * dutyPct / 100;
    return {
      units: u, tier1: tier1, freeUnits: tier1 ? free : 100, rows: rows,
      energy: energy, duty: duty, total: energy + duty, dutyPct: dutyPct
    };
  }

  function applianceUnits(list, days) {
    var d = n(days) || 60, total = 0, items = [];
    for (var k = 0; k < list.length; k++) {
      var a = list[k];
      var kwh = n(a.count) * n(a.watts) * n(a.hours) * d / 1000;
      items.push({ name: a.name, units: kwh });
      total += kwh;
    }
    return { total: total, items: items };
  }

  /* Loan schedule with optional prepayments. EMI stays fixed, so prepaying shortens the loan.
     lumpMonth is the month (1-based) in which the one-time prepayment is paid with that month's EMI. */
  function loanSchedule(i) {
    var P = n(i.loan), rate = n(i.rate) / 12 / 100, years = n(i.years);
    var base = emi(P, i.rate, years);
    var extra = n(i.extraMonthly), lump = n(i.lump), lumpMonth = Math.max(1, Math.round(n(i.lumpMonth) || 1));
    var bal = P, month = 0, interest = 0, yearly = [];
    var maxMonths = Math.round(years * 12) + 1;
    var yr = { year: 1, interest: 0, principal: 0 };
    if (P === 0 || base === 0) return { emi: 0, months: 0, interest: 0, yearly: [], total: 0 };
    while (bal > 0.005 && month < maxMonths) {
      month++;
      var int = bal * rate;
      var pay = base + extra + (month === lumpMonth ? lump : 0);
      var princ = Math.min(bal, pay - int);
      if (princ < 0) princ = 0;
      bal -= princ;
      interest += int;
      yr.interest += int; yr.principal += princ;
      if (month % 12 === 0 || bal <= 0.005) {
        yr.balance = Math.max(0, bal); yearly.push(yr);
        yr = { year: yearly.length + 1, interest: 0, principal: 0 };
      }
    }
    return { emi: base, months: month, interest: interest, yearly: yearly, total: P + interest };
  }

  function prepayment(i) {
    var plain = loanSchedule({ loan: i.loan, rate: i.rate, years: i.years });
    var withPre = loanSchedule(i);
    return {
      plain: plain, withPre: withPre,
      interestSaved: plain.interest - withPre.interest,
      monthsSaved: plain.months - withPre.months
    };
  }

  /* SIP with an annual step-up. Contributions are made at the start of each month,
     growth is return/12 per month (the convention most Indian calculators use). */
  function sipPlan(i) {
    var sip = n(i.sip), step = n(i.stepUp) / 100, ret = n(i.returnPct) / 100 / 12, years = Math.round(n(i.years));
    var infl = n(i.inflation) / 100;
    var value = 0, invested = 0, cur = sip, rows = [];
    for (var y = 1; y <= years; y++) {
      for (var m = 0; m < 12; m++) {
        value = (value + cur) * (1 + ret);
        invested += cur;
      }
      rows.push({ year: y, monthly: cur, invested: invested, value: value });
      cur = cur * (1 + step);
    }
    var real = infl > 0 ? value / Math.pow(1 + infl, years) : value;
    return { value: value, invested: invested, gain: value - invested, real: real, rows: rows, lastMonthly: rows.length ? rows[rows.length - 1].monthly : 0 };
  }

  return {
    RATES: RATES, DEEDS: DEEDS,
    inr: inr, words: words, emi: emi,
    propertyCost: propertyCost, deedDuty: deedDuty, gratuity: gratuity,
    tnebBill: tnebBill, applianceUnits: applianceUnits,
    loanSchedule: loanSchedule, prepayment: prepayment, sipPlan: sipPlan
  };
});
