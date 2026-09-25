// общая разметка "пусто" для поиска - используется и на страницах каталога (getEmptyState
// внутри блока фильтрации ниже), и в живых результатах модалки поиска (renderLiveResults),
// чтобы не было двух независимых копий, которые надо редактировать по отдельности
function getSearchEmptyStateHTML() {
    return '<svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M136.001 136L105.334 105.333M118.667 72C118.667 97.7733 97.7732 118.667 71.9999 118.667C46.2267 118.667 25.3333 97.7733 25.3333 72C25.3333 46.2267 46.2267 25.3333 71.9999 25.3333C97.7732 25.3333 118.667 46.2267 118.667 72Z" stroke="#C4CAD7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<h2 class="title">По вашему запросу ничего не найдено</h2>';
}

// общий справочник по разделам поиска/фильтров (раньше везде было по два варианта -
// "companies" или "projects" через тернарник; теперь разделов 4 - projects/services/
// products/companies, - поэтому id панели фильтров и страница каталога для каждого
// раздела лежат в одном месте, а не размножены по всем местам, где раньше был тернарник
window.__filterKeyMeta = {
    projects: { panelId: 'filtersPanel', page: 'projects.html' },
    services: { panelId: 'filtersPanelServices', page: 'services.html' },
    products: { panelId: 'filtersPanelProducts', page: 'products.html' },
    companies: { panelId: 'filtersPanelCompanies', page: 'companies.html' }
};

// дропдаун "Проекты/Услуги/Товары" в шапке главной и в модалке поиска - общий механизм:
// клик по самому текущему значению (data-dropdown-trigger) открывает/закрывает список
// вариантов, клик по варианту (data-dropdown-option) переносит его подпись и data-tab-key
// на триггер и "нажимает" сам триггер повторно - это заново прогоняет уже существующие
// обработчики клика по табам (переключение активного таба, синхронизация и т.д.), которым
// достаточно посмотреть на актуальный dataset.tabKey триггера в момент клика
try {
    (function () {
        'use strict';

        // видимость самого списка вариантов (открыт/закрыт) держится на .active того же
        // элемента, что и у остальных всплывающих меню в проекте (.card_more__modal.active -
        // "..." у карточки, сортировка в поиске) - переиспользуем их же анимацию/тень/радиус,
        // а не заводим отдельную. .open на обёртке .tabs_dropdown - только для разворота
        // стрелочки-шеврона у самого переключателя
        function closeAllDropdowns(except) {
            document.querySelectorAll('[data-dropdown].open').forEach(function (dd) {
                if (dd === except) return;
                dd.classList.remove('open');
                var menu = dd.querySelector('[data-dropdown-menu]');
                if (menu) menu.classList.remove('active');
            });
        }

        function init(root) {
            (root || document).querySelectorAll('[data-dropdown]').forEach(function (dd) {
                if (dd.dataset.dropdownInited) return;
                dd.dataset.dropdownInited = '1';

                var trigger = dd.querySelector('[data-dropdown-trigger]');
                var menu = dd.querySelector('[data-dropdown-menu]');
                if (!trigger || !menu) return;
                var label = trigger.querySelector('[data-dropdown-label]');

                trigger.addEventListener('click', function (e) {
                    // именно здесь, а не в общем обработчике клика по табам, решаем -
                    // открыть/закрыть список вариантов; сам переключатель таба это не трогает
                    if (e.target.closest('[data-dropdown-option]')) return;
                    var isOpen = dd.classList.contains('open');
                    closeAllDropdowns(dd);
                    dd.classList.toggle('open', !isOpen);
                    menu.classList.toggle('active', !isOpen);
                });

                menu.querySelectorAll('[data-dropdown-option]').forEach(function (opt) {
                    opt.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (label) label.textContent = opt.textContent.trim();
                        trigger.dataset.tabKey = opt.dataset.tabKey;
                        menu.querySelectorAll('[data-dropdown-option]').forEach(function (o) {
                            o.classList.toggle('active', o === opt);
                        });
                        // .open намеренно не трогаем здесь - список сейчас открыт, и следующий
                        // trigger.click() ниже сам его закроет через обработчик триггера (тот
                        // читает текущее dd.classList.contains('open') и переключает на
                        // противоположное); если закрыть .open здесь заранее, тот же клик
                        // увидит список уже закрытым и снова его откроет
                        // тот же клик, что случился бы по обычному табу - переиспользует уже
                        // существующие обработчики (переключение active/чипы/live-поиск),
                        // которые к этому моменту уже видят обновлённый dataset.tabKey
                        trigger.click();
                    });
                });
            });
        }

        document.addEventListener('click', function (e) {
            if (e.target.closest('[data-dropdown]')) return;
            closeAllDropdowns(null);
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { init(document); });
        } else {
            init(document);
        }
        window.initTabDropdowns = init;

        // синхронизирует один "таб-переключатель" (шапка главной или модалка поиска - у обеих
        // одинаковая структура: .tabs_dropdown с триггером+списком вариантов плюс соседняя
        // ссылка "Компании") с нужным key - переносит подпись/data-tab-key на триггер и
        // выставляет .active там, где нужно. Используется, когда переключение происходит НЕ
        // через клик по самому этому переключателю, а приходит "снаружи" (например пользователь
        // выбрал "Услуги" в модалке поиска - шапку главной синхронизируем тем же key)
        window.__syncTabGroup = function (scopeEl, key) {
            if (!scopeEl) return;
            var dd = scopeEl.querySelector('[data-dropdown]');
            var trigger = dd ? dd.querySelector('[data-dropdown-trigger]') : null;
            var companiesLink = scopeEl.querySelector('a[data-tab-key="companies"]');
            if (!trigger) return;

            if (key === 'companies') {
                trigger.classList.remove('active');
                if (companiesLink) companiesLink.classList.add('active');
                return;
            }

            if (companiesLink) companiesLink.classList.remove('active');
            trigger.classList.add('active');
            trigger.dataset.tabKey = key;

            var label = trigger.querySelector('[data-dropdown-label]');
            var options = dd.querySelectorAll('[data-dropdown-option]');
            options.forEach(function (opt) {
                var matches = opt.dataset.tabKey === key;
                opt.classList.toggle('active', matches);
                if (matches && label) label.textContent = opt.textContent.trim();
            });
        };
    })();
} catch (err) {
    console.error('tab dropdown init:', err);
}

try {
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.popular_card__more');
        const openModal = document.querySelector('.card_more__modal.active');

        // дропдаун "Проекты/Услуги/Товары" переиспользует класс .card_more__modal для стилей,
        // но своим открытием/закрытием управляет отдельно (см. closeAllDropdowns выше) - этот
        // обработчик не должен его трогать, иначе тот же клик, что открывает дропдаун, тут же
        // закрывает его снова, когда всплывает до document
        if (openModal && openModal !== btn?.nextElementSibling && !openModal.closest('[data-dropdown]')) {
            openModal.classList.remove('active');
        }
        if (btn) {
            e.stopPropagation();
            btn.nextElementSibling.classList.toggle('active');
        }
    });
} catch (err) {
    console.error('popular_card__more handler:', err);
}

try {
    // пункты "Избранное" и "Сравнить" в выпадающем меню карточки (card_more__modal) - раньше
    // вообще никак не были подключены, поэтому клик по ним ничего не делал.
    // "Избранное" переиспользует уже готовую логику лайка/тоста (initFavoritesToast) - просто
    // "нажимаем" за пользователя на .popular_card__like этой же карточки.
    // "Сравнить" переключает добавление/удаление из сравнения (см. window.__toggleCompareItem
    // ниже по файлу, рядом с остальной логикой compare.html)
    document.addEventListener('click', function (e) {
        const item = e.target.closest('.more_modal__item');
        if (!item) return;

        const captionEl = item.querySelector('p');
        const label = captionEl ? captionEl.textContent.trim() : '';
        const card = item.closest('.popular_card');
        if (!card) return;

        if (label === 'Избранное') {
            const likeBtn = card.querySelector('.popular_card__like');
            if (likeBtn) likeBtn.click();
        } else if (label === 'Сравнить') {
            if (typeof window.__toggleCompareItem === 'function') window.__toggleCompareItem(card);
        } else {
            return;
        }

        const modal = item.closest('.card_more__modal');
        if (modal) modal.classList.remove('active');
    });
} catch (err) {
    console.error('card more menu handler:', err);
}

try {
    // фейды по краям чипов "Характеристики" (Основные/Конструктив/Помещения) - серое
    // размытие у края показывает, что список можно докрутить; когда докручен до конца -
    // соответствующий фейд прячется (см. .is-at-end/.is-scrolled в style.css)
    document.querySelectorAll('.about_card_tabs_wrap').forEach(function (wrap) {
        var scroller = wrap.querySelector('.about_card_tabs');
        if (!scroller) return;

        function updateEdgeFade() {
            var maxScroll = scroller.scrollWidth - scroller.clientWidth;
            wrap.classList.toggle('is-scrolled', scroller.scrollLeft > 2);
            wrap.classList.toggle('is-at-end', maxScroll <= 2 || scroller.scrollLeft >= maxScroll - 2);
        }

        scroller.addEventListener('scroll', updateEdgeFade, { passive: true });
        window.addEventListener('resize', updateEdgeFade);
        updateEdgeFade();
    });
} catch (err) {
    console.error('about card tabs edge fade:', err);
}

try {
    new Swiper('.swiper.text_block__v1_cards', {
        slidesPerView: 1.219,
        spaceBetween: 12,
        loop: true
    });
} catch (err) {
    console.error('Swiper .text_block__v1_cards:', err);
}

try {
    new Swiper('.swiper.text_block__v3_cards', {
        slidesPerView: 1.219,
        spaceBetween: 12,
        loop: true,
    });
} catch (err) {
    console.error('Swiper .text_block__v3_cards:', err);
}

try {
    new Swiper('.swiper.text_block__v4_cards', {
        slidesPerView: 1.219,
        spaceBetween: 12,
        loop: true,
    });
} catch (err) {
    console.error('Swiper .text_block__v4_cards:', err);
}

try {
    new Swiper('.swiper.text_block__v9_cards', {
        slidesPerView: 1.219,
        spaceBetween: 12,
        loop: true,
    });
} catch (err) {
    console.error('Swiper .text_block__v9_cards:', err);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        document.querySelectorAll('.about_card_tabs').forEach((tabsWrap) => {
            tabsWrap.addEventListener('click', (e) => {
                const btn = e.target.closest('.about_card_tabs__item');
                if (!btn || !tabsWrap.contains(btn)) return;
                if (btn.classList.contains('active')) return;

                tabsWrap.querySelectorAll('.about_card_tabs__item').forEach((b) => {
                    b.classList.remove('active', 'chip_active');
                    b.classList.add('chip_inactive');
                });
                btn.classList.remove('chip_inactive');
                btn.classList.add('active', 'chip_active');

                const target = btn.dataset.tab;
                const container = tabsWrap.closest('.about_card_info') || tabsWrap.parentElement;
                container.querySelectorAll('[data-tab-panel]').forEach((panel) => {
                    panel.classList.toggle('active', panel.dataset.tabPanel === target);
                });
            });
        });
    } catch (err) {
        console.error('about_card_tabs handler:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('filtersPanel');
    const backdrop = document.getElementById('filtersBackdrop');
    const openBtns = document.querySelectorAll('.filter__btn');
    if (!panel) return;

    function openPanel() {
        panel.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        document.body.classList.add('filters-open');
    }

    function closePanel() {
        panel.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('filters-open');
    }

    openBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openPanel();
        });
    });

    panel.addEventListener('filters:close', closePanel);

    if (backdrop) {
        backdrop.addEventListener('click', closePanel);
    }
});

