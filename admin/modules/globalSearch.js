import * as api from '../api.js';
import * as ui from '../ui.js';
import { openLearnerProfile } from './learnerProfile.js';
import { fetchLearners, populateGroupFilter } from './learners.js';
import { state, updateState } from '../state.js';

let searchTimer;

function renderSearchResults(data, resultsContainer) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('hidden');

    if (data.learners.length === 0 && data.groups.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">Ничего не найдено.</div>';
        return;
    }

    if (data.learners.length > 0) {
        const header = document.createElement('div');
        header.className = 'search-section-header';
        header.textContent = 'Учащиеся';
        resultsContainer.appendChild(header);

        data.learners.forEach(learner => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `${learner.full_name} <span class="group-label">(${learner.group_name})</span>`;
            item.addEventListener('click', () => {
                openLearnerProfile(learner.id);
                resultsContainer.classList.add('hidden');
                document.getElementById('global-search-input').value = '';
            });
            resultsContainer.appendChild(item);
        });
    }

    if (data.groups.length > 0) {
        const header = document.createElement('div');
        header.className = 'search-section-header';
        header.textContent = 'Группы и Материалы';
        resultsContainer.appendChild(header);

        data.groups.forEach(groupName => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = `Перейти к группе ${groupName}`;
            item.addEventListener('click', () => {
                updateState({
                    currentSort: { key: 'full_name', direction: 'asc' },
                    currentPage: 1,
                    currentGroupName: groupName,
                    currentSearchName: '',
                });
                document.getElementById('search-input').value = '';
                ui.showLearnersView(groupName);
                populateGroupFilter().then(() => {
                    document.getElementById('group-filter-select').value = groupName;
                });
                fetchLearners();
                resultsContainer.classList.add('hidden');
                document.getElementById('global-search-input').value = '';
            });
            resultsContainer.appendChild(item);
        });
    }
}

export function initializeGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results');

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const term = searchInput.value.trim();

        if (term.length < 3) {
            resultsContainer.classList.add('hidden');
            return;
        }

        searchTimer = setTimeout(async () => {
            try {
                const results = await api.globalSearch(term);
                renderSearchResults(results, resultsContainer);
            } catch (error) {
                console.error('Global search error:', error);
                resultsContainer.innerHTML = '<div class="no-results" style="color: red;">Ошибка поиска</div>';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}