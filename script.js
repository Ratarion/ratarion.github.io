/* ================= КОНФИГУРАЦИЯ И ДАННЫЕ ================= */
const fullPortfolioData = [
    { name: "ЛУКОЙЛ", ticker: "LKOH", quantity: 3, type: "share" },
    { name: "Татнефть", ticker: "TATN", quantity: 5, type: "share" },
    { name: "Хэдхантер МКПАО", ticker: "HEAD", quantity: 3, type: "share" },
    { name: "Самолёт ГК", ticker: "SMLT", quantity: 2, type: "share" },
    { name: "Сберегательный", ticker: "SBMM", quantity: 88, type: "fund" },
    { name: "Топ Российских акций", ticker: "SBMX", quantity: 1, type: "fund" },
    { name: "Ежемесячный доход", ticker: "FLOW", quantity: 1, type: "fund" },
    { name: "Доступное золото", ticker: "SBGD", quantity: 2, type: "fund" },
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
    loading: document.getElementById('loading'),
    groupBySelect: document.getElementById('groupBy')
};

const originalFormPosition = {
    parent: ui.form.parentNode,
    nextSibling: ui.form.nextSibling
};

let editIndex = -1;
let groupBy = localStorage.getItem('groupBy') || 'sector';
ui.groupBySelect.value = groupBy;
ui.groupBySelect.addEventListener('change', (e) => {
    groupBy = e.target.value;
    localStorage.setItem('groupBy', groupBy);
    render();
});

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

/* ================= СВОРАЧИВАНИЕ ================= */
function toggleGroup(header) {
    header.classList.toggle('collapsed');
    const content = header.nextElementSibling;
    content.style.display = header.classList.contains('collapsed') ? 'none' : 'block';
    const icon = header.querySelector('.toggle-icon');
    icon.textContent = header.classList.contains('collapsed') ? '▶' : '▼';
}

/* ================= СУММАРЫ ================= */
function updateSummaries(summaries, totalSum) {
    if (!totalSum || totalSum <= 0) {
        ui.sectorsContainer.innerHTML = '';
        return;
    }

    ui.sectorsContainer.innerHTML = '';
    ui.sectorsContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(150px, 1fr))`;

    Object.entries(summaries).forEach(([name, value]) => {
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
    const sectorMap = {
        "LKOH": "Нефть и газ",
        "TATN": "Нефть и газ",
        "HEAD": "IT и телеком",
        "SMLT": "Строительство",
        "ALRS": "Металлургия"
    };

    const typeNames = {
        share: "Акции",
        fund: "Фонды",
        bond: "Облигации",
        cash: "Наличные"
    };

    let getGroupKey;
    let getDisplayName = (key) => groupBy === 'type' ? typeNames[key] : key;
    let summaries = {};

    if (groupBy === 'sector' || groupBy === 'none') {
        getGroupKey = (asset) => {
            if (asset.type === "cash") return "Валюта";
            if (asset.type === "bond") return "Государство";
            if (asset.ticker && asset.ticker.startsWith('SB')) return "Финансы";
            return sectorMap[asset.ticker] || "Другие";
        };
        summaries = {
            "Нефть и газ": 0,
            "IT и телеком": 0,
            "Финансы": 0,
            "Строительство": 0,
            "Государство": 0,
            "Металлургия": 0,
            "Валюта": 0,
            "Другие": 0
        };
    } else if (groupBy === 'type') {
        getGroupKey = (asset) => asset.type;
        summaries = {
            "Акции": 0,
            "Фонды": 0,
            "Облигации": 0,
            "Наличные": 0
        };
    }

    ui.list.innerHTML = '';
    let totalSum = 0;
    let groupedAssets = {};

    portfolio.forEach((asset, index) => {
        const price = asset.currentPrice || 0;
        let val = price * asset.quantity;
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

        let key = getGroupKey(asset);
        let summaryKey = groupBy === 'type' ? getDisplayName(key) : key;
        summaries[summaryKey] = (summaries[summaryKey] || 0) + calculatedTotal;

        if (!groupedAssets[key]) groupedAssets[key] = [];
        groupedAssets[key].push({ ...asset, calculatedTotal, displayPrice, index });
    });

    if (groupBy === 'none') {
        // Flat list
        portfolio.forEach((asset, index) => {
            const { calculatedTotal, displayPrice } = groupedAssets[getGroupKey(asset)].find(a => a.index === index);
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
    } else {
        // Grouped list
        Object.entries(groupedAssets).forEach(([key, assets]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'asset-group';

            const header = document.createElement('h3');
            header.className = 'group-header';
            header.innerHTML = `${getDisplayName(key)} <span class="toggle-icon">▼</span>`;
            header.onclick = () => toggleGroup(header);
            groupDiv.appendChild(header);

            const content = document.createElement('div');
            content.className = 'group-content';

            assets.forEach((asset) => {
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
                            <div class="total-price">${formatMoney(asset.calculatedTotal)}</div>
                            <div class="unit-price">${formatMoney(asset.displayPrice)} / шт</div>
                        </div>
                        ${changeHTML}
                        <div class="row-actions">
                            <button class="btn-icon" onclick="editAsset(${asset.index})" aria-label="Редактировать ${asset.ticker}">✎</button>
                            <button class="btn-icon del" onclick="deleteAsset(${asset.index})" aria-label="Удалить ${asset.ticker}">✕</button>
                        </div>
                    </div>
                `;
                content.appendChild(el);
            });

            groupDiv.appendChild(content);
            ui.list.appendChild(groupDiv);
        });
    }

    updateSummaries(summaries, totalSum);

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
    const assetEl = ui.list.querySelectorAll('.asset-row')[index] || ui.list.children[0]; // fallback
    if (assetEl) assetEl.after(ui.form);

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

/* ================= MOEX API — УЛУЧШЕНИЯ ================= */

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