try {
    (function () {
        'use strict';
        function decimalsFromStep(step) {
            var s = String(step);
            var i = s.indexOf('.');
            return i === -1 ? 0 : (s.length - i - 1);
        }

        function formatNumber(value, unit, decimals) {
            var fixed = Number(value.toFixed(decimals));
            var str = fixed.toLocaleString('ru-RU', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
            return str + ' ' + unit;
        }

        function parseNumber(str) {
            var cleaned = String(str).replace(/[^\d.,-]/g, '').replace(',', '.');
            var n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
        }

        function initRangeSlider(root) {
            var min = parseFloat(root.dataset.min);
            var max = parseFloat(root.dataset.max);
            var step = parseFloat(root.dataset.step) || 1;
            var decimals = decimalsFromStep(root.dataset.step || step);
            var unit = root.dataset.unit || '';
            var startMin = parseFloat(root.dataset.startMin);
            var startMax = parseFloat(root.dataset.startMax);

            var inputMin = root.querySelector('.range_slider__input--min');
            var inputMax = root.querySelector('.range_slider__input--max');
            var fill = root.querySelector('.range_slider__fill');

            var field = root.closest('.filter_field');
            var displayMin = field ? field.querySelector('[data-role="min-display"]') : null;
            var displayMax = field ? field.querySelector('[data-role="max-display"]') : null;

            [inputMin, inputMax].forEach(function (input) {
                input.min = min;
                input.max = max;
                input.step = step;
            });
            inputMin.value = startMin;
            inputMax.value = startMax;

            function percent(value) {
                return ((value - min) / (max - min)) * 100;
            }

            function updateFill() {
                var lo = Math.min(parseFloat(inputMin.value), parseFloat(inputMax.value));
                var hi = Math.max(parseFloat(inputMin.value), parseFloat(inputMax.value));
                var pLo = percent(lo);
                var pHi = percent(hi);
                fill.style.left = pLo + '%';
                fill.style.width = Math.max(pHi - pLo, 0) + '%';
            }

            function updateDisplays() {
                var lo = Math.min(parseFloat(inputMin.value), parseFloat(inputMax.value));
                var hi = Math.max(parseFloat(inputMin.value), parseFloat(inputMax.value));
                if (displayMin) displayMin.value = formatNumber(lo, unit, decimals);
                if (displayMax) displayMax.value = formatNumber(hi, unit, decimals);
            }

            function activate() {
                root.classList.add('range_slider--active');
            }

            function handleInput(e) {
                var lo = parseFloat(inputMin.value);
                var hi = parseFloat(inputMax.value);
                if (lo > hi) {
                    if (e.target === inputMin) inputMin.value = hi;
                    else inputMax.value = lo;
                }
                updateFill();
                updateDisplays();
                activate();
            }

            inputMin.addEventListener('pointerdown', activate);
            inputMax.addEventListener('pointerdown', activate);
            inputMin.addEventListener('input', handleInput);
            inputMax.addEventListener('input', handleInput);

            if (displayMin) {
                displayMin.addEventListener('change', function () {
                    var v = Math.min(Math.max(parseNumber(displayMin.value), min), parseFloat(inputMax.value));
                    inputMin.value = v;
                    updateFill();
                    updateDisplays();
                    activate();
                });
            }
            if (displayMax) {
                displayMax.addEventListener('change', function () {
                    var v = Math.max(Math.min(parseNumber(displayMax.value), max), parseFloat(inputMin.value));
                    inputMax.value = v;
                    updateFill();
                    updateDisplays();
                    activate();
                });
            }

            updateFill();
            updateDisplays();

            var api = {
                reset: function () {
                    inputMin.value = startMin;
                    inputMax.value = startMax;
                    root.classList.remove('range_slider--active');
                    updateFill();
                    updateDisplays();
                }
            };
            root._filterApi = api;
            return api;
        }

        function initToggleGroup(group) {
            var buttons = Array.prototype.slice.call(group.querySelectorAll('button:not([data-action])'));
            buttons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var isActive = btn.classList.toggle('chip_active');
                    btn.classList.toggle('chip_inactive__v2', !isActive);
                });
            });
            return {
                reset: function () {
                    buttons.forEach(function (btn) {
                        btn.classList.remove('chip_active');
                        btn.classList.add('chip_inactive__v2');
                    });
                }
            };
        }

        function initAccordion(section) {
            var top = section.querySelector('.filters_complete__top');
            if (!top) return;
            top.addEventListener('click', function () {
                section.classList.toggle('active');
            });
            return {
                reset: function () {
                    section.classList.remove('active');
                }
            };
        }

        var resetters = [];

        function markInited(el) {
            if (el.dataset.filterInited) return false;
            el.dataset.filterInited = '1';
            return true;
        }

        function init(root) {
            root = root || document;

            root.querySelectorAll('.range_slider').forEach(function (el) {
                if (markInited(el)) resetters.push(initRangeSlider(el));
            });
            root.querySelectorAll('.chip_group, .circle_group').forEach(function (el) {
                if (markInited(el)) resetters.push(initToggleGroup(el));
            });
            root.querySelectorAll('.filters_complete').forEach(function (el) {
                if (markInited(el)) resetters.push(initAccordion(el));
            });
            root.querySelectorAll('[data-action="reset"]').forEach(function (btn) {
                if (!markInited(btn)) return;
                btn.addEventListener('click', function () {
                    resetters.forEach(function (r) { r.reset(); });
                });
            });
            root.querySelectorAll('[data-action="close"], [data-action="back"]').forEach(function (btn) {
                if (!markInited(btn)) return;
                btn.addEventListener('click', function () {
                    var panel = btn.closest('.filters_panel') || root;
                    panel.dispatchEvent(new CustomEvent('filters:close', { bubbles: true }));
                });
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { init(document); });
        } else {
            init(document);
        }

        window.initFiltersPanel = init;
    })();
} catch (err) {
    console.error('filters panel init:', err);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        var GROUP_LABELS = {
            bedrooms: 'Спальни',
            bathrooms: 'Санузлы',
            'bathrooms-2': 'Санузлы',
            rating: 'Рейтинг',
            experience: 'Опыт'
        };

        function formatCompactRange(root) {
            var inputs = root.querySelectorAll('input[type="range"]');
            if (inputs.length < 2) return '';
            var unit = root.dataset.unit || '';
            var minVal = parseFloat(inputs[0].value);
            var maxVal = parseFloat(inputs[1].value);

            function formatValue(value) {
                if (unit === '₽' && value >= 1000000) {
                    var millions = value / 1000000;
                    var rounded = Math.round(millions * 10) / 10;
                    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + ' млн ₽';
                }
                return value.toLocaleString('ru-RU') + (unit ? ' ' + unit : '');
            }

            return formatValue(minVal) + ' – ' + formatValue(maxVal);
        }

        function chipLabel(btn) {
            var text = btn.textContent.trim();
            var isNumeric = /^\d+([.,]\d+)?\+?$/.test(text);
            if (isNumeric) {
                var group = btn.closest('[data-group]');
                var prefix = group ? GROUP_LABELS[group.dataset.group] : null;
                if (prefix) return prefix + ': ' + text;
            }
            return text;
        }

        function collectApplied(panel) {
            var items = [];

            panel.querySelectorAll('select[data-touched="1"]').forEach(function (select) {
                items.push({
                    label: select.selectedOptions[0] ? select.selectedOptions[0].text : select.value,
                    reset: function () {
                        select.selectedIndex = 0;
                        select.dataset.touched = '';
                    }
                });
            });

            panel.querySelectorAll('.chip_group button.chip_active, .circle_group button.chip_active').forEach(function (btn) {
                // "Категория" в фильтрах компаний работает как таб (всегда что-то выбрано,
                // переключает набор доп.полей) - это не отдельный применённый фильтр, который можно
                // снять, ЕСЛИ она стоит по умолчанию. Но если сюда пришли по карточке категории
                // с главной ("Строительство"/"Архитектура" и т.п. в блоке "Категории услуг и
                // компаний" - см. [data-goto-category] в script.js), категория была выбрана явно
                // пользователем, и её показываем как обычный применяемый/снимаемый фильтр -
                // отсюда panel.dataset.categoryExplicit (проставляется при restore ниже)
                var group = btn.closest('[data-group]');
                if (group && group.dataset.group === 'category') {
                    if (panel.dataset.categoryExplicit !== '1') return;
                    items.push({
                        label: chipLabel(btn),
                        reset: function () {
                            panel.dataset.categoryExplicit = '';
                            // настоящий клик по первому табу категории - его подхватят и общий
                            // переключатель .chip_group (активный/неактивный класс), и обработчик
                            // самих компаний (applyCompaniesCategory), как при обычном клике руками
                            var first = group.querySelector('button[data-category]');
                            if (first) first.click();
                        }
                    });
                    return;
                }

                items.push({
                    label: chipLabel(btn),
                    reset: function () {
                        btn.classList.remove('chip_active');
                        btn.classList.add('chip_inactive__v2');
                    }
                });
            });

            panel.querySelectorAll('.range_slider.range_slider--active').forEach(function (root) {
                items.push({
                    label: formatCompactRange(root),
                    reset: function () {
                        if (root._filterApi) root._filterApi.reset();
                    }
                });
            });

            // чекбоксы ("Профиль проверен", "Бесплатный выезд специалиста" и т.п.) раньше вообще
            // не попадали в применённые фильтры - отсюда "какие-то фильтры не добавляются"
            panel.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
                var label = cb.closest('label');
                var textEl = label ? label.querySelector('.form-checkbox__text, .form_checkbox__text') : null;
                items.push({
                    label: textEl ? textEl.textContent.trim() : 'Отмечено',
                    reset: function () {
                        cb.checked = false;
                    }
                });
            });

            return items;
        }

        // полный снимок реального состояния панели (не просто подписи) - нужен, чтобы после
        // перехода на новую страницу (сабмит/поиск) можно было по-настоящему восстановить те же
        // самые фильтры, а не просто нарисовать "мёртвые" подписи, которые потом стираются
        // при первом же реальном взаимодействии с панелью
        function serializePanelState(panel) {
            var state = { category: null, chips: [], selects: {}, ranges: [], checkboxes: [] };

            var categoryGroup = panel.querySelector('[data-group="category"]');
            if (categoryGroup) {
                var activeCategoryBtn = categoryGroup.querySelector('button.chip_active');
                if (activeCategoryBtn) state.category = activeCategoryBtn.textContent.trim();
            }

            panel.querySelectorAll('.chip_group button.chip_active, .circle_group button.chip_active').forEach(function (btn) {
                var group = btn.closest('[data-group]');
                if (!group || group.dataset.group === 'category') return;
                state.chips.push({ group: group.dataset.group, text: btn.textContent.trim() });
            });

            panel.querySelectorAll('select[data-touched="1"]').forEach(function (select) {
                if (select.id) state.selects[select.id] = select.value;
            });

            var rangeSliders = panel.querySelectorAll('.range_slider');
            rangeSliders.forEach(function (root, index) {
                if (!root.classList.contains('range_slider--active')) return;
                var inputs = root.querySelectorAll('input[type="range"]');
                if (inputs.length < 2) return;
                state.ranges.push({ index: index, min: inputs[0].value, max: inputs[1].value });
            });

            var checkboxes = panel.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(function (cb, index) {
                if (cb.checked) state.checkboxes.push(index);
            });

            return state;
        }
        window.__serializePanelState = serializePanelState;

        function applyPanelState(panel, state) {
            if (!state) return;

            if (state.category) {
                var categoryGroup = panel.querySelector('[data-group="category"]');
                if (categoryGroup) {
                    var btns = categoryGroup.querySelectorAll('button');
                    for (var i = 0; i < btns.length; i++) {
                        if (btns[i].textContent.trim() === state.category) {
                            categoryGroup.querySelectorAll('.chip_active').forEach(function (b) {
                                b.classList.remove('chip_active', 'active');
                                b.classList.add('chip_inactive__v2');
                            });
                            btns[i].classList.remove('chip_inactive__v2');
                            btns[i].classList.add('chip_active', 'active');
                            break;
                        }
                    }
                }
            }

            (state.chips || []).forEach(function (item) {
                var group = panel.querySelector('[data-group="' + item.group + '"]');
                if (!group) return;
                var btns = group.querySelectorAll('button');
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].textContent.trim() === item.text) {
                        if (group.classList.contains('chip_group')) {
                            group.querySelectorAll('.chip_active').forEach(function (b) {
                                b.classList.remove('chip_active', 'active');
                                b.classList.add('chip_inactive__v2');
                            });
                        }
                        btns[i].classList.remove('chip_inactive__v2');
                        btns[i].classList.add('chip_active', 'active');
                        break;
                    }
                }
            });

            Object.keys(state.selects || {}).forEach(function (id) {
                var select = document.getElementById(id);
                if (select) {
                    select.value = state.selects[id];
                    select.dataset.touched = '1';
                }
            });

            var rangeSliders = panel.querySelectorAll('.range_slider');
            (state.ranges || []).forEach(function (r) {
                var root = rangeSliders[r.index];
                if (!root) return;
                var inputs = root.querySelectorAll('input[type="range"]');
                if (inputs.length < 2) return;
                inputs[0].value = r.min;
                inputs[1].value = r.max;
                root.classList.add('range_slider--active');
                // пересчитывает заливку/подписи через уже навешанный в initRangeSlider обработчик 'input'
                inputs[0].dispatchEvent(new Event('input'));
                inputs[1].dispatchEvent(new Event('input'));
            });

            var checkboxes = panel.querySelectorAll('input[type="checkbox"]');
            (state.checkboxes || []).forEach(function (index) {
                if (checkboxes[index]) checkboxes[index].checked = true;
            });
        }

        function updateFilterBadges(count) {
            document.querySelectorAll('.filter_bage').forEach(function (badge) {
                badge.textContent = count;
                badge.hidden = count === 0;
            });
        }

        window.__filterPanels = window.__filterPanels || {};
        // сюда пишется текущий текст поиска по каждому разделу (companies/projects),
        // чтобы панель фильтров и чипы на странице могли показать его как обычный применённый фильтр
        window.__searchQuery = window.__searchQuery || { companies: '', projects: '', services: '', products: '' };
        // true, когда панель фильтров открыта из модалки поиска (по значку в #searchPanel) -
        // в этом случае "Применить" не должен сразу уводить на страницу каталога: фильтры
        // остаются применёнными прямо в поиске, а переход на каталог происходит только по
        // настоящей кнопке поиска (см. submitBtn/doSearch в блоке #searchPanel ниже)
        window.__filtersOpenedFromSearch = window.__filtersOpenedFromSearch || false;

        function getAppliedItems(panel, key) {
            var items = collectApplied(panel);
            var q = (window.__searchQuery && window.__searchQuery[key]) || '';
            if (q) {
                items = [{
                    label: '«' + q + '»',
                    reset: function () {
                        window.__searchQuery[key] = '';
                        var si = document.getElementById('searchPanelInput');
                        if (si) si.value = '';
                        // без перезагрузки страницы сразу возвращаем полный список карточек
                        if (typeof window.__applySearchFilter === 'function') window.__applySearchFilter();
                    }
                }].concat(items);
            }
            return items;
        }

        function initFiltersPanel(config) {
            var panel = config.panel;
            var appliedWrap = config.applied;
            var appliedList = config.appliedList;
            var submitBtn = config.submit;
            if (!panel || !appliedWrap || !appliedList) return;

            function renderApplied() {
                var items = getAppliedItems(panel, config.key);
                appliedList.innerHTML = '';
                items.forEach(function (item) {
                    var chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'filter_cheap caption_medium flex_row';
                    chip.innerHTML = item.label + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.08333 0.75L0.75 9.08333M0.75 0.75L9.08333 9.08333" stroke="#141416" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>';
                    chip.addEventListener('click', function () {
                        item.reset();
                        renderApplied();
                    });
                    appliedList.appendChild(chip);
                });
                appliedWrap.hidden = items.length === 0;
                updateFilterBadges(items.length);

                // та же самая "применённые фильтры", но прямо на странице над списком (.projects_filter)
                if (config.pageChipsWrap) {
                    config.pageChipsWrap.querySelectorAll('.filter_cheap').forEach(function (el) { el.remove(); });
                    items.forEach(function (item) {
                        var chip = document.createElement('button');
                        chip.type = 'button';
                        chip.className = 'filter_cheap caption_medium flex_row';
                        chip.innerHTML = item.label + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.08333 0.75L0.75 9.08333M0.75 0.75L9.08333 9.08333" stroke="#141416" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>';
                        chip.addEventListener('click', function () {
                            item.reset();
                            renderApplied();
                        });
                        if (config.pageChipsReset) config.pageChipsWrap.insertBefore(chip, config.pageChipsReset);
                        else config.pageChipsWrap.appendChild(chip);
                    });
                    config.pageChipsWrap.hidden = items.length === 0;
                }

                // те же самые применённые фильтры показываем и в модалке поиска (#searchPanel) -
                // так же, как они уже выводятся на странице проектов/компаний выше
                if (typeof window.__renderSearchAppliedChips === 'function') window.__renderSearchAppliedChips();
            }

            function resetAll() {
                panel.querySelectorAll('select[data-touched="1"]').forEach(function (select) {
                    select.selectedIndex = 0;
                    select.dataset.touched = '';
                });
                panel.querySelectorAll('.chip_group button.chip_active, .circle_group button.chip_active').forEach(function (btn) {
                    btn.classList.remove('chip_active');
                    btn.classList.add('chip_inactive__v2');
                });
                panel.querySelectorAll('.range_slider.range_slider--active').forEach(function (root) {
                    if (root._filterApi) root._filterApi.reset();
                });
                panel.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
                    cb.checked = false;
                });
                window.__searchQuery[config.key] = '';
                renderApplied();
                if (typeof window.__applySearchFilter === 'function') window.__applySearchFilter();
            }

            panel.addEventListener('change', function (e) {
                var select = e.target.closest('select');
                if (select) select.dataset.touched = '1';
                renderApplied();
            });

            panel.addEventListener('click', function (e) {
                if (e.target.closest('.chip_group, .circle_group')) renderApplied();
                if (e.target.closest('[data-action="reset"]')) resetAll();
            });

            panel.addEventListener('pointerdown', function (e) {
                if (e.target.closest('.range_slider')) renderApplied();
            });
            panel.addEventListener('input', function (e) {
                if (e.target.closest('.range_slider')) renderApplied();
            });

            if (submitBtn) {
                submitBtn.addEventListener('click', function () {
                    // если панель фильтров открыта из поиска - никуда не переходим: фильтры
                    // остаются применёнными (их состояние и так уже лежит в самой панели),
                    // просто возвращаемся в модалку поиска. На каталог со всеми этими фильтрами
                    // перейдём только когда пользователь реально нажмёт кнопку поиска - тогда
                    // doSearch() сам соберёт актуальное состояние этой же панели через
                    // window.__serializePanelState и положит его в sessionStorage
                    if (window.__filtersOpenedFromSearch) {
                        renderApplied();
                        panel.dispatchEvent(new CustomEvent('filters:close', { bubbles: true }));
                        return;
                    }

                    // сохраняем НАСТОЯЩЕЕ состояние фильтров (не просто подписи), плюс текущий поисковый
                    // запрос - на новой странице (это чаще всего перезагрузка той же companies.html/projects.html)
                    // это состояние применится к панели ДО первой отрисовки, и фильтры не "потеряются"
                    try {
                        var state = serializePanelState(panel);
                        state.searchQuery = window.__searchQuery ? (window.__searchQuery[config.key] || '') : '';
                        sessionStorage.setItem('filterState:' + config.key, JSON.stringify(state));
                    } catch (err) {
                        console.error('save filter state:', err);
                    }
                    window.location.href = config.submitHref;
                });
            }

            if (config.pageChipsReset) {
                config.pageChipsReset.addEventListener('click', resetAll);
            }

            window.__filterPanels[config.key] = {
                renderApplied: renderApplied,
                resetAll: resetAll,
                getLabels: function () {
                    return getAppliedItems(panel, config.key).map(function (item) { return item.label; });
                },
                // отдаём сами объекты (с рабочим reset()), а не только подписи - нужно, чтобы
                // такие же чипы можно было построить и в модалке поиска (см. #searchPanel)
                getAppliedItems: function () {
                    return getAppliedItems(panel, config.key);
                }
            };

            // если на эту страницу пришли после сабмита фильтров или поиска - восстанавливаем
            // реальное состояние (какие чипы были активны, что было в селектах и слайдерах) ДО
            // первой отрисовки, чтобы бейдж и список сразу были верными и ничего не "пропадало"
            // при следующем клике
            try {
                var savedRaw = sessionStorage.getItem('filterState:' + config.key);
                if (savedRaw) {
                    sessionStorage.removeItem('filterState:' + config.key);
                    var savedState = JSON.parse(savedRaw);
                    applyPanelState(panel, savedState);
                    // категория пришла явным выбором (карточка на главной, [data-goto-category]),
                    // а не осталась дефолтным табом - показываем её как обычный применённый фильтр
                    if (savedState.categoryExplicit) panel.dataset.categoryExplicit = '1';
                    if (savedState.searchQuery) {
                        window.__searchQuery[config.key] = savedState.searchQuery;
                    }
                }
            } catch (err) {
                console.error('restore filter state:', err);
            }

            renderApplied();
        }

        // на некоторых страницах (например companies.html) в разметке по ошибке/по шаблону
        // присутствуют СРАЗУ ОБЕ модалки - и #filtersPanel, и #filtersPanelCompanies, - поэтому
        // проверка "какая панель есть на странице" ненадёжна. Определяем страницу по URL,
        // с запасными вариантами на случай нестандартного имени файла
        function detectPageKey() {
            var path = (window.location.pathname || '').toLowerCase();
            if (path.indexOf('companies') !== -1) return 'companies';
            if (path.indexOf('services') !== -1) return 'services';
            if (path.indexOf('products') !== -1) return 'products';
            if (path.indexOf('projects') !== -1) return 'projects';

            var section = document.querySelector('.companies, .projects');
            if (section) return section.classList.contains('companies') ? 'companies' : 'projects';

            if (document.getElementById('filtersPanelCompanies') && !document.getElementById('filtersPanel')) {
                return 'companies';
            }
            return 'projects';
        }
        window.__pageFilterKey = detectPageKey();

        // обёртка чипов ".projects_filter" на странице проектов имеет реальные id
        // (projectsFilterList/projectsFilterReset), а на странице компаний - те же классы, но без id.
        // ищем по id, если он есть, иначе - по структуре: сама обёртка ".projects_filter",
        // а кнопка сброса - первая кнопка внутри неё, у которой ещё нет класса .filter_cheap
        // (чипы всегда добавляются с этим классом и всегда перед кнопкой сброса).
        // Отдаём эту обёртку только конфигу, который соответствует текущей странице, - иначе,
        // если на странице по ошибке лежат обе модалки, они обе полезут писать в один и тот же блок
        function resolvePageChips(key, idCandidates) {
            if (window.__pageFilterKey !== key) return { wrap: null, reset: null };
            var wrap = null;
            idCandidates.forEach(function (id) {
                if (!wrap) wrap = document.getElementById(id);
            });
            if (!wrap) wrap = document.querySelector('.projects_filter__group .projects_filter, .projects_filter__group_top .projects_filter');
            if (!wrap) return { wrap: null, reset: null };
            var reset = wrap.querySelector('button:not(.filter_cheap)');
            return { wrap: wrap, reset: reset };
        }

        var projectsChips = resolvePageChips('projects', ['projectsFilterList', 'projectsFilterChips']);
        var companiesChips = resolvePageChips('companies', ['companiesFilterList', 'companiesFilterChips']);
        var servicesChips = resolvePageChips('services', ['servicesFilterList', 'servicesFilterChips']);
        var productsChips = resolvePageChips('products', ['productsFilterList', 'productsFilterChips']);

        var panelConfigs = [
            {
                key: 'projects',
                panel: document.getElementById('filtersPanel'),
                applied: document.getElementById('filtersApplied'),
                appliedList: document.getElementById('filtersAppliedList'),
                submit: document.getElementById('filtersSubmit'),
                submitHref: 'projects.html',
                pageChipsWrap: projectsChips.wrap,
                pageChipsReset: projectsChips.reset
            },
            {
                key: 'companies',
                panel: document.getElementById('filtersPanelCompanies'),
                applied: document.getElementById('filtersAppliedCompanies'),
                appliedList: document.getElementById('filtersAppliedListCompanies'),
                submit: document.getElementById('filtersSubmitCompanies'),
                submitHref: 'companies.html',
                pageChipsWrap: companiesChips.wrap,
                pageChipsReset: companiesChips.reset
            },
            {
                // "Услуги" - своей страницы каталога с реальной сеткой фильтров пока нет
                // (services.html без .projects_filter__group-фильтров), модалка "Фильтры"
                // сейчас есть только в шапке главной (filtersPanelServices) - см.
                // window.__filterKeyMeta и restoreSearchQueryWithoutPanel ниже
                key: 'services',
                panel: document.getElementById('filtersPanelServices'),
                applied: document.getElementById('filtersAppliedServices'),
                appliedList: document.getElementById('filtersAppliedListServices'),
                submit: document.getElementById('filtersSubmitServices'),
                submitHref: 'services.html',
                pageChipsWrap: servicesChips.wrap,
                pageChipsReset: servicesChips.reset
            },
            {
                key: 'products',
                panel: document.getElementById('filtersPanelProducts'),
                applied: document.getElementById('filtersAppliedProducts'),
                appliedList: document.getElementById('filtersAppliedListProducts'),
                submit: document.getElementById('filtersSubmitProducts'),
                submitHref: 'products.html',
                pageChipsWrap: productsChips.wrap,
                pageChipsReset: productsChips.reset
            }
        ];

        panelConfigs.forEach(initFiltersPanel);

        // на services.html/products.html модалки "Фильтры" пока нет (см. комментарий у
        // panelConfigs выше) - initFiltersPanel для них не находит panel и не восстанавливает
        // сохранённый поисковый запрос из sessionStorage (это делает он сам, внутри своего
        // savedRaw). Восстанавливаем хотя бы сам текст запроса отдельно - иначе он не
        // переживёт переход туда с главной. На страницах, где panel реально есть, ничего
        // не делаем - там об этом уже позаботился initFiltersPanel выше
        (function restoreSearchQueryWithoutPanel() {
            var key = window.__pageFilterKey;
            var hasResolvedPanel = panelConfigs.some(function (c) { return c.key === key && c.panel; });
            if (hasResolvedPanel) return;
            try {
                var raw = sessionStorage.getItem('filterState:' + key);
                if (!raw) return;
                sessionStorage.removeItem('filterState:' + key);
                var saved = JSON.parse(raw);
                if (saved && saved.searchQuery) {
                    window.__searchQuery[key] = saved.searchQuery;
                }
            } catch (err) {
                console.error('restore search query (no panel):', err);
            }
        })();

        var backdrop = document.getElementById('filtersBackdrop');
        var tabs = document.querySelectorAll('.banner_filter__tabs a[data-tab-key]');
        var openBtns = document.querySelectorAll('.filter__btn');

        function closeAllPanels() {
            panelConfigs.forEach(function (c) {
                if (c.panel) c.panel.classList.remove('active');
            });
            if (backdrop) backdrop.classList.remove('active');
            document.body.classList.remove('filters-open');
        }

        function openPanelByKey(key) {
            var target = null;
            panelConfigs.forEach(function (c) {
                if (c.key === key) target = c;
            });
            if (!target || !target.panel) {
                // на этой странице нет панели с таким key - открываем ту, что реально есть,
                // лишь бы не "проваливаться" в пустоту молча
                panelConfigs.forEach(function (c) {
                    if (!target && c.panel) target = c;
                });
            }
            if (!target || !target.panel) return;
            closeAllPanels();
            target.panel.classList.add('active');
            if (backdrop) backdrop.classList.add('active');
            document.body.classList.add('filters-open');
        }
        window.openPanelByKey = openPanelByKey;
        window.closeAllPanels = closeAllPanels;

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function (e) {
                e.preventDefault();
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
            });
        });

        openBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var activeTab = document.querySelector('.banner_filter__tabs a[data-tab-key].active');
                var key = (activeTab && activeTab.dataset.tabKey) || 'projects';
                // этот значок открывает фильтры в обход поиска - "Применить" здесь должен
                // вести себя как обычно, сразу переходя на страницу каталога, но "Назад"/
                // "Закрыть"/клик по фону всё равно должны возвращать в модалку поиска (а не
                // на хиро-экран), чтобы применённые фильтры сразу были видны там - см.
                // window.__filtersBackToSearch и closeAllPanelsMaybeReturnToSearch
                window.__filtersOpenedFromSearch = false;
                window.__filtersBackToSearch = true;
                // сначала (без анимации показа - открытие/закрытие фильтров всё равно
                // перекрывает его сверху) подкладываем под фильтры уже готовый экран поиска
                // с тем же разделом, что выбран в дропдауне - тогда когда фильтры закроются
                // назад в поиск, под ними уже не хиро-баннер, а сразу нужный экран поиска,
                // без промежуточного "мигания" главной
                if (typeof window.__syncTabGroup === 'function') {
                    window.__syncTabGroup(document.querySelector('.search_panel__tabs'), key);
                }
                if (typeof window.__openSearchPanel === 'function') window.__openSearchPanel();
                openPanelByKey(key);
            });
        });

        // если панель фильтров была открыта из поиска - любое её закрытие (сабмит, "Назад",
        // крестик, клик по фону) должно возвращать обратно в модалку поиска, а не просто
        // захлопывать всё - см. window.__filtersOpenedFromSearch. Значок фильтра в баннере на
        // главной открывает фильтры в обход поиска (см. openBtns выше) - там "Применить"
        // по-прежнему сразу ведёт на страницу каталога, но "Назад"/"Закрыть"/фон должны вести
        // в модалку поиска - для этого отдельный флаг window.__filtersBackToSearch
        function closeAllPanelsMaybeReturnToSearch() {
            var returnToSearch = window.__filtersOpenedFromSearch || window.__filtersBackToSearch;
            window.__filtersOpenedFromSearch = false;
            window.__filtersBackToSearch = false;
            closeAllPanels();
            if (returnToSearch && typeof window.__openSearchPanel === 'function') {
                window.__openSearchPanel();
            }
        }

        panelConfigs.forEach(function (c) {
            if (c.panel) c.panel.addEventListener('filters:close', closeAllPanelsMaybeReturnToSearch);
        });
        if (backdrop) backdrop.addEventListener('click', closeAllPanelsMaybeReturnToSearch);
    } catch (err) {
        console.error('filters panel init:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        // реальная фильтрация карточек на страницах списка (projects.html/companies.html) по
        // тексту, введённому в поиск. window.__searchQuery[key] и window.__pageFilterKey к этому
        // моменту уже восстановлены блоком выше (из sessionStorage при переходе с поиска/сабмита
        // фильтров, либо остаются пустыми, если поиска не было)

        // сетку карточек ищем не по конкретному классу (на projects.html и companies.html он
        // разный - text_block__v1_cards / text_block__v3_cards), а структурно: первый следующий
        // за .projects_filter__group элемент, в котором вообще есть .popular_card
        function getResultsGrid() {
            var filterGroup = document.querySelector('.projects_filter__group');
            if (!filterGroup) return null;
            var sib = filterGroup.nextElementSibling;
            while (sib && !sib.querySelector('.popular_card')) {
                sib = sib.nextElementSibling;
            }
            return sib;
        }

        var grid = getResultsGrid();
        if (!grid) return; // не страница списка - фильтровать нечего

        var emptyState = null;
        function getEmptyState() {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'search_empty flex_column';
                emptyState.style.display = 'none';
                emptyState.innerHTML = getSearchEmptyStateHTML();
                grid.insertAdjacentElement('afterend', emptyState);
            }
            return emptyState;
        }

        function applySearchFilter() {
            var key = window.__pageFilterKey;
            var query = ((window.__searchQuery && key && window.__searchQuery[key]) || '').trim().toLowerCase();
            var cards = grid.querySelectorAll('.popular_card');
            var visibleCount = 0;

            cards.forEach(function (card) {
                var matches = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
                // используем inline-style, а не атрибут hidden - у карточек, скорее всего,
                // уже есть класс flex_column (display:flex) той же специфичности, что и [hidden]
                // в браузерном стиле, и он может его перебить (та же история, что была с
                // .text_block__v1_cards[data-tab-panel] в избранном)
                card.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });

            var nothingFound = !!query && visibleCount === 0;
            grid.style.display = nothingFound ? 'none' : '';
            getEmptyState().style.display = nothingFound ? 'flex' : 'none';
        }

        window.__applySearchFilter = applySearchFilter;
        applySearchFilter();
    } catch (err) {
        console.error('search filter init:', err);
    }
});

