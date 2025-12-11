/* ================= КОНФИГУРАЦИЯ И ДАННЫЕ ================= */
const fullPortfolioData = [
    { name: "ЛУКОЙЛ", ticker: "LKOH", quantity: 3, type: "share" },
    { name: "Татнефть", ticker: "TATN", quantity: 5, type: "share" },
    { name: "Хэдхантер МКПАО", ticker: "HEAD", quantity: 3, type: "share" },
    { name: "Самолёт ГК", ticker: "SMLT", quantity: 2, type: "share" },
    { name: "Сберегательный", ticker: "SBMM", quantity: 88, type: "share" },
    { name: "Топ Российских акций", ticker: "SBMX", quantity: 1, type: "share" },
    { name: "Ежемесячный доход", ticker: "FLOW", quantity: 1, type: "share" },
    { name: "Доступное золото", ticker: "SBGD", quantity: 2, type: "share" },
    { name: "АЛРОСА", ticker: "ALRS", quantity: 20, type: "share" },
    { name: "БалтЛиз П19", ticker: "RU000A10CC32", quantity: 1, type: "bond" },
    { name: "ОФЗ 26226", ticker: "SU26226RMFS9", quantity: 1, type: "bond" },
    { name: "Рубли", ticker: "RUB", quantity: 2.85, type: "cash", currentPrice: 1 }
];

let portfolio = JSON.parse(localStorage.getItem('my_portfolio_v3')) || fullPortfolioData;

const ui = {
    list: document.getElementById('assetList'),
    total: document.getElementById('totalValue'),
    count: document.getElementById('countValue'),
    form: document.getElementById('assetForm'),
    clock: document.getElementById('clock'),
    date: document.getElementById('date'),
    refreshIcon: document.getElementById('refreshIcon'),
    sectorsContainer: document.getElementById('sectorsContainer'),
    loading: document.getElementById('loading')
};

const originalFormPosition = {
    parent: ui.form.parentNode,
    nextSibling: ui.form.nextSibling
};

let editIndex = -1;

/* ================= ФУНКЦИИ ВРЕМЕНИ ================= */
function updateClock() {
    const now = new Date();
    ui.clock.innerText = now.toLocaleTimeString('ru-RU');
    ui.date.innerText = now.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}
setInterval(updateClock, 1000);
updateClock();

/* ================= СЕКТОРА ================= */
function updateSectorsDisplay(sectors, totalSum) {
    if (!totalSum || totalSum <= 0) {
        ui.sectorsContainer.innerHTML = '';
        return;
    }

    ui.sectorsContainer.innerHTML = '';

    Object.entries(sectors).forEach(([name, value]) => {
        if (value <= 0) return;
        const percent = ((value / totalSum) * 100).toFixed(1);
        const card = document.createElement('div');
        card.className = 'sector-card';
        card.innerHTML = `
            <div class="sector-name">${name}</div>
            <div class="sector-value">${formatMoney(value)}</div>
            <div class="sector-percent">${percent}%</div>
        `;
        ui.sectorsContainer.appendChild(card);
    });
}

