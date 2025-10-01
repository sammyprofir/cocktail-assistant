import { html } from 'lit-html';
import { component, useState, useEffect, useCallback } from "@pionjs/pion";
import generalCss from '/src/styles/styles.scss?inline';
const generalStyle = html`<style>${generalCss}</style>`;
import cocktailCss from '/src/styles/cocktail.scss?inline';
const cocktailStyle = html`<style>${cocktailCss}</style>`;
import toasterCss from '/src/styles/toaster.scss?inline';
const toasterStyle = html`<style>${toasterCss}</style>`;

// Extract ingredients from TheCocktailDB
function extractIngredients(drink) {
    const ingredients = [];
    for (let i = 1; i <= 15; i++) {
        const ingredient = drink[`strIngredient${i}`];
        const measure = drink[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
            ingredients.push({ name: ingredient.trim(), measure: measure ? measure.trim() : '' });
        }
    }
    return ingredients;
}

// Toaster Component
function Toaster({ toasts }) {
    return html`
        ${toasterStyle}
        <div class="toasters">
            ${toasts.map(t => html`<div class="toaster">${t}</div>`)}
        </div>
    `;
}
customElements.define('app-toaster', component(Toaster));

// CocktailCard Component
function CocktailCard({ drink, onAdd }) {
    const ingredients = extractIngredients(drink);
    return html`
        ${cocktailStyle}
        <div class="cocktail">
            <div class="thumbnail" style="background-image: url(${drink.strDrinkThumb})"></div>
            <div class="details">
                <h2>${drink.strDrink}</h2>
                <p class="small">
                    ${drink.strInstructions
                            ? (drink.strInstructions.length > 200
                                    ? drink.strInstructions.slice(0, 200) + "..."
                                    : drink.strInstructions)
                            : ''}
                </p>
                <ul class="ingredients-list">
                    ${ingredients.map(i => html`<li>${i.name}${i.measure ? ' - ' + i.measure : ''}</li>`)}
                </ul>
            </div>
            <div class="action">
                <strong></strong>
                <button @click=${() => onAdd(ingredients)}>Add to shopping list</button>
            </div>
        </div>
    `;
}
customElements.define('cocktail-card', component(CocktailCard));

// Cocktail App
function CocktailApp() {
    const [query, setQuery] = useState('margarita');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [shoppingMap, setShoppingMap] = useState(() => new Map());

    // display toasts
    const pushToast = useCallback((msg) => {
        setToasts(prev => {
            const next = [...prev, msg];
            setTimeout(() => setToasts(p => p.filter(x => x !== msg)), 3500);
            return next;
        });
    });

    // searching
    const doSearch = useCallback(async (q) => {
        if (!q) return;
        pushToast('Searching...');
        setLoading(true);
        try {
            const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
            const data = await res.json();
            const drinks = data.drinks || [];
            setResults(drinks);
            if (drinks.length === 0) pushToast('No results found.');
            else pushToast('Here are the results.');
        } catch (err) {
            console.error(err);
            pushToast('No results found.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    });

    // initial search
    useEffect(() => { doSearch(query); }, []);

    // add ingredient
    const addIngredients = useCallback((ingredients) => {
        setShoppingMap(prev => {
            const next = new Map(prev);
            ingredients.forEach(i => {
                const key = i.name.toLowerCase();
                if (!next.has(key)) next.set(key, { name: i.name, measures: [i.measure].filter(Boolean) });
                else {
                    const entry = next.get(key);
                    if (i.measure && !entry.measures.includes(i.measure)) entry.measures.push(i.measure);
                }
            });
            pushToast('Ingredients added to shopping list.');
            return next;
        });
    });

    // remove ingredient
    const removeIngredient = useCallback((name) => {
        setShoppingMap(prev => {
            const next = new Map(prev);
            next.delete(name.toLowerCase());
            pushToast('Ingredients removed from shopping list.');
            return next;
        });
    });

    // open print pop-up
    const openPrintDialog = () => {
        const items = Array.from(shoppingMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        const content = `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Cocktails Assistant</title>
            </head>
            <body>
                <h1>Cocktail: Shopping list</h1>
                <ul>
                    ${items.map(it => `<li>${it.name}${it.measures.length ? ' — ' + it.measures.join(', ') : ''}</li>`).join('')}
                </ul>
            </body>
        </html>`;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.srcdoc = content;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            try {
                iframe.contentWindow.focus();
                setTimeout(() => {
                    iframe.contentWindow.print();
                    setTimeout(() => {
                        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
                    }, 500);
                }, 150);
            } catch (err) {
                if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }
        };
    };

    // app render
    const shoppingItems = Array.from(shoppingMap.values());
    return html`
        ${generalStyle}
        <div class="grid">
            <main class="wrap">
            <div class="search">
                <input type="text"
                       placeholder="Search..."
                       .value=${query}
                       @input=${(e) => setQuery(e.target.value)}
                       @keydown=${(e) => { if(e.key==='Enter') doSearch(query); }} />
                <button @click=${() => doSearch(query)}>Search</button>
            </div>
            
            <div class="main">
                ${loading ? html`<p class="small">Loading...</p>` : null}
                <div class="results">
                    ${results.map(drink => html`
                        <cocktail-card .drink=${drink} .onAdd=${addIngredients}></cocktail-card>
                    `)}
                </div>
            </div>

            <aside class="sidebar">
                <h3>Shopping list (${shoppingItems.length})</h3>
                <ul>
                    ${shoppingItems.map(it => html`
                        <li style="margin-bottom:6px">
                            <button @click=${() => removeIngredient(it.name)}>Remove</button>
                            ${it.name} 
                            ${it.measures.length ? html`<span class="small">(${it.measures.join(', ')})</span>` : ''}
                        </li>
                    `)}
                </ul>
                <div class="action">
                    <button @click=${openPrintDialog}>Print</button>
                </div>
            </aside>
        </main>
        </div>
        
        <app-toaster .toasts=${toasts}></app-toaster>
    `;
}
customElements.define('cocktail-app', component(CocktailApp));