try {
    (function () {
        'use strict';

        var HIDE_DELAY = 3500;

        var LEFT_ADDED =
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path fill-rule="evenodd" clip-rule="evenodd" d="M8.9949 3.85186C7.49535 2.0988 4.99481 1.62723 3.11602 3.23251C1.23723 4.83779 0.972728 7.52175 2.44815 9.4203C3.67487 10.9988 7.38733 14.3281 8.60408 15.4056C8.7402 15.5262 8.8083 15.5864 8.88765 15.6101C8.95695 15.6308 9.03277 15.6308 9.10207 15.6101C9.18143 15.5864 9.24953 15.5262 9.38565 15.4056C10.6024 14.3281 14.3149 10.9988 15.5416 9.4203C17.017 7.52175 16.7848 4.8209 14.8737 3.23251C12.9626 1.64412 10.4944 2.0988 8.9949 3.85186Z" fill="#C4CAD7" stroke="#C4CAD7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>' +
            '<p class="caption">Добавлено в избранное</p>';

        var LEFT_REMOVED =
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path fill-rule="evenodd" clip-rule="evenodd" d="M8.9949 3.85186C7.49535 2.0988 4.99481 1.62723 3.11602 3.23251C1.23723 4.83779 0.972728 7.52175 2.44815 9.4203C3.67487 10.9988 7.38733 14.3281 8.60408 15.4056C8.7402 15.5262 8.8083 15.5864 8.88765 15.6101C8.95695 15.6308 9.03277 15.6308 9.10207 15.6101C9.18142 15.5864 9.24953 15.5262 9.38565 15.4056C10.6024 14.3281 14.3149 10.9988 15.5416 9.4203C17.017 7.52175 16.7848 4.8209 14.8737 3.23251C12.9626 1.64412 10.4944 2.0988 8.9949 3.85186Z" stroke="#C4CAD7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>' +
            '<p class="caption">Удалено из избранного</p>';

        var RIGHT_ADDED =
            '<a href="#" class="caption_medium">Смотреть</a>' +
            '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M2.83301 8.5H14.1663M9.91634 12.75L14.1663 8.5L9.91634 4.25" stroke="white" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>';

        var RIGHT_REMOVED = '<a href="#" class="caption_medium">Отменить</a>';

        // тот же тост переиспользуется для пункта "Сравнить" в card_more__modal (см.
        // window.__toggleCompareItem) - настоящих характеристик для сравнения у нас нет,
        // поэтому просто те же лево/право блоки, что и у избранного, с другим текстом/иконкой
        var LEFT_COMPARE_ADDED =
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M3 3.75H15M3 12.75H6M3 8.25H10.5M10.5 12.75H12.75M12.75 12.75H15M12.75 12.75V15M12.75 12.75V10.5" stroke="#C4CAD7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>' +
            '<p class="caption">Добавлено к сравнению</p>';

        var LEFT_COMPARE_REMOVED =
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M3 3.75H15M3 12.75H6M3 8.25H10.5M10.5 12.75H12.75M12.75 12.75H15M12.75 12.75V15M12.75 12.75V10.5" stroke="#C4CAD7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>' +
            '<p class="caption">Убрано из сравнения</p>';

        var RIGHT_COMPARE_ADDED =
            '<a href="compare.html" class="caption_medium">Сравнить</a>' +
            '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M2.83301 8.5H14.1663M9.91634 12.75L14.1663 8.5L9.91634 4.25" stroke="white" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>';

        var RIGHT_COMPARE_REMOVED = '<a href="#" class="caption_medium">Отменить</a>';

        var TOAST_CONTENT = {
            added: { left: LEFT_ADDED, right: RIGHT_ADDED },
            removed: { left: LEFT_REMOVED, right: RIGHT_REMOVED },
            'compare-added': { left: LEFT_COMPARE_ADDED, right: RIGHT_COMPARE_ADDED },
            'compare-removed': { left: LEFT_COMPARE_REMOVED, right: RIGHT_COMPARE_REMOVED }
        };

        // единый тост на весь экран (а не по одному внутри каждой карточки) - висит над
        // таб-баром снизу, независимо от того, у какой карточки нажали "сердце"/"сравнить"
        var hideTimer = null;
        var currentKind = null;
        var currentCard = null;
        var toastEl = null;
        var leftEl = null;
        var rightEl = null;

        function positionToast() {
            if (!toastEl) return;
            var navBar = document.querySelector('.banner_mobile_nav');
            var bottomOffset = 24;
            if (navBar) {
                var navBottomVar = parseFloat(getComputedStyle(navBar).bottom);
                if (isNaN(navBottomVar)) navBottomVar = 16;
                bottomOffset = navBottomVar + navBar.offsetHeight + 12;
            }
            toastEl.style.bottom = bottomOffset + 'px';
        }

        function ensureToast() {
            if (toastEl) return toastEl;

            toastEl = document.createElement('div');
            toastEl.className = 'favorites_toast container';
            toastEl.innerHTML =
                '<div class="favorites_modal_wrapper flex_row">' +
                '<div class="favorites_modal__left flex_row"></div>' +
                '<div class="favorites_modal__right flex_row"></div>' +
                '</div>';
            document.body.appendChild(toastEl);

            leftEl = toastEl.querySelector('.favorites_modal__left');
            rightEl = toastEl.querySelector('.favorites_modal__right');

            rightEl.addEventListener('click', function (e) {
                var link = e.target.closest('a');
                if (!link || !currentCard) return;
                if (currentKind === 'removed') {
                    e.preventDefault();
                    var likeBtn = currentCard.querySelector('.popular_card__like');
                    if (likeBtn) likeBtn.classList.add('active');
                    showToast('added', currentCard);
                    if (typeof window.__toggleFavoriteItem === 'function') window.__toggleFavoriteItem(currentCard, true);
                } else if (currentKind === 'compare-removed') {
                    // "Отменить" для сравнения - снова добавляем через тот же переключатель,
                    // что и сам пункт "Сравнить" в меню карточки
                    e.preventDefault();
                    if (typeof window.__toggleCompareItem === 'function') window.__toggleCompareItem(currentCard);
                } else {
                    clearTimeout(hideTimer);
                    toastEl.classList.remove('active');
                }
            });

            positionToast();
            window.addEventListener('resize', positionToast);

            return toastEl;
        }

        function showToast(kind, card) {
            ensureToast();
            currentKind = kind;
            currentCard = card;
            var content = TOAST_CONTENT[kind] || TOAST_CONTENT.added;
            toastEl.className = 'favorites_toast favorites_modal--' + kind + ' container active';
            leftEl.innerHTML = content.left;
            rightEl.innerHTML = content.right;
            positionToast();

            clearTimeout(hideTimer);
            hideTimer = setTimeout(function () {
                toastEl.classList.remove('active');
            }, HIDE_DELAY);
        }
        // тот же единый тост показывается и для пункта "Сравнить" в card_more__modal (см.
        // window.__toggleCompareItem) - раньше у каждой карточки был свой собственный
        // модальный блок (card._toastApi), теперь один общий тост на всё приложение
        window.__showFavoritesToast = showToast;

        function initCard(card) {
            var likeBtn = card.querySelector('.popular_card__like');
            if (!likeBtn) return;

            likeBtn.addEventListener('click', function () {
                var isLiked = likeBtn.classList.toggle('active');
                showToast(isLiked ? 'added' : 'removed', card);
                if (typeof window.__toggleFavoriteItem === 'function') window.__toggleFavoriteItem(card, isLiked);
            });
        }

        function init(root) {
            (root || document).querySelectorAll('.popular_card').forEach(initCard);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { init(document); });
        } else {
            init(document);
        }

        window.initFavoritesToast = init;
    })();
} catch (err) {
    console.error('favorites toast init:', err);
}

// карточки категорий на главной ("Строительство"/"Архитектура" и т.д. в блоке "Категории
// услуг и компаний") ведут в каталог компаний с уже выбранным фильтром по категории -
// переиспользуем тот же механизм, которым companies.html восстанавливает фильтры после
// сабмита самой панели (см. sessionStorage 'filterState:companies' + applyPanelState выше)
document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-goto-category]');
    if (!el) return;
    try {
        sessionStorage.setItem('filterState:companies', JSON.stringify({
            category: el.dataset.gotoCategory,
            categoryExplicit: true,
            chips: [],
            selects: {},
            ranges: [],
            checkboxes: []
        }));
    } catch (err) {
        console.error('goto category filter:', err);
    }
});