/* ================= РЕНДЕР ================= */
function render() {
    const sectors = {
        "Нефть и газ": 0,
        "IT и телеком": 0,
        "Финансы": 0,
        "Строительство": 0,
        "Государство": 0,
        "Металлургия": 0,
        "Валюта": 0
    };

    ui.list.innerHTML = '';
    let totalSum = 0;

    portfolio.forEach((asset, index) => {
        const price = asset.currentPrice || 0;
        let val = price * asset.quantity;

        if (asset.ticker === "LKOH" || asset.ticker === "TATN") {
            sectors["Нефть и газ"] += val;
        } else if (asset.ticker === "HEAD") {
            sectors["IT и телеком"] += val;
        } else if (asset.ticker && asset.ticker.includes("SB")) {
            sectors["Финансы"] += val;
        } else if (asset.ticker === "SMLT") {
            sectors["Строительство"] += val;
        } else if (asset.type === "bond") {
            sectors["Государство"] += val;
        } else if (asset.ticker === "ALRS") {
            sectors["Металлургия"] += val;
        } else if (asset.type === "cash") {
            sectors["Валюта"] += val;
        }

        let displayPrice = price;
        let calculatedTotal = 0;

        if (asset.type === 'bond') {
            let bondPriceRub = displayPrice;
            if (displayPrice < 200) bondPriceRub = displayPrice * 10;
            calculatedTotal = bondPriceRub * asset.quantity;
            displayPrice = bondPriceRub;
        } else {
            calculatedTotal = displayPrice * asset.quantity;
        }

        totalSum += calculatedTotal;

        let changeHTML = '';
        if (asset.change !== undefined && asset.change !== 0) {
            const changeClass = asset.change > 0 ? 'change-up' : 'change-down';
            const changeSign = asset.change > 0 ? '+' : '';
            changeHTML = `
                <div class="price-change ${changeClass}">
                    ${changeSign}${asset.changePercent || '0.00'}%
                </div>
            `;
        }

        const el = document.createElement('div');
        el.className = 'asset-row';
        el.setAttribute('role', 'listitem');
        el.innerHTML = `
            <div class="asset-left">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-meta">
                    <span class="ticker-badge">${asset.ticker}</span>
                    <span class="qty-badge">${asset.quantity} шт</span>
                </div>
            </div>
            <div class="asset-right">
                <div class="price-info">
                    <div class="total-price">${formatMoney(calculatedTotal)}</div>
                    <div class="unit-price">${formatMoney(displayPrice)} / шт</div>
                </div>
                ${changeHTML}
                <div class="row-actions">
                    <button class="btn-icon" onclick="editAsset(${index})" aria-label="Редактировать ${asset.ticker}">✎</button>
                    <button class="btn-icon del" onclick="deleteAsset(${index})" aria-label="Удалить ${asset.ticker}">✕</button>
                </div>
            </div>
        `;
        ui.list.appendChild(el);
    });

    updateSectorsDisplay(sectors, totalSum);

    ui.total.innerHTML = formatMoney(totalSum).replace('₽', '') + ' <span class="stat-currency">₽</span>';
    ui.count.innerText = portfolio.length;

    save();
}

function formatMoney(num) {
    if (isNaN(num) || !isFinite(num)) num = 0;
    return num.toLocaleString('ru-RU', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }) + ' ₽';
}

/* ================= ДАННЫЕ ================= */
function save() {
    localStorage.setItem('my_portfolio_v3', JSON.stringify(portfolio));
}

function deleteAsset(index) {
    if (confirm('Удалить актив?')) {
        portfolio.splice(index, 1);
        render();
    }
}

window.editAsset = function(index) {
    const asset = portfolio[index];
    document.getElementById('inpTicker').value = asset.ticker;
    document.getElementById('inpName').value = asset.name;
    document.getElementById('inpQty').value = asset.quantity;
    document.getElementById('inpType').value = asset.type || 'share';
    document.getElementById('formTitle').innerText = 'Редактирование позиции';
    editIndex = index;

    // Перемещаем форму под актив
    const assetEl = ui.list.children[index];
    assetEl.after(ui.form);

    ui.form.classList.add('visible');
    ui.form.setAttribute('aria-hidden', 'false');
    document.getElementById('inpTicker').focus();
}

window.toggleForm = function() {
    const wasVisible = ui.form.classList.contains('visible');
    ui.form.classList.toggle('visible');
    const nowVisible = ui.form.classList.contains('visible');
    ui.form.setAttribute('aria-hidden', !nowVisible);
    document.querySelector('[onclick="toggleForm()"]').setAttribute('aria-expanded', nowVisible);
    if (!nowVisible) {
        document.getElementById('inpTicker').value = '';
        document.getElementById('inpName').value = '';
        document.getElementById('inpQty').value = '';
        document.getElementById('inpType').value = 'share';
        document.getElementById('formTitle').innerText = 'Новая позиция';
        editIndex = -1;
        // Возвращаем форму на исходную позицию
        if (originalFormPosition.nextSibling) {
            originalFormPosition.parent.insertBefore(ui.form, originalFormPosition.nextSibling);
        } else {
            originalFormPosition.parent.appendChild(ui.form);
        }
    } else {
        document.getElementById('inpTicker').focus();
    }
}

document.getElementById('assetForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const newAsset = {
        ticker: document.getElementById('inpTicker').value.toUpperCase(),
        name: document.getElementById('inpName').value || document.getElementById('inpTicker').value,
        quantity: parseFloat(document.getElementById('inpQty').value),
        type: document.getElementById('inpType').value,
        currentPrice: (document.getElementById('inpType').value === 'cash') ? 1 : 0
    };

    if (editIndex >= 0) {
        newAsset.currentPrice = portfolio[editIndex].currentPrice || 0;
        portfolio[editIndex] = newAsset;
    } else {
        portfolio.push(newAsset);
    }

    toggleForm();
    render();

    if (newAsset.type !== 'cash') {
        setTimeout(updatePrices, 800);
    }
});

