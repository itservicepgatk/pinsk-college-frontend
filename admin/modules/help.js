import { DOMElements } from '../dom.js';

export function initializeHelp() {
    if (DOMElements.helpBtn) {
        DOMElements.helpBtn.addEventListener('click', () => {
            DOMElements.helpModal.classList.remove('hidden');
        });
    }

    if (DOMElements.helpCloseBtn) {
        DOMElements.helpCloseBtn.addEventListener('click', () => {
            DOMElements.helpModal.classList.add('hidden');
        });
    }
}