// кнопки "Оставить заявку" в хедере и CTA-кнопки на странице ("Получить расчет",
// "Уточнить стоимость", "Обсудить проект/задачу" и т.п.) раньше были пустыми ссылками
// (href="") и просто перезагружали страницу - вместо этого скроллим к форме заявки
// внизу страницы (.form_section), плавно
document.addEventListener('click', function (e) {
    var el = e.target.closest('.js-open-modal, [data-scroll-to-form]');
    if (!el) return;
    var form = document.querySelector('.form_section');
    if (!form) return;
    e.preventDefault();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.addEventListener('DOMContentLoaded', () => {
    function initReadMore(cardSelector, textSelector, btnSelector) {
        document.querySelectorAll(cardSelector).forEach((card) => {
            const text = card.querySelector(textSelector);
            const btn = card.querySelector(btnSelector);
            if (!text || !btn) return;

            requestAnimationFrame(() => {
                const collapsedHeight = text.clientHeight;

                text.classList.add('is-expanded');
                const fullHeight = text.scrollHeight;
                text.classList.remove('is-expanded');

                const isClamped = fullHeight > collapsedHeight + 1;
                if (!isClamped) {
                    btn.remove();
                    return;
                }

                text.style.maxHeight = collapsedHeight + 'px';
                btn.style.display = 'inline-block';

                let expanded = false;

                btn.addEventListener('click', () => {
                    expanded = !expanded;

                    if (expanded) {
                        text.classList.add('is-expanded');
                        text.style.maxHeight = fullHeight + 'px';
                        btn.textContent = 'Свернуть';
                    } else {
                        text.style.maxHeight = collapsedHeight + 'px';
                        btn.textContent = 'Читать далее';

                        text.addEventListener('transitionend', function onEnd(e) {
                            if (e.propertyName !== 'max-height') return;
                            text.classList.remove('is-expanded');
                            text.removeEventListener('transitionend', onEnd);
                        });
                    }
                });
            });
        });
    }

    initReadMore('.text_block__v5_card_top', '.about_text', '.about_toggle_btn');
    initReadMore('.comment_text_card', '.comment_text', '.read_more_btn');
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.floor_card').forEach((card) => {
        const tabs = card.querySelectorAll('.floor_card_tab');
        const images = card.querySelectorAll('.floor_card__img');

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                if (tab.classList.contains('active')) return;

                tabs.forEach((t) => {
                    t.classList.remove('active', 'chip_active');
                    t.classList.add('chip_inactive');
                });
                tab.classList.remove('chip_inactive');
                tab.classList.add('active', 'chip_active');

                const target = tab.dataset.tab;
                images.forEach((img) => {
                    img.classList.toggle('active', img.dataset.floor === target);
                });
            });
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-accordion]').forEach((accordion) => {
        const trigger = accordion.querySelector('[data-accordion-trigger]');
        const content = accordion.querySelector('[data-accordion-content]');
        if (!trigger || !content) return;

        content.style.maxHeight = '0px';

        trigger.addEventListener('click', () => {
            const isOpen = accordion.classList.contains('active');

            if (isOpen) {
                content.style.maxHeight = '0px';
                accordion.classList.remove('active');
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                accordion.classList.add('active');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        var HISTORY_KEY = 'searchHistory';
        var HISTORY_LIMIT = 8;

        function getHistory() {
            try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
        }
        function saveHistory(list) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
        }
        function addToHistory(term) {
            term = term.trim();
            if (!term) return;
            var list = getHistory().filter(function (t) { return t.toLowerCase() !== term.toLowerCase(); });
            list.unshift(term);
            if (list.length > HISTORY_LIMIT) list = list.slice(0, HISTORY_LIMIT);
            saveHistory(list);
            renderHistory();
        }

        var searchPanel = document.getElementById('searchPanel');
        if (!searchPanel) return;

        var historyWrap = document.getElementById('searchPanelHistory');
        var historyList = document.getElementById('searchPanelHistoryList');

        // в реальной верстке у инпута/иконок внутри поиска нет id - берём их по структуре/классам
        var searchInputRow = searchPanel.querySelector('.search_panel__input-row');
        var searchInput = searchInputRow ? searchInputRow.querySelector('input.filter_input__button') : null;
        var submitBtn = searchInputRow ? searchInputRow.querySelector('a.search_btn') : null;
        var searchPanelFilterBtn = searchInputRow ? searchInputRow.querySelector('a.icon_btn') : null;
        // кнопка поиска не должна выглядеть отключённой ни при пустом, ни при заполненном
        // инпуте - раньше .search_btn_disabled навешивался/снимался в setSubmitState()
        if (submitBtn) submitBtn.classList.remove('search_btn_disabled');

        function renderHistory() {
            if (!historyWrap || !historyList) return;
            var list = getHistory();
            historyList.querySelectorAll('.chip_query').forEach(function (chip) { chip.remove(); });
            var clearBtn = historyList.querySelector('[data-action="clear-history"]');
            list.forEach(function (term) {
                var chip = document.createElement('button');
                chip.type = 'button';
                // chip_query нужен только как маркер для поиска/удаления (querySelectorAll('.chip_query')) -
                // саму пилюлю рисует filter_cheap, тот же класс, что и у всех остальных чипов фильтров
                // в проекте (в CSS у одного chip_query своих стилей нет вообще)
                chip.className = 'chip_query filter_cheap caption_medium flex_row';
                chip.textContent = term;
                chip.addEventListener('click', function () {
                    if (searchInput) {
                        searchInput.value = term;
                        searchInput.dispatchEvent(new Event('input'));
                        searchInput.focus();
                    }
                });
                historyList.insertBefore(chip, clearBtn);
            });
            historyWrap.hidden = list.length === 0;
        }

        if (historyList) {
            historyList.addEventListener('click', function (e) {
                if (e.target.closest('[data-action="clear-history"]')) {
                    saveHistory([]);
                    renderHistory();
                }
            });
        }

        function currentSearchTab() {
            var activeTab = searchPanel.querySelector('.search_panel__tabs a[data-tab-key].active');
            if (activeTab) return activeTab.dataset.tabKey;
            // если таб внутри поиска почему-то не выставлен - определяем раздел по самой странице
            // (по URL/классу секции - см. window.__pageFilterKey), а не молча уходим в 'projects'
            return window.__pageFilterKey || 'projects';
        }

        if (searchInput) {
            searchInput.addEventListener('input', function () {
                // window.__searchQuery (и, соответственно, чип "применённого" запроса) сюда
                // больше не пишем во время самого набора текста - иначе чип с ещё не
                // подтверждённым текстом появляется в списке применённых фильтров при каждой
                // напечатанной букве. Живой поиск по карточкам работает от searchInput.value
                // напрямую (см. renderLiveResults), а в __searchQuery запрос попадает только
                // после настоящего поиска (doSearch) или при открытии фильтров из поиска
                // (searchPanelFilterBtn) - там он и должен появляться как применённый.
                renderLiveResults();
            });
        }

        function doSearch() {
            if (!searchInput) return;
            var term = searchInput.value.trim();
            if (!term) return;
            addToHistory(term);
            var tab = currentSearchTab();

            window.__searchQuery = window.__searchQuery || { companies: '', projects: '', services: '', products: '' };
            window.__searchQuery[tab] = term;

            // сохраняем настоящее состояние фильтров той панели (не просто подписи) плюс сам запрос -
            // тогда на странице результатов и фильтры, и запрос по-настоящему восстановятся,
            // а не просто нарисуются "мёртвыми" подписями. У Услуг/Товаров панели фильтров
            // может не быть вообще (см. window.__filterKeyMeta) - тогда сохраняем хотя бы сам
            // запрос без состояния полей
            var meta = (window.__filterKeyMeta && window.__filterKeyMeta[tab]) || { panelId: 'filtersPanel', page: 'projects.html' };
            try {
                var srcPanel = document.getElementById(meta.panelId);
                var state = (srcPanel && typeof window.__serializePanelState === 'function')
                    ? window.__serializePanelState(srcPanel)
                    : { category: null, chips: [], selects: {}, ranges: [], checkboxes: [] };
                state.searchQuery = term;
                sessionStorage.setItem('filterState:' + tab, JSON.stringify(state));
            } catch (err) {
                console.error('save filter state (search):', err);
            }

            window.location.href = meta.page + '?q=' + encodeURIComponent(term);
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', function (e) {
                e.preventDefault();
                doSearch();
            });
        }
        if (searchInput) {
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    doSearch();
                }
            });
        }

        // подписи "Подборки ..." над подборками в поиске - по одной на каждый из 4 разделов
        var COLLECTIONS_TITLE_BY_KEY = {
            projects: 'Подборки проектов',
            services: 'Подборки услуг',
            products: 'Подборки товаров',
            companies: 'Подборки компаний'
        };

        var searchTabsWrap = searchPanel.querySelector('.search_panel__tabs');
        var searchTabs = searchPanel.querySelectorAll('.search_panel__tabs a[data-tab-key]');
        var collectionsTitle = document.getElementById('searchPanelCollectionsTitle');
        var collectionsListProjects = document.getElementById('searchPanelCollectionsListProjects');
        var collectionsListCompanies = document.getElementById('searchPanelCollectionsListCompanies');

        // подборки в поиске - карточки как на главной: для "Компании" показываем карточки
        // компаний, для остальных разделов (Проекты/Услуги/Товары) пока показываем ту же
        // заглушку - карточки-дубликаты, которые позже заменят на настоящие карточки проектов
        function updateSearchCollections(key) {
            if (collectionsTitle) {
                collectionsTitle.textContent = COLLECTIONS_TITLE_BY_KEY[key] || COLLECTIONS_TITLE_BY_KEY.projects;
            }
            var showCompanies = key === 'companies';
            if (collectionsListCompanies) collectionsListCompanies.hidden = !showCompanies;
            if (collectionsListProjects) collectionsListProjects.hidden = showCompanies;
        }

        searchTabs.forEach(function (tab) {
            tab.addEventListener('click', function (e) {
                e.preventDefault();
                var key = tab.dataset.tabKey;
                searchTabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                updateSearchCollections(key);
                // тот же раздел выставляем и в шапке главной - чтобы значок фильтра там (в
                // обход поиска) открывал панель того же раздела, что выбран в самом поиске
                if (typeof window.__syncTabGroup === 'function') {
                    window.__syncTabGroup(document.querySelector('.banner_filter__tabs'), key);
                }

                renderLiveResults();
            });
        });

        // сразу при загрузке синхронизируем активный таб поиска с тем, на какой странице мы находимся
        // (см. window.__pageFilterKey - определяется по URL, а не по наличию модалок в разметке,
        // потому что на некоторых страницах в HTML по ошибке лежат обе модалки сразу)
        (function syncSearchTabToPage() {
            var key = window.__pageFilterKey;
            if (!key) return;
            if (typeof window.__syncTabGroup === 'function') {
                window.__syncTabGroup(searchTabsWrap, key);
            }
            updateSearchCollections(key);
        })();

        // ---- применённые фильтры прямо в модалке поиска ----
        // на реальной странице проектов/компаний строка поиска и применённые фильтры лежат
        // ВМЕСТЕ в одной обёртке .projects_filter__group_top.flex_column: сверху инпут+значок
        // (.banner_filter__btm), под ним чипы .projects_filter.flex_row (класс чипа -
        // filter_cheap, в конце кнопка "Сбросить все") - переносим #searchPanel в ту же
        // структуру: оборачиваем существующий .search_panel__input-row в такую же group_top
        // и добавляем рядом с ним такую же строку чипов
        var searchFilterChipsRow = null;
        function getSearchFilterChipsRow() {
            if (searchFilterChipsRow) return searchFilterChipsRow;
            var inputRow = searchPanel.querySelector('.search_panel__input-row');
            if (!inputRow) return null;

            var groupTop = document.createElement('div');
            groupTop.className = 'projects_filter__group_top flex_column';
            inputRow.parentNode.insertBefore(groupTop, inputRow);
            groupTop.appendChild(inputRow);

            searchFilterChipsRow = document.createElement('div');
            searchFilterChipsRow.className = 'projects_filter flex_row';
            searchFilterChipsRow.hidden = true;
            groupTop.appendChild(searchFilterChipsRow);
            return searchFilterChipsRow;
        }

        function renderSearchAppliedChips() {
            var chipsRow = getSearchFilterChipsRow();
            if (!chipsRow) return;
            var key = currentSearchTab();
            var items = (window.__filterPanels && window.__filterPanels[key] && typeof window.__filterPanels[key].getAppliedItems === 'function')
                ? window.__filterPanels[key].getAppliedItems()
                : [];
            chipsRow.innerHTML = '';
            items.forEach(function (item) {
                var chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'filter_cheap caption_medium flex_row';
                chip.innerHTML = item.label + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.08333 0.75L0.75 9.08333M0.75 0.75L9.08333 9.08333" stroke="#141416" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>';
                chip.addEventListener('click', function () {
                    item.reset();
                    // если это чип самого поискового запроса - item.reset() очищает
                    // window.__searchQuery[key], синхронизируем с ним видимый инпут поиска
                    if (searchInput) {
                        searchInput.value = (window.__searchQuery && window.__searchQuery[key]) || '';
                        searchInput.dispatchEvent(new Event('input'));
                    }
                    renderSearchAppliedChips();
                    renderLiveResults();
                });
                chipsRow.appendChild(chip);
            });
            if (items.length > 0) {
                var resetBtn = document.createElement('button');
                resetBtn.type = 'button';
                resetBtn.className = 'button_border caption_medium';
                resetBtn.textContent = 'Сбросить все';
                resetBtn.addEventListener('click', function () {
                    if (window.__filterPanels && window.__filterPanels[key]) window.__filterPanels[key].resetAll();
                    // resetAll() тоже очищает window.__searchQuery[key] - подчищаем инпут так же
                    if (searchInput) {
                        searchInput.value = (window.__searchQuery && window.__searchQuery[key]) || '';
                        searchInput.dispatchEvent(new Event('input'));
                    }
                    renderSearchAppliedChips();
                    renderLiveResults();
                });
                chipsRow.appendChild(resetBtn);
            }
            chipsRow.hidden = items.length === 0;
        }
        // вызывается из renderApplied() любой панели фильтров - см. window.__renderSearchAppliedChips
        window.__renderSearchAppliedChips = renderSearchAppliedChips;

        // ---- живые результаты поиска прямо в модалке, без перехода на каталог ----
        // готового блока под результаты в вёрстке не было - создаём его один раз рядом
        // с "Подборками" (searchPanel__collections). Ищем совпадения среди всех .popular_card,
        // какие вообще есть на текущей странице (другого источника данных о проектах/компаниях
        // в статичной вёрстке нет), разделяя проекты/компании по наличию .company_name на карточке
        var collectionsBlock = searchPanel.querySelector('.search_panel__collections');
        var resultsBlock = null;
        var resultsList = null;
        var sortWrapperOuter = null;
        var sortCountEl = null;
        var currentMatches = [];
        var currentTab = 'projects';
        var currentSortValue = 'popular';

        // реальный блок "N проектов + сортировка" - взят 1в1 с настоящей страницы каталога
        // (.sorting_wrapper flex_row > счётчик + вложенный .sorting_wrapper[data-sorting] с
        // data-sorting-value="popular|cheap|expensive"), ничего не придумано заново
        function buildSortWrapperHTML() {
            return '' +
                '<p class="body_medium" data-sorting-count></p>' +
                '<div class="sorting_wrapper" data-sorting>' +
                    '<button class="sorting flex_row caption_medium" type="button" data-sorting-toggle>' +
                        '<span data-sorting-label>По популярности</span>' +
                        '<svg class="sorting__arrow" width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M0.649902 0.649994L5.6499 5.64999L10.6499 0.649994" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>' +
                        '</svg>' +
                    '</button>' +
                    '<div class="card_more__modal sorting__modal">' +
                        '<div class="card_more__modal_wrapper sorting__list flex_column">' +
                            '<button class="more_modal__item sorting__item active flex_row" type="button" data-sorting-value="popular">' +
                                '<p class="caption">По популярности</p>' +
                                '<svg class="sorting__check" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                                    '<path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#141416" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>' +
                                '</svg>' +
                            '</button>' +
                            '<button class="more_modal__item sorting__item flex_row" type="button" data-sorting-value="cheap">' +
                                '<p class="caption">Сначала дешевле</p>' +
                                '<svg class="sorting__check" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                                    '<path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#141416" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>' +
                                '</svg>' +
                            '</button>' +
                            '<button class="more_modal__item sorting__item flex_row" type="button" data-sorting-value="expensive">' +
                                '<p class="caption">Сначала дороже</p>' +
                                '<svg class="sorting__check" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                                    '<path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#141416" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>' +
                                '</svg>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        function getResultsBlock() {
            if (resultsBlock) return resultsBlock;
            resultsBlock = document.createElement('div');
            // переиспользуем настоящий класс "Подборок" вместо своего - тогда у результатов
            // те же отступы, что и у остального содержимого filters_panel__body
            resultsBlock.className = 'search_panel__collections flex_column';
            resultsBlock.style.display = 'none';

            sortWrapperOuter = document.createElement('div');
            sortWrapperOuter.className = 'sorting_wrapper flex_row';
            sortWrapperOuter.innerHTML = buildSortWrapperHTML();
            resultsBlock.appendChild(sortWrapperOuter);

            sortCountEl = sortWrapperOuter.querySelector('[data-sorting-count]');
            var sortInner = sortWrapperOuter.querySelector('[data-sorting]');
            var sortToggleBtn = sortInner.querySelector('[data-sorting-toggle]');
            var sortLabel = sortInner.querySelector('[data-sorting-label]');
            var sortModal = sortInner.querySelector('.sorting__modal');
            var sortItems = sortInner.querySelectorAll('.sorting__item');

            // этот блок создаётся динамически уже после DOMContentLoaded, поэтому под общий
            // querySelectorAll('[data-sorting]') (см. ниже в файле) он не попадает - открытие/
            // выбор пункта дублируем вручную по тому же принципу; закрытие по клику вне блока
            // отрабатывает само - это уже существующий общий document click-обработчик
            // ищет любой .sorting_wrapper.active, а не конкретные элементы
            sortToggleBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = sortModal.classList.contains('active');
                document.querySelectorAll('.sorting_wrapper.active').forEach(function (w) {
                    w.classList.remove('active');
                    var m = w.querySelector('.sorting__modal');
                    if (m) m.classList.remove('active');
                });
                if (!isOpen) {
                    sortInner.classList.add('active');
                    sortModal.classList.add('active');
                }
            });

            sortItems.forEach(function (item) {
                item.addEventListener('click', function () {
                    sortItems.forEach(function (i) { i.classList.remove('active'); });
                    item.classList.add('active');
                    var itemText = item.querySelector('p');
                    if (sortLabel && itemText) sortLabel.textContent = itemText.textContent;
                    sortInner.classList.remove('active');
                    sortModal.classList.remove('active');
                    currentSortValue = item.dataset.sortingValue || 'popular';
                    renderSortedMatches();
                });
            });

            resultsList = document.createElement('div');
            // класс списка выставляется в renderLiveResults под конкретный таб - у проектов
            // и компаний на реальных страницах разные контейнеры карточек (см. ниже)
            resultsBlock.appendChild(resultsList);
            if (collectionsBlock && collectionsBlock.parentNode) {
                collectionsBlock.parentNode.insertBefore(resultsBlock, collectionsBlock);
            } else {
                searchPanel.querySelector('.filters_panel__body').appendChild(resultsBlock);
            }
            return resultsBlock;
        }

        function cardTypeOf(card) {
            return card.querySelector('.company_name') ? 'companies' : 'projects';
        }

        function cardSearchData(card) {
            var titleEl = card.querySelector('.company_name h3, .popular_card__bottom_left > h3, h3');
            var priceEl = card.querySelector('.popular_card__price');
            var descEl = card.querySelector('.description p, .popular_card__top_left .micro_medium');
            return {
                title: titleEl ? titleEl.textContent.trim() : '',
                subtitle: priceEl ? priceEl.textContent.trim() : (descEl ? descEl.textContent.trim() : '')
            };
        }

        function priceValueOf(card) {
            var priceEl = card.querySelector('.popular_card__price, .popular_card__bottom_left .body_medium');
            if (!priceEl) return null;
            var digits = priceEl.textContent.replace(/[^\d]/g, '');
            return digits ? parseInt(digits, 10) : null;
        }

        // стандартное русское склонение по числу (1 проект / 2 проекта / 5 проектов)
        function pluralRu(n, one, few, many) {
            n = Math.abs(n) % 100;
            var n1 = n % 10;
            if (n > 10 && n < 20) return many;
            if (n1 > 1 && n1 < 5) return few;
            if (n1 === 1) return one;
            return many;
        }

        function updateSortCount(tab, count) {
            if (!sortCountEl) return;
            var word;
            if (tab === 'companies') word = pluralRu(count, 'компания', 'компании', 'компаний');
            else if (tab === 'services') word = pluralRu(count, 'услуга', 'услуги', 'услуг');
            else if (tab === 'products') word = pluralRu(count, 'товар', 'товара', 'товаров');
            else word = pluralRu(count, 'проект', 'проекта', 'проектов');
            sortCountEl.textContent = count + ' ' + word;
        }

        // эталонная разметка карточек для живого поиска - взята 1в1 с реальной страницы
        // (popular_card__v3, как в "Избранном"/на странице проекта; popular_card__v2 -
        // БЕЗ подписи "Строительная компания", с .popular_card__bottom_wrapper, как на
        // странице компании). На многих страницах (например на главной) в вёрстке нет ни
        // одной настоящей карточки такого варианта - там только упрощённые карточки для
        // витринных каруселей, поэтому эти эталоны используются как резерв поверх
        // сканирования DOM, а не вместо него
        var PROJECT_CARD_TEMPLATE_HTML = `<div class="popular_card popular_card__v3 flex_column">
            <div class="popular_card__bottom flex_row">
                <div class="popular_card__bottom_left">
                    <h3>Fachwerk 160 Axel</h3>
                    <div class="characteristic flex_row">
                        <p class="body">160 м²</p>·<p class="body">1 этаж</p>·<p class="body">3 спальни</p>
                    </div>
                </div>
                <svg class="popular_card__more" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill="#141416" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13Z" fill="#141416" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13Z" fill="#141416" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <div class="card_more__modal">
                    <div class="card_more__modal_wrapper flex_column">
                        <div class="more_modal__item flex_row">
                            <p class="caption">О проекте</p>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.81509 9.5349C1.71296 9.37313 1.66188 9.29228 1.63329 9.16755C1.61182 9.07388 1.61182 8.92613 1.63329 8.83245C1.66188 8.70773 1.71296 8.62688 1.81509 8.4651C2.65915 7.12863 5.17155 3.75 9.0003 3.75C12.8291 3.75 15.3415 7.12863 16.1855 8.4651C16.2877 8.62688 16.3388 8.70773 16.3673 8.83245C16.3888 8.92613 16.3888 9.07388 16.3673 9.16755C16.3388 9.29228 16.2877 9.37313 16.1855 9.5349C15.3415 10.8714 12.8291 14.25 9.0003 14.25C5.17155 14.25 2.65915 10.8714 1.81509 9.5349Z" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.00049 11.25C10.2432 11.25 11.2505 10.2427 11.2505 9C11.2505 7.75732 10.2432 6.75 9.00049 6.75C7.75781 6.75 6.75049 7.75732 6.75049 9C6.75049 10.2427 7.75781 11.25 9.00049 11.25Z" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </div>
                        <div class="more_modal__item flex_row">
                            <p class="caption">Сравнить</p>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3.75H15M3 12.75H6M3 8.25H10.5M10.5 12.75H12.75M12.75 12.75H15M12.75 12.75V15M12.75 12.75V10.5" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </div>
                        <div class="more_modal__item flex_row">
                            <p class="caption">Поделиться</p>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 9V12.15C15.75 13.4102 15.75 14.0401 15.5048 14.5215C15.2891 14.9449 14.9449 15.2891 14.5215 15.5048C14.0401 15.75 13.4102 15.75 12.15 15.75H5.85C4.58988 15.75 3.95982 15.75 3.47852 15.5048C3.05516 15.2891 2.71095 14.9449 2.49524 14.5215C2.25 14.0401 2.25 13.4102 2.25 12.15V9M6 5.25L9 2.25L12 5.25M9 2.25V11.25" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </div>
                        <div class="more_modal__item flex_row">
                            <p class="caption">Избранное</p>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.9949 3.85186C7.49535 2.0988 4.99481 1.62723 3.11602 3.23251C1.23723 4.83779 0.972728 7.52175 2.44815 9.4203C3.67487 10.9988 7.38733 14.3281 8.60408 15.4056C8.7402 15.5262 8.8083 15.5864 8.88765 15.6101C8.95695 15.6308 9.03277 15.6308 9.10207 15.6101C9.18142 15.5864 9.24953 15.5262 9.38565 15.4056C10.6024 14.3281 14.3149 10.9988 15.5416 9.4203C17.017 7.52175 16.7848 4.8209 14.8737 3.23251C12.9626 1.64412 10.4944 2.0988 8.9949 3.85186Z" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </div>
                    </div>
                </div>
            </div>
            <div class="popular_card__media">
                <div class="popular_card__top">
                    <div class="popular_card__top_left micro cheap project_cheap">
                        <p class="micro_medium">Idea House</p>
                        <span class="divider">|</span>
                        <div class="popular_card_rating flex_row gap_4">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.62399 2.09994C6.74477 1.84319 6.80521 1.71482 6.8872 1.6738C6.95854 1.63811 7.04148 1.63811 7.11282 1.6738C7.19486 1.71482 7.25525 1.84319 7.37608 2.09994L8.52239 4.53575C8.55804 4.61155 8.57586 4.64945 8.60192 4.67888C8.62504 4.70493 8.65271 4.72604 8.68343 4.74103C8.71819 4.75797 8.75803 4.76408 8.83776 4.77631L11.4019 5.16942C11.6719 5.21081 11.8069 5.23151 11.8694 5.30068C11.9237 5.36086 11.9493 5.44357 11.9389 5.52575C11.927 5.62022 11.8293 5.72009 11.6338 5.91979L9.7791 7.81458C9.72133 7.87363 9.6924 7.90321 9.67374 7.93835C9.65722 7.96942 9.64663 8.00362 9.64254 8.03897C9.63793 8.07889 9.64475 8.12062 9.65838 8.20404L10.096 10.8804C10.1422 11.1627 10.1652 11.3038 10.1219 11.3876C10.0841 11.4604 10.0171 11.5116 9.93936 11.5267C9.84998 11.544 9.72915 11.4774 9.48748 11.3441L7.19523 10.0796C7.12378 10.0403 7.08808 10.0206 7.05044 10.0128C7.01715 10.006 6.98287 10.006 6.94958 10.0128C6.91194 10.0206 6.87624 10.0403 6.80484 10.0796L4.51255 11.3441C4.27088 11.4774 4.15005 11.544 4.0607 11.5267C3.98296 11.5116 3.91588 11.4604 3.87815 11.3876C3.83478 11.3038 3.85786 11.1627 3.90401 10.8804L4.34164 8.20404C4.35528 8.12062 4.3621 8.07889 4.35748 8.03897C4.3534 8.00362 4.3428 7.96942 4.32629 7.93835C4.30763 7.90321 4.27873 7.87363 4.22091 7.81458L2.36621 5.91979C2.17073 5.72009 2.07299 5.62022 2.0611 5.52575C2.05075 5.44357 2.07631 5.36086 2.13067 5.30068C2.19315 5.23151 2.32815 5.21081 2.59816 5.16942L5.16226 4.77631C5.242 4.76408 5.28187 4.75797 5.3166 4.74103C5.34734 4.72604 5.37501 4.70493 5.3981 4.67888C5.42416 4.64945 5.44199 4.61155 5.47766 4.53575L6.62399 2.09994Z" fill="white" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            <p class="micro_medium">5,0</p>
                            <a href="#" class="popular_card_rating__source"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_879_1895)"><path d="M0 7C0 3.1339 3.1332 0 7 0C10.8654 0 14 3.1339 14 7C14 10.8661 10.8654 14 7 14C3.1332 14 0 10.8661 0 7Z" fill="#FC3F1D"></path><path d="M7.896 3.9662H7.2492C6.0634 3.9662 5.4397 4.5668 5.4397 5.4523C5.4397 6.4533 5.8709 6.9223 6.7564 7.5236L7.4879 8.0164L5.3858 11.1573H3.815L5.7015 8.3475C4.6165 7.5698 4.0075 6.8145 4.0075 5.537C4.0075 3.9354 5.124 2.842 7.2415 2.842H9.3436V11.1496H7.896V3.9662Z" fill="white"></path></g><defs><clipPath id="clip0_879_1895"><rect width="14" height="14" fill="white"></rect></clipPath></defs></svg></a>
                        </div>
                    </div>
                    <button class="popular_card__like" type="button" aria-label="В избранное">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9932 5.13581C9.9938 2.7984 6.65975 2.16964 4.15469 4.31001C1.64964 6.45038 1.29697 10.029 3.2642 12.5604C4.89982 14.6651 9.84977 19.1041 11.4721 20.5408C11.6536 20.7016 11.7444 20.7819 11.8502 20.8135C11.9426 20.8411 12.0437 20.8411 12.1361 20.8135C12.2419 20.7819 12.3327 20.7016 12.5142 20.5408C14.1365 19.1041 19.0865 14.6651 20.7221 12.5604C22.6893 10.029 22.3797 6.42787 19.8316 4.31001C17.2835 2.19216 13.9925 2.7984 11.9932 5.13581Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    </button>
                </div>
                <img src="./assets/images/popular/0e9794b2ecd906a8d48ad92bab5131e5ab45fca8.png" alt="">
                <div class="popular_card__dots">
                    <span class="active"></span><span></span><span></span><span></span>
                </div>
            <div class="favorites_modal"><div class="favorites_modal_wrapper flex_row"><div class="favorites_modal__left flex_row"></div><div class="favorites_modal__right flex_row"></div></div></div></div>
            <h3 class="popular_card__price">от 15 627 250 ₽</h3>
        </div>`;

        var COMPANY_CARD_TEMPLATE_HTML = `<div class="popular_card popular_card__v2 flex_column">
            <div class="popular_card__media">
                <div class="popular_card__top">
                    <div class="popular_card__top_left micro cheap project_cheap">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 11.0834V5.48925C1.75064 5.33622 1.8114 5.18957 1.91917 5.08091L4.08333 2.91675L6.41667 5.25008V11.0834H1.75ZM9.91667 2.91675H4.08333L6.41667 5.25008V11.0834H12.25V5.48925C12.2494 5.33622 12.1886 5.18957 12.0808 5.08091L9.91667 2.91675Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    </div>
                    <button class="popular_card__like" type="button" aria-label="В избранное">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9932 5.13581C9.9938 2.7984 6.65975 2.16964 4.15469 4.31001C1.64964 6.45038 1.29697 10.029 3.2642 12.5604C4.89982 14.6651 9.84977 19.1041 11.4721 20.5408C11.6536 20.7016 11.7444 20.7819 11.8502 20.8135C11.9426 20.8411 12.0437 20.8411 12.1361 20.8135C12.2419 20.7819 12.3327 20.7016 12.5142 20.5408C14.1365 19.1041 19.0865 14.6651 20.7221 12.5604C22.6893 10.029 22.3797 6.42787 19.8316 4.31001C17.2835 2.19216 13.9925 2.7984 11.9932 5.13581Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    </button>
                </div>
                <img src="./assets/images/popular/0e9794b2ecd906a8d48ad92bab5131e5ab45fca8.png" alt="" class="popular_card__v2">
                <img src="./assets/images/company/Logo-ИХ.svg" class="popular_card__logo" alt="">
                <div class="popular_card__dots">
                    <span class="active"></span><span></span><span></span><span></span>
                </div>
            <div class="favorites_modal"><div class="favorites_modal_wrapper flex_row"><div class="favorites_modal__left flex_row"></div><div class="favorites_modal__right flex_row"></div></div></div></div>
            <div class="popular_card__bottom_wrapper flex_column">
                <div class="popular_card__bottom flex_row">
                    <div class="popular_card__bottom_left">
                        <div class="company_name flex_row">
                            <h3 class="body_medium">Idea House</h3>
                            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.39844 0.185951C5.99715 -0.0619248 6.66988 -0.0620426 7.26855 0.185951L8.72168 0.787514L8.80957 0.818764C9.01725 0.881256 9.24126 0.870368 9.44336 0.786537L9.44531 0.78556L10.8994 0.185951L11.127 0.104896C11.6647 -0.0575305 12.2449 -0.0298872 12.7686 0.186928C13.2923 0.403917 13.7229 0.794926 13.9883 1.29044L14.0918 1.50919L14.6895 2.95353L14.6943 2.96134C14.7898 3.19214 14.9726 3.37596 15.2031 3.47208L16.6582 4.07462C17.2569 4.32264 17.7324 4.79922 17.9805 5.39787C18.2283 5.99647 18.2283 6.66936 17.9805 7.26798L17.3789 8.72111C17.2949 8.92399 17.2847 9.14874 17.3477 9.35587L17.3789 9.44279L17.3799 9.44474L17.9805 10.8969L18.0615 11.1235C18.131 11.3526 18.166 11.5919 18.166 11.8324L18.1543 12.0727C18.1308 12.3112 18.0724 12.5458 17.9805 12.768C17.8576 13.0646 17.6769 13.3341 17.4502 13.561C17.28 13.7311 17.0856 13.8756 16.874 13.9887L16.6572 14.0912L15.2041 14.6928L15.2031 14.6938C14.9723 14.7893 14.7884 14.9727 14.6924 15.2035L14.0898 16.6567L14.0908 16.6576C13.8428 17.2562 13.3663 17.7318 12.7676 17.9799C12.1689 18.2279 11.4962 18.2278 10.8975 17.9799L9.44434 17.3783C9.21323 17.2829 8.95344 17.2827 8.72266 17.3783L8.72168 17.3793L7.26758 17.9809C6.66911 18.2283 5.99669 18.2276 5.39844 17.9799C4.87501 17.763 4.44517 17.3724 4.17969 16.8774L4.07617 16.6586L3.47363 15.2035C3.37806 14.9726 3.19457 14.7878 2.96387 14.6918V14.6928L1.50977 14.0902C0.91118 13.8423 0.435619 13.3663 0.1875 12.768C-0.0604945 12.1696 -0.0609491 11.4965 0.186523 10.8979L0.788086 9.44474L0.819336 9.35685C0.881741 9.14923 0.870929 8.92509 0.787109 8.72306V8.72208L0.185547 7.26603L0.186523 7.26505C0.0641418 6.96907 4.79854e-05 6.65176 0 6.33146C4.37614e-05 6.01065 0.0627706 5.69233 0.185547 5.39591C0.308382 5.09953 0.488907 4.82981 0.71582 4.60294C0.942655 4.37626 1.21252 4.19636 1.50879 4.07365L2.96191 3.47111H2.96289C3.19374 3.37552 3.37765 3.19206 3.47363 2.96134L4.0752 1.50822C4.32328 0.909603 4.79978 0.43393 5.39844 0.185951ZM12.5303 6.46915C12.2375 6.1766 11.7626 6.17671 11.4697 6.46915L8.25 9.68888L7.11328 8.55216C6.82048 8.25977 6.34553 8.25977 6.05273 8.55216C5.75997 8.84493 5.76022 9.31979 6.05273 9.61271L7.71973 11.2797C7.86036 11.4203 8.05116 11.4994 8.25 11.4994C8.44879 11.4993 8.6397 11.4203 8.78027 11.2797L12.5303 7.5297C12.8227 7.23683 12.8229 6.76193 12.5303 6.46915Z" fill="#141416"></path></svg>
                        </div>
                        <div class="description">
                            <p class="micro">Современные дома по&nbsp;технологии фахверк</p>
                        </div>
                    </div>
                    <svg class="popular_card__more" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill="#141416" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        <path d="M19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13Z" fill="#141416" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        <path d="M5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13Z" fill="#141416" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                    <div class="card_more__modal card_more__modal--below">
                        <div class="card_more__modal_wrapper flex_column">
                            <div class="more_modal__item flex_row">
                                <p class="caption">О компании</p>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.81509 9.5349C1.71296 9.37313 1.66188 9.29228 1.63329 9.16755C1.61182 9.07388 1.61182 8.92613 1.63329 8.83245C1.66188 8.70773 1.71296 8.62688 1.81509 8.4651C2.65915 7.12863 5.17155 3.75 9.0003 3.75C12.8291 3.75 15.3415 7.12863 16.1855 8.4651C16.2877 8.62688 16.3388 8.70773 16.3673 8.83245C16.3888 8.92613 16.3888 9.07388 16.3673 9.16755C16.3388 9.29228 16.2877 9.37313 16.1855 9.5349C15.3415 10.8714 12.8291 14.25 9.0003 14.25C5.17155 14.25 2.65915 10.8714 1.81509 9.5349Z" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.00049 11.25C10.2432 11.25 11.2505 10.2427 11.2505 9C11.2505 7.75732 10.2432 6.75 9.00049 6.75C7.75781 6.75 6.75049 7.75732 6.75049 9C6.75049 10.2427 7.75781 11.25 9.00049 11.25Z" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </div>
                            <div class="more_modal__item flex_row">
                                <p class="caption">Поделиться</p>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 9V12.15C15.75 13.4102 15.75 14.0401 15.5048 14.5215C15.2891 14.9449 14.9449 15.2891 14.5215 15.5048C14.0401 15.75 13.4102 15.75 12.15 15.75H5.85C4.58988 15.75 3.95982 15.75 3.47852 15.5048C3.05516 15.2891 2.71095 14.9449 2.49524 14.5215C2.25 14.0401 2.25 13.4102 2.25 12.15V9M6 5.25L9 2.25L12 5.25M9 2.25V11.25" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </div>
                            <div class="more_modal__item flex_row">
                                <p class="caption">Избранное</p>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.9949 3.85186C7.49535 2.0988 4.99481 1.62723 3.11602 3.23251C1.23723 4.83779 0.972728 7.52175 2.44815 9.4203C3.67487 10.9988 7.38733 14.3281 8.60408 15.4056C8.7402 15.5262 8.8083 15.5864 8.88765 15.6101C8.95695 15.6308 9.03277 15.6308 9.10207 15.6101C9.18142 15.5864 9.24953 15.5262 9.38565 15.4056C10.6024 14.3281 14.3149 10.9988 15.5416 9.4203C17.017 7.52175 16.7848 4.8209 14.8737 3.23251C12.9626 1.64412 10.4944 2.0988 8.9949 3.85186Z" stroke="#141416" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="popular_card__top_left micro_medium">
                    <div class="popular_card_rating flex_row gap_4">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.1716 1.29691C7.34415 0.930126 7.43049 0.746735 7.54762 0.688137C7.64954 0.637158 7.76802 0.637158 7.86994 0.688137C7.98714 0.746735 8.07341 0.930126 8.24603 1.29691L9.88361 4.77664C9.93454 4.88493 9.96 4.93907 9.99722 4.98111C10.0302 5.01833 10.0698 5.04848 10.1137 5.0699C10.1633 5.0941 10.2202 5.10283 10.3341 5.12029L13.9972 5.68188C14.3829 5.74101 14.5757 5.77058 14.665 5.8694C14.7427 5.95537 14.7791 6.07352 14.7644 6.19093C14.7474 6.32589 14.6078 6.46855 14.3285 6.75384L11.6789 9.46068C11.5964 9.54504 11.555 9.5873 11.5284 9.6375C11.5048 9.68188 11.4897 9.73074 11.4838 9.78124C11.4772 9.83827 11.487 9.89789 11.5064 10.017L12.1317 13.8404C12.1976 14.2437 12.2305 14.4453 12.1686 14.5649C12.1147 14.669 12.0189 14.7421 11.9078 14.7637C11.7802 14.7885 11.6075 14.6932 11.2623 14.5028L7.98766 12.6965C7.88559 12.6402 7.83459 12.6121 7.78082 12.601C7.73327 12.5912 7.68429 12.5912 7.63674 12.601C7.58297 12.6121 7.53197 12.6402 7.42997 12.6965L4.15526 14.5028C3.81003 14.6932 3.6374 14.7885 3.50976 14.7637C3.39871 14.7421 3.30288 14.669 3.24898 14.5649C3.18702 14.4453 3.21999 14.2437 3.28592 13.8404L3.91111 10.017C3.93059 9.89789 3.94034 9.83827 3.93374 9.78124C3.9279 9.73074 3.91277 9.68188 3.88918 9.6375C3.86253 9.5873 3.82123 9.54504 3.73864 9.46068L1.08906 6.75384C0.809804 6.46855 0.670174 6.32589 0.653189 6.19093C0.638407 6.07352 0.674922 5.95537 0.752581 5.8694C0.841841 5.77058 1.0347 5.74101 1.42043 5.68188L5.08342 5.12029C5.19734 5.10283 5.2543 5.0941 5.3039 5.0699C5.34782 5.04848 5.38736 5.01833 5.42033 4.98111C5.45757 4.93907 5.48304 4.88493 5.534 4.77664L7.1716 1.29691Z" fill="#3D3D44" stroke="#3D3D44" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        <p class="micro_medium">5,0</p>
                        <a href="#" class="popular_card_rating__source"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_879_1895)"><path d="M0 7C0 3.1339 3.1332 0 7 0C10.8654 0 14 3.1339 14 7C14 10.8661 10.8654 14 7 14C3.1332 14 0 10.8661 0 7Z" fill="#FC3F1D"></path><path d="M7.896 3.9662H7.2492C6.0634 3.9662 5.4397 4.5668 5.4397 5.4523C5.4397 6.4533 5.8709 6.9223 6.7564 7.5236L7.4879 8.0164L5.3858 11.1573H3.815L5.7015 8.3475C4.6165 7.5698 4.0075 6.8145 4.0075 5.537C4.0075 3.9354 5.124 2.842 7.2415 2.842H9.3436V11.1496H7.896V3.9662Z" fill="white"></path></g><defs><clipPath id="clip0_879_1895"><rect width="14" height="14" fill="white"></rect></clipPath></defs></svg></a>
                    </div>
                    <span class="divider">|</span>
                    <p class="micro_medium">126 отзывов</p>
                </div>
            </div>
        </div>`;

        function buildCardFromTemplate(html) {
            var wrap = document.createElement('div');
            wrap.innerHTML = html.trim();
            return wrap.firstElementChild;
        }

        function renderLiveResults() {
            // применённые фильтры показываем независимо от того, есть ли уже введённый текст -
            // на странице каталога они тоже видны сразу, а не только во время поиска
            renderSearchAppliedChips();

            // пока запрос пустой - показываем "Подборки" (.search_panel__collections), как и
            // было изначально в вёрстке; результаты живого поиска показываем только когда
            // пользователь реально начал печатать
            var rawQuery = searchInput ? searchInput.value.trim() : '';
            var query = rawQuery.toLowerCase();
            var block = getResultsBlock();

            if (!query) {
                block.style.display = 'none';
                if (collectionsBlock) collectionsBlock.style.display = '';
                renderHistory();
                return;
            }

            // "Вы искали" (реальная история поиска) не подменяем во время набора текста -
            // туда запрос попадает только после настоящего поиска (см. addToHistory в doSearch).
            // Но пока идут живые результаты, саму историю прячем (как и "Подборки") - иначе
            // старая сохранённая история остаётся на экране рядом со счётчиком результатов и
            // выглядит так, будто набираемый прямо сейчас текст "эхом" попадает в историю
            if (collectionsBlock) collectionsBlock.style.display = 'none';
            if (historyWrap) historyWrap.hidden = true;

            var tab = currentSearchTab();
            var matches = [];

            // ищем строго среди карточек нужного реального варианта разметки -
            // .popular_card__v3 у проектов, .popular_card__v2 у компаний (именно эти классы
            // дают карточке правильный размер/вид на реальных страницах) - по всему документу,
            // а не только внутри одного контейнера, потому что на разных страницах они лежат
            // в разных обёртках (где-то в Swiper-карусели, где-то в обычном списке каталога).
            // У компаний настоящая карточка (без подписи "Строительная компания") обёрнута в
            // .popular_card__bottom_wrapper - старые витринные карточки на главной без этой
            // обёртки отсеиваем, чтобы снова не показать неправильную разметку
            var cardSelector = tab === 'companies' ? '.popular_card.popular_card__v2' : '.popular_card.popular_card__v3';
            var candidates = [];
            document.querySelectorAll(cardSelector).forEach(function (card) {
                if (cardTypeOf(card) !== tab) return;
                if (tab === 'companies' && !card.querySelector('.popular_card__bottom_wrapper')) return;
                candidates.push(card);
            });
            // на многих страницах (например на главной) в вёрстке нет вообще ни одной
            // настоящей карточки нужного варианта - только упрощённые витринные карточки,
            // поэтому поверх найденного в DOM всегда добавляем эталонную карточку
            // (см. PROJECT_CARD_TEMPLATE_HTML / COMPANY_CARD_TEMPLATE_HTML выше) - иначе
            // поиск на таких страницах всегда был бы пустым. Для Услуг/Товаров такого эталона
            // нет (в статичной вёрстке нет ни одной карточки услуги/товара вообще) - для них
            // живой поиск честно показывает "ничего не найдено", а не карточку проекта
            if (tab === 'companies' || tab === 'projects') {
                candidates.push(buildCardFromTemplate(tab === 'companies' ? COMPANY_CARD_TEMPLATE_HTML : PROJECT_CARD_TEMPLATE_HTML));
            }

            candidates.forEach(function (card) {
                var data = cardSearchData(card);
                if (!data.title) return;
                if (card.textContent.toLowerCase().indexOf(query) === -1) return;
                matches.push(card);
            });

            currentMatches = matches;
            currentTab = tab;
            updateSortCount(tab, matches.length);

            // при новом запросе/смене таба сбрасываем сортировку на "по популярности"
            currentSortValue = 'popular';
            if (sortWrapperOuter) {
                var sortInnerReset = sortWrapperOuter.querySelector('[data-sorting]');
                sortInnerReset.querySelectorAll('.sorting__item').forEach(function (i) {
                    i.classList.toggle('active', i.dataset.sortingValue === 'popular');
                });
                var sortLabelReset = sortInnerReset.querySelector('[data-sorting-label]');
                if (sortLabelReset) sortLabelReset.textContent = 'По популярности';
            }

            renderSortedMatches();

            block.style.display = 'flex';
        }

        function renderSortedMatches() {
            // тот самый настоящий контейнер карточек, что и на реальной странице каталога:
            // у компаний - сетка по 2 в ряд, мелкие карточки (companies.html, .popular_card__v2) -
            // класс companies обязателен, от него зависят реальные стили карточки компании
            // (.companies .popular_card__like{width:18px;height:18px} и т.д. в style.css),
            // у проектов - один столбец на всю ширину (projects.html, .popular_card__v3)
            resultsList.className = currentTab === 'companies' ? 'text_block__v3_cards grid-2 companies' : 'text_block__v1_cards flex_column';
            resultsList.innerHTML = '';

            var list = currentMatches.slice();
            if (currentSortValue === 'cheap' || currentSortValue === 'expensive') {
                list.sort(function (a, b) {
                    var pa = priceValueOf(a);
                    var pb = priceValueOf(b);
                    if (pa === null && pb === null) return 0;
                    if (pa === null) return 1;
                    if (pb === null) return -1;
                    return currentSortValue === 'cheap' ? pa - pb : pb - pa;
                });
            }

            if (list.length === 0) {
                resultsList.innerHTML = '<div class="search_empty flex_column">' + getSearchEmptyStateHTML() + '</div>';
                return;
            }

            list.slice(0, 8).forEach(function (card) {
                var clone = card.cloneNode(true);
                // если исходная карточка на странице лежит внутри Swiper-карусели, Swiper
                // мог навесить прямо на неё класс swiper-slide(-...) и инлайн-стили
                // (transform/width) для позиционирования слайда - в результатах поиска это
                // всё лишнее и ломает вёрстку, поэтому чистим клон перед вставкой
                clone.removeAttribute('style');
                Array.prototype.slice.call(clone.classList).forEach(function (cls) {
                    if (cls.indexOf('swiper') === 0) clone.classList.remove(cls);
                });
                resultsList.appendChild(clone);
            });
            // клон карточки не наследует JS-обработчики оригинала - переинициализируем
            // лайк/тост (initFavoritesToast принимает root) и подсвечиваем уже избранные,
            // как и на обычных карточках страницы; меню "..." и "Сравнить" уже работают
            // сами - они навешаны через делегирование на document, а не на конкретный элемент
            if (typeof window.initFavoritesToast === 'function') window.initFavoritesToast(resultsList);
            if (typeof window.__syncFavoriteLikeButtons === 'function') window.__syncFavoriteLikeButtons(resultsList);
            if (typeof window.initCardLinks === 'function') window.initCardLinks(resultsList);
            if (typeof window.initCardMediaLinks === 'function') window.initCardMediaLinks(resultsList);
        }

        renderHistory();
        renderSearchAppliedChips();

        // иконка/инпут поиска в баннере на главной - тот же класс .banner_filter__btm переиспользован
        // и внутри поиска, поэтому берём именно первый (баннерный) через .banner_main
        var bannerRow = document.querySelector('.banner_main .banner_filter__btm');
        var bannerSearchBtn = bannerRow ? bannerRow.querySelector('a.search_btn') : null;
        var bannerInput = bannerRow ? bannerRow.querySelector('input.filter_input__button') : null;

        if (bannerSearchBtn && searchPanel) {
            bannerSearchBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (bannerInput && searchInput) {
                    searchInput.value = bannerInput.value;
                    searchInput.dispatchEvent(new Event('input'));
                }
                var bannerActiveTab = document.querySelector('.banner_filter__tabs a[data-tab-key].active');
                var key = (bannerActiveTab && bannerActiveTab.dataset.tabKey) || 'projects';
                if (typeof window.__syncTabGroup === 'function') {
                    window.__syncTabGroup(searchTabsWrap, key);
                }
                updateSearchCollections(key);
                openSearchPanel();
                if (searchInput) searchInput.focus();
            });
        }

        // поиск в баннере на главной должен открываться прямо по тапу на сам инпут "Найти",
        // без отдельной кнопки-иконки, сразу с открытой клавиатурой - как в Google (тап по
        // строке поиска сразу даёт возможность печатать, а не открывает пустую модалку, в
        // которой ещё раз нужно попасть пальцем в инпут). Сам баннерный инпут - readonly
        // (см. index.html), поэтому он никогда не получает свой собственный фокус/клавиатуру -
        // тап по нему сразу и без всякого мигания переводит фокус на настоящий инпут внутри
        // модалки поиска, в рамках того же самого пользовательского жеста
        if (bannerInput && searchPanel) {
            bannerInput.addEventListener('click', function () {
                if (bannerInput && searchInput) {
                    searchInput.value = bannerInput.value;
                    searchInput.dispatchEvent(new Event('input'));
                }
                var activeTab = document.querySelector('.banner_filter__tabs a[data-tab-key].active');
                var key = (activeTab && activeTab.dataset.tabKey) || 'projects';
                if (typeof window.__syncTabGroup === 'function') {
                    window.__syncTabGroup(searchTabsWrap, key);
                }
                updateSearchCollections(key);
                openSearchPanel();
                // .filters_panel.active меняет visibility с переходом (transition), поэтому сразу
                // в этом же тике браузер ещё считает панель невидимой и не даёт фокус её инпуту -
                // ждём один кадр, чтобы стиль реально применился, и только потом фокусируемся
                if (searchInput) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            searchInput.focus();
                        });
                    });
                }
            });
        }

        // пункт "Поиск" в таб-баре внизу (на всех страницах) должен открывать ту же модалку
        // поиска сразу с фокусом в инпуте - как баннерный инпут на главной, тем же приёмом
        var navSearchBtn = document.getElementById('navSearchBtn');
        if (navSearchBtn && searchPanel) {
            navSearchBtn.addEventListener('click', function () {
                var key = window.__pageFilterKey || 'projects';
                if (typeof window.__syncTabGroup === 'function') {
                    window.__syncTabGroup(searchTabsWrap, key);
                }
                updateSearchCollections(key);
                openSearchPanel();
                if (searchInput) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            searchInput.focus();
                        });
                    });
                }
            });
            navSearchBtn.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navSearchBtn.click();
                }
            });
        }

        if (searchPanelFilterBtn) {
            searchPanelFilterBtn.addEventListener('click', function (e) {
                // КЛЮЧЕВОЙ ФИКС: это <a href=""> без id, раньше мой обработчик на него не вешался
                // (искал несуществующий #searchPanelFilterBtn), поэтому срабатывал переход по пустому href,
                // то есть обычная перезагрузка текущей страницы - это и воспринималось как "снова главная"
                e.preventDefault();

                var key = currentSearchTab();

                window.__searchQuery = window.__searchQuery || { companies: '', projects: '', services: '', products: '' };
                window.__searchQuery[key] = searchInput ? searchInput.value.trim() : '';

                // помечаем, что фильтры открыты из поиска - "Применить" не должен сразу
                // уводить на страницу каталога, см. window.__filtersOpenedFromSearch
                window.__filtersOpenedFromSearch = true;

                // поиск НЕ закрываем - оставляем его активным прямо под фильтрами (у поиска
                // ниже z-index, см. .filters_panel.search_panel в style.css), тогда когда
                // фильтры позже закроются назад в поиск, под ними уже готовый, отрисованный
                // экран поиска - без промежуточного кадра с хиро-баннером и без повторной
                // анимации открытия поиска (см. closeAllPanelsMaybeReturnToSearch)
                if (typeof window.openPanelByKey === 'function') window.openPanelByKey(key);

                if (window.__filterPanels && window.__filterPanels[key]) {
                    window.__filterPanels[key].renderApplied();
                }
            });
        }

        function openSearchPanel() {
            if (typeof window.closeAllPanels === 'function') window.closeAllPanels();
            searchPanel.classList.add('active');
            document.body.classList.add('filters-open');
            // на случай возврата из панели фильтров - подтягиваем актуальные применённые фильтры
            renderSearchAppliedChips();
        }
        function closeSearchPanel() {
            searchPanel.classList.remove('active');
            document.body.classList.remove('filters-open');
        }
        // используется пунктом "Поиск" в полноэкранном мобильном меню (см. mobile menu init)
        window.__openSearchPanel = openSearchPanel;
        searchPanel.addEventListener('filters:close', closeSearchPanel);

        // иконка фильтра в самом баннере на главной (открывает фильтр проектов, минуя поиск) -
        // тоже <a href=""> без preventDefault нигде, кроме уже существующих ранних обработчиков .filter__btn

        // --- строка поиска/фильтра прямо в шапке списка (projects.html / companies.html),
        // когда на этой же странице ЕСТЬ модалка поиска #searchPanel ---
        // это третий, отдельный экземпляр .banner_filter__btm - не баннер на главной и не сам #searchPanel
        document.querySelectorAll('.banner_filter__btm').forEach(function (row) {
            if (row.closest('#searchPanel')) return;
            if (row.closest('.banner_main')) return;

            var listInput = row.querySelector('input.filter_input__button');
            var listFilterBtn = row.querySelector('a.icon_btn');
            var listSearchBtn = row.querySelector('a.search_btn');

            // значок поиска в шапке каталога не должен выглядеть отключённым по умолчанию
            if (listSearchBtn) listSearchBtn.classList.remove('search_btn_disabled');

            // сама кнопка поиска показывается только когда в поле реально что-то введено -
            // до этого там просто пустая строка + значок фильтра, без лишней синей кнопки
            if (listSearchBtn && listInput) {
                listSearchBtn.hidden = listInput.value.trim().length === 0;
                listInput.addEventListener('input', function () {
                    listSearchBtn.hidden = listInput.value.trim().length === 0;
                });
            }

            if (listFilterBtn) {
                listFilterBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    var key = window.__pageFilterKey || 'projects';
                    // значок фильтра прямо в шапке каталога - это не поиск, "Применить" здесь
                    // должен вести себя как обычно
                    window.__filtersOpenedFromSearch = false;
                    if (typeof window.openPanelByKey === 'function') window.openPanelByKey(key);
                });
            }

            if (listSearchBtn) {
                listSearchBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (listInput && searchInput) {
                        searchInput.value = listInput.value;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                    openSearchPanel();
                    if (searchInput) searchInput.focus();
                });
            }

            if (listInput) {
                listInput.addEventListener('keydown', function (e) {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    if (searchInput) {
                        searchInput.value = listInput.value;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                    doSearch();
                });
            }
        });
    } catch (err) {
        console.error('search panel init:', err);
    }
});