/* ================= МОEX API — УЛУЧШЕНИЯ ================= */

/**
 * Разбивает массив на чанки фиксированного размера
 */
function chunkArray(arr, size) {
    const res = [];
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
    }
    return res;
}

/**
 * Надёжно парсит PREVPRICE, используя список колонок
 */
function extractLastPriceFromMOEX(data) {
    try {
        const cols = data.marketdata.columns || [];
        const rows = data.marketdata.data || [];
        if (!rows.length) return null;
        const lastIdx = cols.indexOf('LAST');
        const changeIdx = cols.indexOf('CHANGE');
        const changePctIdx = cols.indexOf('LASTCHANGEPRCNT');
        if (lastIdx === -1) return null;
        const last = Number(rows[0][lastIdx]);
        const change = changeIdx !== -1 ? Number(rows[0][changeIdx]) : 0;
        const changePct = changePctIdx !== -1 ? Number(rows[0][changePctIdx]) : 0;
        return { last, change, changePct };
    } catch (err) {
        console.warn('Не смогли распарсить MOEX response', err);
        return null;
    }
}

/**
 * Загрузить цены батчами (чтобы не запускать 50 запросов одновременно).
 * Параметр concurrency контролирует размер чанка.
 */
window.updatePrices = async function(concurrency = 6) {
    // Показываем индикатор
    ui.loading.classList.add('active');
    ui.loading.setAttribute('aria-hidden', 'false');
    ui.refreshIcon.classList.add('spin');

    const moexBaseUrl = 'https://iss.moex.com/iss';

    // Фильтруем те активы, которые нужно получать
    const toFetch = portfolio.filter(a => a.type !== 'cash' && a.ticker);

    // Если нет запросов — просто рендерим
    if (!toFetch.length) {
        ui.loading.classList.remove('active');
        ui.loading.setAttribute('aria-hidden', 'true');
        ui.refreshIcon.classList.remove('spin');
        return;
    }

    // Разбиваем на чанки
    const chunks = chunkArray(toFetch, concurrency);

    for (const chunk of chunks) {
        // Для каждого чанка создаём массив промисов
        const promises = chunk.map(async (asset) => {
            try {
                let market = 'shares';
                let board = 'TQBR';
                if (asset.type === 'bond' || asset.ticker.startsWith('RU') || asset.ticker.startsWith('SU')) {
                    market = 'bonds';
                    board = 'TQOB';
                }
                const url = `${moexBaseUrl}/engines/stock/markets/${market}/boards/${board}/securities/${encodeURIComponent(asset.ticker)}.json?iss.meta=off&iss.only=marketdata&marketdata.columns=LAST,CHANGE,LASTCHANGEPRCNT`;
                const response = await fetch(url, { mode: 'cors', headers: { 'Accept': 'application/json' }});
                if (!response.ok) {
                    console.warn(`Ошибка ${response.status} для ${asset.ticker}`);
                    return;
                }
                const data = await response.json();
                const priceData = extractLastPriceFromMOEX(data);
                if (priceData && priceData.last > 0) {
                    let price = priceData.last;
                    if (asset.type === 'bond') {
                        if (price < 200) price = price * 10;
                    }
                    asset.change = priceData.change;
                    asset.changePercent = priceData.changePct.toFixed(2);
                    asset.currentPrice = price;
                }
            } catch (err) {
                console.error('Ошибка получения цены для', asset.ticker, err);
            }
        });

        // Ждём завершения чанка (все промисы)
        await Promise.all(promises);
        // Небольшая пауза между чанками (уменьшает нагрузку)
        await new Promise(r => setTimeout(r, 200));
    }

    render();

    ui.loading.classList.remove('active');
    ui.loading.setAttribute('aria-hidden', 'true');
    ui.refreshIcon.classList.remove('spin');
};

/* ================= ИНИЦИАЛИЗАЦИЯ ================= */
render();
// Первое обновление цен через пару секунд
setTimeout(() => updatePrices(6), 1500);
// Автообновление раз в 30 секунд (по желанию можно отключить)
setInterval(() => updatePrices(6), 30000);