// --- та же строка поиска/фильтра в шапке списка каталога (companies.html/products.html/
// projects.html/services.html) - это отдельная строка от инпута ВНУТРИ модалки #searchPanel,
// поэтому раньше вся эта инициализация просто пропускалась целиком, если модалка есть хоть
// где-то на странице; теперь модалка есть на каждой странице, так что пропускаем по каждой
// строке отдельно - только ту, что внутри самой модалки (.search_panel), она уже
// инициализируется своим кодом выше
document.addEventListener('DOMContentLoaded', () => {
    try {
        document.querySelectorAll('.banner_filter__btm').forEach(function (row) {
            if (row.closest('.banner_main')) return;
            if (row.closest('.search_panel')) return; // строка внутри модалки - обработана блоком выше

            var listInput = row.querySelector('input.filter_input__button');
            var listFilterBtn = row.querySelector('a.icon_btn');
            var listSearchBtn = row.querySelector('a.search_btn');

            // значок поиска в шапке каталога не должен выглядеть отключённым по умолчанию
            if (listSearchBtn) listSearchBtn.classList.remove('search_btn_disabled');

            // сама кнопка поиска показывается только когда в поле реально что-то введено -
            // до этого там просто пустая строка + значок фильтра, без лишней синей кнопки
            if (listSearchBtn && listInput) {
                listSearchBtn.hidden = listInput.value.trim().length === 0;
                listInput.addEventListener('input', function () {
                    listSearchBtn.hidden = listInput.value.trim().length === 0;
                });
            }

            if (listFilterBtn) {
                listFilterBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    var key = window.__pageFilterKey || 'projects';
                    // значок фильтра прямо в шапке каталога - это не поиск, "Применить" здесь
                    // должен вести себя как обычно
                    window.__filtersOpenedFromSearch = false;
                    if (typeof window.openPanelByKey === 'function') window.openPanelByKey(key);
                });
            }

            function runInlineSearch() {
                if (!listInput) return;
                var term = listInput.value.trim();
                if (!term) return;
                var key = window.__pageFilterKey || 'projects';
                var meta = (window.__filterKeyMeta && window.__filterKeyMeta[key]) || { panelId: 'filtersPanel', page: 'projects.html' };

                try {
                    var srcPanel = document.getElementById(meta.panelId);
                    var state = (srcPanel && typeof window.__serializePanelState === 'function')
                        ? window.__serializePanelState(srcPanel)
                        : { category: null, chips: [], selects: {}, ranges: [], checkboxes: [] };
                    state.searchQuery = term;
                    sessionStorage.setItem('filterState:' + key, JSON.stringify(state));
                } catch (err) {
                    console.error('save filter state (inline search):', err);
                }

                window.location.href = meta.page + '?q=' + encodeURIComponent(term);
            }

            if (listSearchBtn) {
                listSearchBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    runInlineSearch();
                });
            }

            if (listInput) {
                listInput.addEventListener('keydown', function (e) {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    runInlineSearch();
                });
            }
        });
    } catch (err) {
        console.error('page filter/search icons (no searchPanel) init:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        // полноэкранное мобильное меню (бургер) - раньше кнопка #burgerBtn вообще ничего не
        // открывала, JS для неё не было совсем
        var burgerBtn = document.getElementById('burgerBtn');
        var mobileMenu = document.getElementById('mobileMenu');
        if (!burgerBtn || !mobileMenu) return;

        var menuCloseBtn = mobileMenu.querySelector('[data-mobile-menu-close]');

        function closeMobileMenu() {
            burgerBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
        function openMobileMenu() {
            if (typeof window.__updateFavoriteBadges === 'function') window.__updateFavoriteBadges();
            if (typeof window.__updateCompareBadges === 'function') window.__updateCompareBadges();
            burgerBtn.classList.add('active');
            mobileMenu.classList.add('active');
            document.body.classList.add('modal-open');
        }

        burgerBtn.addEventListener('click', function () {
            if (mobileMenu.classList.contains('active')) closeMobileMenu(); else openMobileMenu();
        });
        if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeMobileMenu);

        // "Поиск" в меню закрывает само меню и открывает уже существующую модалку поиска
        var menuSearchBtn = mobileMenu.querySelector('[data-mobile-menu-search]');
        if (menuSearchBtn) {
            menuSearchBtn.addEventListener('click', function () {
                closeMobileMenu();
                if (typeof window.__openSearchPanel === 'function') window.__openSearchPanel();
            });
        }

        // остальные иконки (Профиль/Избранное/Сравнение) - обычные ссылки на страницы,
        // меню перед переходом просто закрываем
        mobileMenu.querySelectorAll('.mobile-menu__icons a').forEach(function (link) {
            link.addEventListener('click', closeMobileMenu);
        });
    } catch (err) {
        console.error('mobile menu init:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        // общий механизм [data-modal-open]/[data-modal]/[data-modal-close] изначально был только
        // под .registration_modal (регистрация/вход) - теперь им же открываются и полноэкранные
        // .filters_panel[data-modal] (модалки профиля "Личные данные"/"Безопасность"), чтобы не
        // городить второй похожий обработчик
        var modals = document.querySelectorAll('.registration_modal[data-modal], .filters_panel[data-modal]');
        if (!modals.length) return;

        var backdrop = document.querySelector('.registration_modal__backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'registration_modal__backdrop';
            document.body.appendChild(backdrop);
        }

        function closeAll() {
            modals.forEach(function (modal) { modal.classList.remove('active'); });
            backdrop.classList.remove('active');
            document.body.classList.remove('modal-open');
        }

        function openModal(name) {
            var modal = document.querySelector('.registration_modal[data-modal="' + name + '"], .filters_panel[data-modal="' + name + '"]');
            if (!modal) return;
            closeAll();
            modal.classList.add('active');
            backdrop.classList.add('active');
            document.body.classList.add('modal-open');
        }

        document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(btn.dataset.modalOpen);
            });
            // .profile_section__content/.settings_card - обычные div, а не ссылки/кнопки,
            // поэтому открытие модалки по Enter/Space вешаем отдельно (доступность)
            if (btn.matches('[role="button"]')) {
                btn.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openModal(btn.dataset.modalOpen);
                    }
                });
            }
        });

        modals.forEach(function (modal) {
            var closeBtns = modal.querySelectorAll('[data-modal-close], .registration_modal__close');
            closeBtns.forEach(function (closeBtn) { closeBtn.addEventListener('click', closeAll); });
        });

        backdrop.addEventListener('click', closeAll);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAll();
        });
    } catch (err) {
        console.error('registration modal init:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        // ---- профиль: "Личные данные" - чек "сохранить" активен только когда форма реально
        // менялась (нативный атрибут disabled, а не самодельный класс - серый/тёмный цвет
        // галочки регулируется через :disabled в CSS)
        var personalDataModal = document.getElementById('personalDataModal');
        if (personalDataModal) {
            var saveBtn = document.getElementById('personalDataSave');
            var nameInput = document.getElementById('personalDataName');
            var phoneInput = document.getElementById('personalDataPhone');
            var emailInput = document.getElementById('personalDataEmail');

            function markPersonalDataDirty() {
                if (saveBtn) saveBtn.disabled = false;
            }
            [nameInput, phoneInput, emailInput].forEach(function (input) {
                if (input) input.addEventListener('input', markPersonalDataDirty);
            });

            if (saveBtn) {
                saveBtn.addEventListener('click', function () {
                    if (saveBtn.disabled) return;
                    // реального бэкенда нет - просто переносим введённое имя на страницу профиля
                    if (nameInput && nameInput.value.trim()) {
                        var profileNameEl = document.querySelector('.profile_section__content h3');
                        if (profileNameEl) profileNameEl.textContent = nameInput.value.trim();
                    }
                    saveBtn.disabled = true;
                });
            }

            // загрузка фото - реальный выбор файла + превью (без отправки на сервер)
            var avatarInput = document.getElementById('personalDataAvatarInput');
            var avatarImg = document.getElementById('personalDataAvatarImg');
            if (avatarInput && avatarImg) {
                avatarInput.addEventListener('change', function () {
                    var file = avatarInput.files && avatarInput.files[0];
                    if (!file) return;
                    var url = URL.createObjectURL(file);
                    avatarImg.src = url;
                    // тот же аватар обновляем и в самой карточке профиля
                    var profileImg = document.querySelector('.profile_section__content img');
                    if (profileImg) profileImg.src = url;
                    markPersonalDataDirty();
                });
            }
        }

        // ---- профиль: "Безопасность" - список настроек и форма смены пароля внутри одной
        // и той же модалки, переключаются как шаги (data-security-step), без второй модалки
        var securityModal = document.getElementById('securityModal');
        if (securityModal) {
            var securityTitle = document.getElementById('securityModalTitle');
            var securityBackBtn = document.getElementById('securityBackBtn');
            var securitySteps = securityModal.querySelectorAll('[data-security-step]');

            function showSecurityStep(name) {
                securitySteps.forEach(function (step) {
                    step.classList.toggle('active', step.dataset.securityStep === name);
                });
                securityModal.dataset.step = name;
                if (securityTitle) {
                    securityTitle.textContent = name === 'password' ? 'Изменить пароль' : 'Безопасность';
                }
            }

            securityModal.querySelectorAll('[data-security-goto]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    showSecurityStep(btn.dataset.securityGoto);
                });
                btn.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        showSecurityStep(btn.dataset.securityGoto);
                    }
                });
            });

            if (securityBackBtn) {
                securityBackBtn.addEventListener('click', function () {
                    if (securityModal.dataset.step === 'password') {
                        showSecurityStep('list');
                        return;
                    }
                    // на первом шаге "назад" закрывает саму модалку
                    securityModal.classList.remove('active');
                    var backdrop = document.querySelector('.registration_modal__backdrop');
                    if (backdrop) backdrop.classList.remove('active');
                    document.body.classList.remove('modal-open');
                });
            }

            // при каждом открытии модалки "Безопасность" с профиля возвращаемся на список
            document.querySelectorAll('[data-modal-open="security"]').forEach(function (btn) {
                btn.addEventListener('click', function () { showSecurityStep('list'); });
            });

            var passwordForm = document.getElementById('changePasswordForm');
            if (passwordForm) {
                var newPassword = document.getElementById('newPassword');
                var newPasswordRepeat = document.getElementById('newPasswordRepeat');
                var errorEl = document.getElementById('changePasswordError');
                passwordForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    var matches = !!(newPassword && newPasswordRepeat && newPassword.value && newPassword.value === newPasswordRepeat.value);
                    if (errorEl) errorEl.classList.toggle('active', !matches);
                    if (!matches) return;
                    passwordForm.reset();
                    showSecurityStep('list');
                });
            }
        }
    } catch (err) {
        console.error('profile modals init:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        var nav = document.querySelector('.banner_mobile_nav');
        if (!nav) return;

        var lastScrollY = window.scrollY;
        var ticking = false;
        var threshold = 8;   // игнорировать микро-скролл
        var topOffset = 80;  // у самого верха всегда показываем

        function onScroll() {
            var currentScrollY = window.scrollY;
            var delta = currentScrollY - lastScrollY;

            if (currentScrollY <= topOffset) {
                nav.classList.remove('banner_mobile_nav--hidden');
            } else if (Math.abs(delta) > threshold) {
                if (delta > 0) {
                    nav.classList.add('banner_mobile_nav--hidden');
                } else {
                    nav.classList.remove('banner_mobile_nav--hidden');
                }
            }

            lastScrollY = currentScrollY;
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(onScroll);
                ticking = true;
            }
        }, { passive: true });
    } catch (err) {
        console.error('mobile nav scroll init:', err);
    }
});

setTimeout(function () {
    document.body.classList.remove('is-loading');
}, 5000);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-sorting]').forEach((wrapper) => {
        var toggleBtn = wrapper.querySelector('[data-sorting-toggle]');
        var modal = wrapper.querySelector('.sorting__modal');
        var label = wrapper.querySelector('[data-sorting-label]');
        var items = wrapper.querySelectorAll('.sorting__item');
        if (!toggleBtn || !modal) return;

        function closeSorting() {
            wrapper.classList.remove('active');
            modal.classList.remove('active');
        }

        function openSorting() {
            document.querySelectorAll('.sorting_wrapper.active').forEach(function (openWrapper) {
                if (openWrapper !== wrapper) {
                    openWrapper.classList.remove('active');
                    var openModal = openWrapper.querySelector('.sorting__modal');
                    if (openModal) openModal.classList.remove('active');
                }
            });
            wrapper.classList.add('active');
            modal.classList.add('active');
        }

        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            modal.classList.contains('active') ? closeSorting() : openSorting();
        });

        items.forEach(function (item) {
            item.addEventListener('click', function () {
                items.forEach(function (i) { i.classList.remove('active'); });
                item.classList.add('active');
                var itemText = item.querySelector('p');
                if (label && itemText) label.textContent = itemText.textContent;
                closeSorting();

                // избранное: этот же выпадающий список (как "Все категории"/сортировка) используется,
                // чтобы переключать "Проекты домов" / "Компании" - у таких пунктов есть data-tab,
                // переключаем панели тем же приёмом data-tab/data-tab-panel, что и в .about_card_tabs
                var target = item.dataset.tab;
                if (target) {
                    var newActivePanel = null;
                    document.querySelectorAll('[data-tab-panel]').forEach(function (panel) {
                        var isActive = panel.dataset.tabPanel === target;
                        panel.classList.toggle('active', isActive);
                        // управляем нативным атрибутом "hidden" отдельно от класса .active -
                        // так переключение работает, даже если для этих панелей ещё нет
                        // отдельного CSS-правила показа/скрытия по классу .active
                        panel.hidden = !isActive;
                        panel.classList.remove('tab_panel--in');
                        if (isActive) newActivePanel = panel;
                    });

                    // плавное появление новой панели - тот же приём двойного requestAnimationFrame,
                    // что уже используется для data-action="more-tech" (chip_reveal/chip_reveal--in)
                    if (newActivePanel) {
                        requestAnimationFrame(function () {
                            requestAnimationFrame(function () {
                                newActivePanel.classList.add('tab_panel--in');
                            });
                        });
                    }
                }
            });
        });

        // если у пунктов списка есть data-tab - это переключатель "Проекты/Компании" в избранном,
        // а не обычная сортировка. Считаем реальное количество карточек в каждой панели и
        // подставляем его в подпись пункта и в текст самого триггера (для активного пункта)
        items.forEach(function (item) {
            var target = item.dataset.tab;
            if (!target) return;
            var panel = document.querySelector('[data-tab-panel="' + target + '"]');
            if (!panel) return;
            var caption = item.querySelector('p');
            if (!caption) return;
            var count = panel.querySelectorAll('.popular_card').length;
            var baseLabel = caption.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
            caption.textContent = baseLabel + ' (' + count + ')';
            if (item.classList.contains('active') && label) {
                label.textContent = caption.textContent;
            }
        });
    });

    document.addEventListener('click', function (e) {
        document.querySelectorAll('.sorting_wrapper.active').forEach(function (wrapper) {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('active');
                var modal = wrapper.querySelector('.sorting__modal');
                if (modal) modal.classList.remove('active');
            }
        });
    });
});

document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action="more-tech"]');
    if (!btn) return;

    const group = btn.closest('.chip_group');
    if (!group) return;

    const hidden = group.querySelectorAll('.chip_hidden');
    hidden.forEach(chip => {
        chip.classList.remove('chip_hidden');
        chip.classList.add('chip_reveal');
    });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            hidden.forEach(chip => chip.classList.add('chip_reveal--in'));
        });
    });

    btn.remove();
});

document.addEventListener('click', function (e) {
    const btn = e.target.closest('.chip_group button');
    if (!btn || btn.dataset.action) return;

    const group = btn.closest('.chip_group');
    if (!group) return;

    group.querySelectorAll('.chip_active').forEach(el => {
        el.classList.remove('chip_active', 'active');
        el.classList.add('chip_inactive__v2');
    });

    btn.classList.remove('chip_inactive__v2');
    btn.classList.add('chip_active', 'active');
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        var companiesPanel = document.getElementById('filtersPanelCompanies');
        if (!companiesPanel) return;

        var categoryGroup = companiesPanel.querySelector('[data-group="category"]');
        if (!categoryGroup) return;

        function applyCompaniesCategory(category) {
            var changed = false;

            companiesPanel.querySelectorAll('[data-category-field="technology"]').forEach(function (field) {
                var shouldHide = category !== 'construction';
                if (shouldHide && !field.hidden) {
                    field.querySelectorAll('.chip_active').forEach(function (btn) {
                        btn.classList.remove('chip_active');
                        btn.classList.add('chip_inactive__v2');
                        changed = true;
                    });
                }
                field.hidden = shouldHide;
            });

            companiesPanel.querySelectorAll('[data-category-only]').forEach(function (block) {
                var shouldHide = block.dataset.categoryOnly !== category;
                if (shouldHide && !block.hidden) {
                    block.querySelectorAll('.chip_active').forEach(function (btn) {
                        btn.classList.remove('chip_active');
                        btn.classList.add('chip_inactive__v2');
                        changed = true;
                    });
                }
                block.hidden = shouldHide;
            });

            if (changed && window.__filterPanels && window.__filterPanels.companies) {
                window.__filterPanels.companies.renderApplied();
            }
        }

        function currentCategory() {
            var active = categoryGroup.querySelector('button.chip_active');
            return active ? (active.dataset.category || null) : null;
        }

        document.addEventListener('click', function (e) {
            if (!e.target.closest('#filtersPanelCompanies [data-group="category"] button')) return;
            applyCompaniesCategory(currentCategory());
        });

        applyCompaniesCategory(currentCategory());
    } catch (err) {
        console.error('companies category filters init:', err);
    }
});

document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-action="compare-specs-toggle"]');
    if (!toggle) return;
    toggle.closest('.compare_specs_wrap')?.classList.toggle('is-collapsed');
});

try {
    (function () {
        'use strict';
        var COMPARE_KEY = 'compareItems';

        function getCompareItems() {
            try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]'); } catch (e) { return []; }
        }
        function saveCompareItems(list) {
            try { localStorage.setItem(COMPARE_KEY, JSON.stringify(list)); } catch (e) { console.error('save compare items:', e); }
        }
        window.__getCompareItems = getCompareItems;
        window.__saveCompareItems = saveCompareItems;

        // настоящих характеристик (площадь, фундамент, остекление и т.п.) для произвольного
        // проекта у нас нет - они вручную прописаны только для 3 демо-карточек на compare.html.
        // поэтому с любой другой страницы в сравнение переносим то, что реально есть на карточке
        // (фото/название/подпись/цена), а строки характеристик на compare.html для неё будут "—"
        function extractCardData(card) {
            var media = card.querySelector('.popular_card__media');
            var img = media ? (media.querySelector('img:not(.popular_card__logo)') || media.querySelector('img')) : null;
            var titleEl = card.querySelector('.company_name h3, .popular_card__bottom_left > h3, h3');
            var subtitleEl = card.querySelector('.popular_card__top_left .micro_medium');
            var priceEl = card.querySelector('.popular_card__price');
            return {
                image: img ? img.getAttribute('src') : '',
                alt: titleEl ? titleEl.textContent.trim() : '',
                title: titleEl ? titleEl.textContent.trim() : '',
                subtitle: subtitleEl ? subtitleEl.textContent.trim() : '',
                price: priceEl ? priceEl.textContent.trim() : ''
            };
        }
        // тот же разбор карточки переиспользуется избранным (см. favorite items init) -
        // чтобы не парсить .popular_card дважды двумя разными кусками кода
        window.__extractCardData = extractCardData;

        function updateCompareBadges() {
            var count = getCompareItems().length;
            document.querySelectorAll('[data-compare-count]').forEach(function (el) {
                el.textContent = count;
                el.hidden = count === 0;
            });
        }
        window.__updateCompareBadges = updateCompareBadges;
        document.addEventListener('DOMContentLoaded', updateCompareBadges);

        // пункт "Сравнить" в card_more__modal вызывает это - добавляет/убирает карточку
        // из сравнения (с сохранением в localStorage, чтобы дожило до перехода на compare.html)
        window.__toggleCompareItem = function (card) {
            var items = getCompareItems();
            var existingId = card.dataset.compareTempId;
            var idx = existingId ? items.findIndex(function (it) { return it.id === existingId; }) : -1;

            if (idx !== -1) {
                items.splice(idx, 1);
                saveCompareItems(items);
                delete card.dataset.compareTempId;
                if (typeof window.__showFavoritesToast === 'function') window.__showFavoritesToast('compare-removed', card);
            } else {
                var data = extractCardData(card);
                data.id = 'c' + Date.now() + Math.floor(Math.random() * 1000);
                items.push(data);
                saveCompareItems(items);
                card.dataset.compareTempId = data.id;
                if (typeof window.__showFavoritesToast === 'function') window.__showFavoritesToast('compare-added', card);
            }
            updateCompareBadges();
        };

        function labelForRow(row) {
            var firstLabel = row.querySelector('.compare_spec_cell .micro');
            return firstLabel ? firstLabel.textContent.trim() : '';
        }

        function buildComparePlaceholderCard(item) {
            var wrap = document.createElement('div');
            wrap.className = 'compare_card flex_column';
            wrap.dataset.compareId = item.id;
            wrap.innerHTML =
                '<div class="compare_card__media">' +
                    (item.image ? '<img src="' + item.image + '" alt="' + (item.alt || '') + '">' : '') +
                    '<button type="button" class="compare_card__remove" aria-label="Удалить из сравнения" data-action="compare-remove">' +
                        '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M3 4.5H15M7.5 8V12.5M10.5 8V12.5M4 4.5L4.75 14.25C4.79 14.83 5.28 15.25 5.86 15.25H12.14C12.72 15.25 13.21 14.83 13.25 14.25L14 4.5M6.5 4.5V2.75C6.5 2.34 6.84 2 7.25 2H10.75C11.16 2 11.5 2.34 11.5 2.75V4.5" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div class="popular_card__bottom_left compare_card_content">' +
                    '<div class="company_name flex_row"><h3 class="micro_medium">' + (item.title || '') + '</h3></div>' +
                    (item.subtitle ? '<div class="popular_card__top_left micro_medium"><p class="micro_medium">' + item.subtitle + '</p></div>' : '') +
                '</div>' +
                '<div class="compare_card__block flex_column">' +
                    '<p class="micro">Стоимость</p>' +
                    '<p class="caption_medium">' + (item.price || '—') + '</p>' +
                '</div>';
            return wrap;
        }

        function injectCompareItem(item) {
            var cardsWrap = document.querySelector('.compare_cards');
            if (!cardsWrap || cardsWrap.querySelector('.compare_card[data-compare-id="' + item.id + '"]')) return;
            cardsWrap.appendChild(buildComparePlaceholderCard(item));

            // те же самые строки характеристик, что уже есть на странице (площадь, фундамент...) -
            // просто добавляем в каждую ещё одну ячейку с тем же подписанным лейблом и "—" вместо значения
            document.querySelectorAll('.compare_spec_row[data-spec]').forEach(function (row) {
                if (row.querySelector('.compare_spec_cell[data-compare-id="' + item.id + '"]')) return;
                var cell = document.createElement('div');
                cell.className = 'compare_spec_cell flex_column';
                cell.dataset.compareId = item.id;
                cell.innerHTML = '<p class="micro">' + labelForRow(row) + '</p><p class="caption_medium">—</p>';
                row.appendChild(cell);
            });
        }

        // на странице сравнения (compare.html, определяется по наличию .compare_cards) подмешиваем
        // к статичным демо-карточкам те, что реально добавлены с других страниц через "Сравнить".
        // делаем это здесь, ДО первого compareUpdateRow()/buildStickyBar() ниже по файлу, чтобы
        // добавленные карточки сразу попали и в подсветку различий, и в закреплённую панель
        if (document.querySelector('.compare_cards')) {
            getCompareItems().forEach(injectCompareItem);
        }
    })();
} catch (err) {
    console.error('compare persistence init:', err);
}

try {
    (function () {
        'use strict';
        // общее хранилище избранного (по аналогии с compareItems выше) - раньше лайк был чисто
        // визуальным (.popular_card__like.active), без общего списка, поэтому бейдж "Избранное"
        // в мобильном меню посчитать было нечем
        var FAVORITES_KEY = 'favoriteItems';

        function getFavoriteItems() {
            try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch (e) { return []; }
        }
        function saveFavoriteItems(list) {
            try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch (e) { console.error('save favorite items:', e); }
        }
        window.__getFavoriteItems = getFavoriteItems;
        window.__saveFavoriteItems = saveFavoriteItems;

        // своего id у карточек нет - используем название (как и поиск в модалке использует
        // название для дедупликации), иначе один и тот же проект на разных страницах считался бы
        // разными карточками
        function favoriteIdFor(card) {
            var titleEl = card.querySelector('.company_name h3, .popular_card__bottom_left > h3, h3');
            var title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
            return title ? 'f:' + title : null;
        }
        window.__favoriteIdFor = favoriteIdFor;

        function updateFavoriteBadges() {
            var count = getFavoriteItems().length;
            document.querySelectorAll('[data-favorites-count]').forEach(function (el) {
                el.textContent = count;
                el.hidden = count === 0;
            });
        }
        window.__updateFavoriteBadges = updateFavoriteBadges;

        // при загрузке страницы отмечаем .active у тех карточек, что уже лежат в избранном -
        // чтобы состояние сердечка не зависело от того, на какой странице открыли проект
        function syncFavoriteLikeButtons(root) {
            var items = getFavoriteItems();
            if (!items.length) return;
            var ids = {};
            items.forEach(function (it) { ids[it.id] = true; });
            (root || document).querySelectorAll('.popular_card').forEach(function (card) {
                var likeBtn = card.querySelector('.popular_card__like');
                var id = favoriteIdFor(card);
                if (likeBtn && id && ids[id]) likeBtn.classList.add('active');
            });
        }
        window.__syncFavoriteLikeButtons = syncFavoriteLikeButtons;

        // вызывается кликом по самому сердечку (.popular_card__like) - см. initCard в блоке
        // "favorites toast init" выше по файлу
        window.__toggleFavoriteItem = function (card, isLiked) {
            var id = favoriteIdFor(card);
            if (!id) return;
            var items = getFavoriteItems();
            var idx = items.findIndex(function (it) { return it.id === id; });
            if (isLiked) {
                if (idx === -1) {
                    var data = typeof window.__extractCardData === 'function' ? window.__extractCardData(card) : {};
                    data.id = id;
                    items.push(data);
                    saveFavoriteItems(items);
                }
            } else if (idx !== -1) {
                items.splice(idx, 1);
                saveFavoriteItems(items);
            }
            updateFavoriteBadges();
        };

        document.addEventListener('DOMContentLoaded', function () {
            syncFavoriteLikeButtons(document);
            updateFavoriteBadges();
        });
    })();
} catch (err) {
    console.error('favorite items init:', err);
}

function compareUpdateRow(row) {
    const cells = Array.from(row.querySelectorAll('.compare_spec_cell'));
    if (!cells.length) return;
    const baseline = cells[0].querySelector('.caption_medium')?.textContent.trim();
    let hasDiff = false;
    cells.forEach((cell, i) => {
        const value = cell.querySelector('.caption_medium')?.textContent.trim();
        const differs = i > 0 && value !== baseline;
        cell.classList.toggle('compare_spec_cell--diff', differs);
        if (differs) hasDiff = true;
    });
    row.dataset.hasDiff = hasDiff ? '1' : '0';
}

document.querySelectorAll('.compare_spec_row').forEach(compareUpdateRow);

const diffToggle = document.getElementById('compareDiffToggle');
if (diffToggle) {
    diffToggle.addEventListener('change', function () {
        document.querySelectorAll('.compare_spec_row').forEach(row => {
            row.hidden = diffToggle.checked && row.dataset.hasDiff !== '1';
        });
    });
}

document.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-action="compare-remove"]');
    if (!removeBtn) return;

    const card = removeBtn.closest('.compare_card');
    if (!card) return;
    const id = card.dataset.compareId;

    card.remove();
    document.querySelectorAll(`.compare_spec_cell[data-compare-id="${id}"]`).forEach(cell => cell.remove());
    document.querySelectorAll('.compare_spec_row').forEach(compareUpdateRow);
    buildStickyBar();

    // если это карточка, добавленная через "Сравнить" с другой страницы (а не статичная демо-карточка) -
    // убираем её и из localStorage, иначе она снова появится при следующей загрузке compare.html
    if (typeof window.__getCompareItems === 'function' && typeof window.__saveCompareItems === 'function') {
        var storedItems = window.__getCompareItems().filter(function (it) { return it.id !== id; });
        window.__saveCompareItems(storedItems);
    }
    if (typeof window.__updateCompareBadges === 'function') window.__updateCompareBadges();

    const countEl = document.querySelector('.filter_bage');
    if (countEl) countEl.textContent = document.querySelectorAll('.compare_card').length;
});

document.addEventListener('click', (e) => {
    const clearBtn = e.target.closest('[data-action="compare-clear"]');
    if (!clearBtn) return;
    document.querySelectorAll('.compare_card__remove').forEach(btn => btn.click());
});

function buildStickyBar() {
    const scrollEl = document.getElementById('compareStickyBarScroll');
    if (!scrollEl) return;
    scrollEl.innerHTML = '';

    document.querySelectorAll('.compare_card').forEach(card => {
        const id = card.dataset.compareId;
        const imgSrc = card.querySelector('.compare_card__media img')?.getAttribute('src') || '';
        const name = card.querySelector('.compare_card_content h3')?.textContent.trim() || '';
        const subtitle = card.querySelector('.popular_card__top_left .micro_medium')?.textContent.trim() || '';

        const mini = document.createElement('div');
        mini.className = 'compare_sticky_card';
        mini.dataset.compareId = id;
        mini.innerHTML = `
                    <img src="${imgSrc}" alt="${name}" class="compare_sticky_card__img">
                    <div class="compare_sticky_card__info">
                        <p class="micro_medium">${name}</p>
                        <p class="micro">${subtitle}</p>
                    </div>
                `;
        scrollEl.appendChild(mini);
    });
}

buildStickyBar();

const stickyBar = document.getElementById('compareStickyBar');
const firstCardMedia = document.querySelector('.compare_cards .compare_card:first-child .compare_card__media');

if (stickyBar && firstCardMedia) {
    let stickyTicking = false;

    function updateStickyBar() {
        const rect = firstCardMedia.getBoundingClientRect();
        stickyBar.classList.toggle('is-visible', rect.bottom <= 0);
        stickyTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (stickyTicking) return;
        stickyTicking = true;
        requestAnimationFrame(updateStickyBar);
    }, { passive: true });

    updateStickyBar();
} else {
    console.warn('compare: не найден stickyBar или firstCardMedia — проверьте разметку карточек');
}


// --- иконка поиска (слева) и крестик очистки (справа) для всех инпутов "Найти..." ---
// работает через один общий селектор .banner_filter__btm input.filter_input__button,
// поэтому переиспользуется на index.html (баннер), в модалке поиска (#searchPanel) и
// в шапках списков (companies/products/projects/services) без правки разметки в каждом файле.
document.addEventListener('DOMContentLoaded', () => {
    try {
        var SEARCH_ICON =
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<path d="M17.5 17.5L12.5001 12.5M14.1667 8.33333C14.1667 11.555 11.555 14.1667 8.33333 14.1667C5.11168 14.1667 2.5 11.555 2.5 8.33333C2.5 5.11168 5.11168 2.5 8.33333 2.5C11.555 2.5 14.1667 5.11168 14.1667 8.33333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>';
        var CLEAR_ICON =
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>';

        document.querySelectorAll('.banner_filter__btm input.filter_input__button').forEach(function (input) {
            if (input.closest('.search_field')) return; // уже обёрнут (на всякий случай)

            var wrap = document.createElement('div');
            wrap.className = 'search_field';

            var icon = document.createElement('span');
            icon.className = 'search_field__icon';
            icon.innerHTML = SEARCH_ICON;

            var clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'search_field__clear';
            clearBtn.setAttribute('aria-label', 'Очистить поиск');
            clearBtn.innerHTML = CLEAR_ICON;

            input.classList.add('search_field__input');
            input.insertAdjacentElement('beforebegin', wrap);
            wrap.appendChild(icon);
            wrap.appendChild(input);
            wrap.appendChild(clearBtn);

            function sync() {
                wrap.classList.toggle('has-value', input.value.length > 0);
            }
            sync();

            input.addEventListener('input', sync);

            clearBtn.addEventListener('click', function (e) {
                e.preventDefault();
                input.value = '';
                sync();
                input.focus();
                // существующая логика поиска/фильтрации слушает 'input' на этих же полях -
                // так очистка сразу же сбрасывает результаты/подсказки, как и обычная печать
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    } catch (err) {
        console.error('search field icon/clear init:', err);
    }
});

// --- клик по карточке (.popular_card) ведёт на страницу проекта/товара/компании ---
// ссылку не разбрасываем по разметке заново на каждой странице - берём её из того, что в
// карточке уже есть (картинка почти везде и так обёрнута в <a href="...">, иначе - первая
// ссылка в меню "..." типа "О компании"/"О проекте"), и переиспользуем в двух местах:
// невидимой оверлей-ссылке под текстом карточки и в тап-навигации по самому фото ниже
function getCardHref(card) {
    var media = card.querySelector('.popular_card__media');
    if (media) {
        // внутри .popular_card__media первой в разметке часто идёт декоративная ссылка
        // на источник рейтинга (<a href="#" class="popular_card_rating__source">), а не
        // сама карточка-фото - поэтому проверяем ВСЕ ссылки внутри media, а не только первую
        var mediaLinks = media.querySelectorAll('a[href]');
        for (var i = 0; i < mediaLinks.length; i++) {
            var href = (mediaLinks[i].getAttribute('href') || '').trim();
            if (href && href !== '#') return href;
        }
    }
    var moreLink = card.querySelector('.card_more__modal a[href]');
    if (moreLink) {
        var href2 = (moreLink.getAttribute('href') || '').trim();
        if (href2 && href2 !== '#') return href2;
    }
    return null;
}
window.__getCardHref = getCardHref;

// оверлей-ссылка занимает всю .popular_card__bottom_wrapper (от заголовка до цены), поэтому
// сама карточка визуально не меняется - html/css самой карточки не трогаем, просто кладём
// поверх текста прозрачную <a> (см. .popular_card__link/.popular_card__more в style.css,
// у кнопки "..." z-index выше, чтобы своё меню она продолжала открывать как раньше)
function initCardLinks(root) {
    (root || document).querySelectorAll('.popular_card').forEach(function (card) {
        if (card.dataset.cardLinked) return;
        var href = getCardHref(card);
        if (!href) return;
        card.dataset.cardLinked = '1';

        // не везде в разметке есть .popular_card__bottom_wrapper (старые карточки
        // 'Похожие товары/проекты', карточка компании на странице товара и т.п. верстают
        // низ просто как .popular_card__bottom > .popular_card__bottom_left) - оверлей в
        // этом случае кладём на .popular_card__bottom целиком, кнопка "..." (popular_card__more)
        // всё равно остаётся кликабельной сверху за счёт своего z-index
        var wrap = card.querySelector('.popular_card__bottom_wrapper') || card.querySelector('.popular_card__bottom');
        if (wrap && !wrap.querySelector('.popular_card__link')) {
            var link = document.createElement('a');
            link.href = href;
            link.className = 'popular_card__link';
            link.setAttribute('aria-label', 'Открыть карточку');
            wrap.insertBefore(link, wrap.firstChild);
        }
    });
}
window.initCardLinks = initCardLinks;

document.addEventListener('DOMContentLoaded', () => {
    try {
        initCardLinks(document);
    } catch (err) {
        console.error('card links init:', err);
    }
});

// --- реальный свайпер фото внутри карточек (.popular_card__media) вместо статичных точек ---
// дублируем единственное имеющееся фото под количество точек в разметке (обычно 4) и
// навешиваем Swiper: свайп/точки листают слайды, активная точка синхронизируется со слайдом.
// Работает на всех страницах, где карточки уже есть - без правки разметки в каждом файле.
function initCardMediaSwipers(root) {
    if (typeof Swiper === 'undefined') return;
    root = root || document;
    root.querySelectorAll('.popular_card__media').forEach(function (media) {
        if (media.dataset.gallerySwiper) return;

        var dotsWrap = media.querySelector('.popular_card__dots');
        if (!dotsWrap) return;
        // у карточек компаний точки скрыты через CSS (.companies .popular_card__dots) -
        // там всего одно фото/лого, свайпер там не нужен
        if (getComputedStyle(dotsWrap).display === 'none') return;

        var dots = Array.prototype.slice.call(dotsWrap.children).filter(function (el) {
            return el.tagName === 'SPAN';
        });
        if (dots.length < 2) return;

        // картинка почти везде лежит прямым потомком .popular_card__media, но местами
        // (например на главной, в "Популярных проектах") она обёрнута в <a href="...">,
        // поэтому ищем img на любой глубине, а не только среди прямых детей
        var mainImg = media.querySelector('img:not(.popular_card__logo)');
        if (!mainImg) return;

        media.dataset.gallerySwiper = '1';

        var swiperEl = document.createElement('div');
        swiperEl.className = 'popular_card__swiper swiper';
        var wrapperEl = document.createElement('div');
        wrapperEl.className = 'swiper-wrapper';
        swiperEl.appendChild(wrapperEl);

        dots.forEach(function () {
            var slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.appendChild(mainImg.cloneNode(true));
            wrapperEl.appendChild(slide);
        });

        mainImg.replaceWith(swiperEl);

        // тап по фото (не свайп) должен вести на страницу карточки, как и клик по тексту
        // ниже - swiper различает их сам и отдаёт 'tap' только для настоящего тапа без сдвига
        var cardForTap = media.closest('.popular_card');
        var tapHref = cardForTap ? getCardHref(cardForTap) : null;

        var swiper = new Swiper(swiperEl, {
            loop: true,
            speed: 350,
            on: {
                slideChange: function (sw) {
                    dots.forEach(function (d, i) {
                        d.classList.toggle('active', i === sw.realIndex);
                    });
                },
                tap: function () {
                    if (tapHref) window.location.href = tapHref;
                }
            }
        });

        dots.forEach(function (d, i) {
            d.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                swiper.slideToLoop(i);
            });
        });
    });
}
window.initCardMediaSwipers = initCardMediaSwipers;

document.addEventListener('DOMContentLoaded', () => {
    try {
        initCardMediaSwipers(document);
    } catch (err) {
        console.error('card media swiper init:', err);
    }
});

// на карточках с одним фото/лого (компании, товары) фото лежит в <a href="..."> прямо в
// разметке, но сама картинка position:absolute внутри .popular_card__media - у которой
// СВОЁ position:relative, а не у <a> - поэтому картинка геометрически "убегает" из-под
// ссылки, и та превращается в пустышку нулевого размера: клик по фото никуда не ведёт.
// initCardMediaSwipers выше для таких карточек НЕ создаёт свайпер (там же не за что тапать -
// у настоящего свайпера уже есть свой обработчик tap) - на них кладём тот же невидимый
// оверлей, что и на .popular_card__bottom_wrapper (см. initCardLinks), но НЕ на карточки
// с реальным свайпером (media.dataset.gallerySwiper === '1') - там оверлей перекрыл бы
// touch-жесты самого свайпера
function initCardMediaLinks(root) {
    (root || document).querySelectorAll('.popular_card').forEach(function (card) {
        var media = card.querySelector('.popular_card__media');
        if (!media || media.dataset.gallerySwiper === '1') return;
        if (media.querySelector('.popular_card__link')) return;

        var href = getCardHref(card);
        if (!href) return;

        var link = document.createElement('a');
        link.href = href;
        link.className = 'popular_card__link';
        link.setAttribute('aria-label', 'Открыть карточку');
        media.appendChild(link);
    });
}
window.initCardMediaLinks = initCardMediaLinks;

document.addEventListener('DOMContentLoaded', () => {
    try {
        initCardMediaLinks(document);
    } catch (err) {
        console.error('card media links init:', err);
    }
});
