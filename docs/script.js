const CONFIG = {
    POKEMON_COUNT: 9,
    CANVAS_SIZE: 150,
    FEEDBACK_DURATION: 2000,
    POKEMON_SCALE: 0.8,
    LGTM_TEXT: 'LGTM',
    LGTM_FILL_COLOR: 'rgba(255, 255, 255, 0.3)',
    LGTM_STROKE_COLOR: 'rgba(0, 0, 0, 0.5)',
    LGTM_LINE_WIDTH: 2,
    POKEMON_API_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
    BATCH_SIZE: 3,
    LOAD_INTERVAL: 100
};

let pokemonList = [];
let currentGeneration = 0;
let selectedType = 'all';
let viewMode = 'all'; // 'all' or 'favorites'
let favoritePokemons = [];

const GENERATION_RANGES = {
    1: { start: 1, end: 151 },      // カントー
    2: { start: 152, end: 251 },    // ジョウト
    3: { start: 252, end: 386 },    // ホウエン
    4: { start: 387, end: 493 },    // シンオウ
    5: { start: 494, end: 649 },    // イッシュ
    6: { start: 650, end: 721 },    // カロス
    7: { start: 722, end: 809 },    // アローラ
    8: { start: 810, end: 905 },    // ガラル
    9: { start: 906, end: 1025 }    // パルデア
};

const showLoading = () => {
    document.getElementById('pokemon-grid').innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>ポケモンを読み込んでいます...</p></div>';
};

const hideLoading = () => {
    const loading = document.querySelector('.loading');
    if (loading) loading.remove();
};

// LocalStorageの管理
const FAVORITE_STORAGE_KEY = 'favorite-pokemon';

const loadFavorites = () => {
    try {
        const stored = localStorage.getItem(FAVORITE_STORAGE_KEY);
        favoritePokemons = stored ? JSON.parse(stored) : [];
    } catch (e) {
        favoritePokemons = [];
    }
};

const saveFavorites = () => {
    try {
        localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favoritePokemons));
    } catch (e) {
        console.error('Failed to save favorites:', e);
    }
};

const toggleFavorite = (pokemonId) => {
    const id = parseInt(pokemonId);
    const index = favoritePokemons.indexOf(id);
    
    if (index > -1) {
        favoritePokemons.splice(index, 1);
    } else {
        favoritePokemons.push(id);
    }
    
    saveFavorites();
    updateFavoriteButton(pokemonId);
};

const isFavorite = (pokemonId) => {
    return favoritePokemons.includes(parseInt(pokemonId));
};

const updateFavoriteButton = (pokemonId) => {
    const button = document.querySelector(`button[data-pokemon-id="${pokemonId}"]`);
    if (button) {
        if (isFavorite(pokemonId)) {
            button.classList.add('favorited');
            button.innerHTML = '<span style="text-shadow: none;">★</span>';
        } else {
            button.classList.remove('favorited');
            button.innerHTML = '<span style="text-shadow: 0 0 0.5px #000;">☆</span>';
        }
    }
};

const setViewMode = (mode) => {
    viewMode = mode;
    
    // タブのアクティブ状態を更新
    document.querySelectorAll('.view-tabs button').forEach(button => {
        button.classList.remove('active');
    });
    
    if (mode === 'all') {
        document.querySelector('.view-tabs button[onclick*="\'all\'"]').classList.add('active');
    } else {
        document.querySelector('.view-tabs button[onclick*="\'favorites\'"]').classList.add('active');
    }
    
    generateMultiplePokemon();
};

const loadPokemonData = () => {
    showLoading();
    if (typeof allPokemonList !== 'undefined') {
        pokemonList = allPokemonList;
        loadFavorites();
        hideLoading();
        generateMultiplePokemon();
    } else {
        document.getElementById('pokemon-grid').innerHTML = '<div class="loading"><p style="color: #e74c3c;">ポケモンデータの読み込みに失敗しました。<br>ページを再読み込みしてください。</p></div>';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPokemonData);
} else {
    loadPokemonData();
}

// 世代とタイプでフィルタリングされたポケモンリストを取得
const getFilteredPokemonList = () => {
    let filteredList = pokemonList;
    
    // お気に入りモードの場合
    if (viewMode === 'favorites') {
        filteredList = filteredList.filter(pokemon => favoritePokemons.includes(pokemon.id));
    }
    
    // 世代でフィルタリング
    if (currentGeneration !== 0) {
        const range = GENERATION_RANGES[currentGeneration];
        filteredList = filteredList.filter(pokemon => 
            pokemon.id >= range.start && pokemon.id <= range.end
        );
    }
    
    // タイプでフィルタリング
    if (selectedType !== 'all') {
        filteredList = filteredList.filter(pokemon => {
            const pokemonTypes = pokemon.types || [];
            // ポケモンのタイプのいずれかが選択されたタイプに含まれているかチェック
            return pokemonTypes.includes(selectedType);
        });
    }
    
    return filteredList;
};

// ランダムなポケモンを選択する
const selectRandomPokemon = (count) => {
    const filteredList = getFilteredPokemonList();
    
    // フィルタリング後のポケモン数が要求数より少ない場合
    if (filteredList.length <= count) {
        return filteredList.slice();
    }
    
    const selectedPokemon = [];
    const usedIndices = new Set();
    
    while (selectedPokemon.length < count) {
        const randomIndex = Math.floor(Math.random() * filteredList.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            selectedPokemon.push(filteredList[randomIndex]);
        }
    }
    
    return selectedPokemon;
};

// ポケモンカードのHTMLを作成
const createPokemonCardHTML = (pokemon, index) => {
    // タイプバッジのHTMLを生成
    const typesBadgesHTML = pokemon.types.map(type => {
        const typeInfo = POKEMON_TYPES[type];
        const typeName = typeInfo ? typeInfo.name : type;
        const typeColor = typeInfo ? typeInfo.color : '#999999';
        return `<span class="type-badge" style="background-color: ${typeColor};">${typeName}</span>`;
    }).join('');

    const isFav = isFavorite(pokemon.id);
    const favoriteButtonClass = isFav ? 'favorited' : '';
    const favoriteButtonContent = isFav 
        ? '<span style="text-shadow: none;">★</span>' 
        : '<span style="text-shadow: 0 0 0.5px #000;">☆</span>';

    return `
        <canvas id="canvas-${index}" width="${CONFIG.CANVAS_SIZE}" height="${CONFIG.CANVAS_SIZE}"
                data-pokemon-id="${pokemon.id}" data-pokemon-name="${pokemon.name}"
                data-pokemon-url="${pokemon.imageUrl || ''}"></canvas>
        <div class="pokemon-name">No.${pokemon.id} ${pokemon.name}</div>
        <div class="pokemon-types">${typesBadgesHTML}</div>
        <div class="button-group">
            <button class="favorite-button ${favoriteButtonClass}" 
                    data-pokemon-id="${pokemon.id}"
                    onclick="toggleFavorite(${pokemon.id})">${favoriteButtonContent}</button>
            <button onclick="copyPokemonImage(${index})">画像をコピー</button>
        </div>
        <div class="copy-feedback" id="feedback-${index}">コピーしました！</div>
    `;
};

// 複数のポケモンを生成・表示（バッチ処理）
function generateMultiplePokemon() {
    const grid = document.getElementById('pokemon-grid');
    grid.innerHTML = '';
    
    const selectedPokemon = selectRandomPokemon(CONFIG.POKEMON_COUNT);
    
    // お気に入りモードで表示するポケモンがない場合
    if (viewMode === 'favorites' && selectedPokemon.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #666;">
                <p style="font-size: 18px; margin-bottom: 10px;">お気に入りのポケモンがありません</p>
                <p style="font-size: 14px;">星マークをクリックしてポケモンをお気に入りに追加してください</p>
            </div>
        `;
        return;
    }
    
    selectedPokemon.forEach((pokemon, index) => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.innerHTML = createPokemonCardHTML(pokemon, index);
        grid.appendChild(card);
    });
    
    loadImagesInBatches(selectedPokemon);
}

const loadImagesInBatches = (pokemonList) => {
    let currentIndex = 0;
    
    const loadNextBatch = () => {
        const endIndex = Math.min(currentIndex + CONFIG.BATCH_SIZE, pokemonList.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
            drawPokemonImage(pokemonList[i], `canvas-${i}`);
        }
        
        currentIndex = endIndex;
        
        if (currentIndex < pokemonList.length) {
            setTimeout(loadNextBatch, CONFIG.LOAD_INTERVAL);
        }
    };
    
    loadNextBatch();
};

const drawPokemonImage = (pokemon, canvasId) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('読み込み中...', canvas.width / 2, canvas.height / 2);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * CONFIG.POKEMON_SCALE;
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    };
    
    let retryCount = 0;
    const maxRetries = 2;
    
    img.onerror = () => {
        if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
                img.src = `${CONFIG.POKEMON_API_URL}/${pokemon.id}.png?retry=${retryCount}`;
            }, 1000 * retryCount);
        } else {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('画像を読み込めませんでした', canvas.width / 2, canvas.height / 2);
        }
    };
    
    img.src = `${CONFIG.POKEMON_API_URL}/${pokemon.id}.png`;
};

const showCopyFeedback = (index) => {
    const feedback = document.getElementById(`feedback-${index}`);
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, CONFIG.FEEDBACK_DURATION);
};

function filterByGeneration(generation) {
    currentGeneration = generation;
    
    const buttons = document.querySelectorAll('#generation-buttons button');
    let buttonIndex = 0;
    buttons.forEach(button => {
        const genNumber = buttonIndex === 0 ? 0 : buttonIndex;
        if (genNumber === generation) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
        buttonIndex++;
    });
    
    generateMultiplePokemon();
}

function toggleTypeFilter(type) {
    document.querySelectorAll('#type-buttons button').forEach(button => {
        button.classList.remove('active');
    });
    
    selectedType = type;
    
    if (type === 'all') {
        document.querySelector('#type-buttons button[onclick*="\'all\'"]').classList.add('active');
    } else {
        document.querySelector(`#type-buttons button[onclick*="'${type}'"]`).classList.add('active');
    }
    
    generateMultiplePokemon();
}

const createLGTMImage = async (originalCanvas) => {
    const pokemonId = originalCanvas.dataset.pokemonId;
    const pokemonName = originalCanvas.dataset.pokemonName;
    
    const pokemon = pokemonList.find(p => p.id == pokemonId);
    const pokemonTypes = pokemon ? pokemon.types : [];
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width * 2;
    tempCanvas.height = originalCanvas.height * 2;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.drawImage(originalCanvas, 0, 0, originalCanvas.width, originalCanvas.height, 
                      0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.font = 'bold 60px Arial';
    tempCtx.fillStyle = CONFIG.LGTM_FILL_COLOR;
    tempCtx.strokeStyle = CONFIG.LGTM_STROKE_COLOR;
    tempCtx.lineWidth = CONFIG.LGTM_LINE_WIDTH * 2;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    
    const textX = tempCanvas.width / 2;
    const textY = tempCanvas.height / 2;
    
    tempCtx.strokeText(CONFIG.LGTM_TEXT, textX, textY);
    tempCtx.fillText(CONFIG.LGTM_TEXT, textX, textY);
    
    tempCtx.font = 'bold 24px Arial';
    tempCtx.fillStyle = '#333';
    tempCtx.strokeStyle = 'white';
    tempCtx.lineWidth = 3;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'bottom';
    
    const infoText = `No.${pokemonId} ${pokemonName}`;
    const infoY = tempCanvas.height - 60;
    
    tempCtx.strokeText(infoText, textX, infoY);
    tempCtx.fillText(infoText, textX, infoY);
    
    if (pokemonTypes.length > 0) {
        const badgeY = tempCanvas.height - 30;
        const badgeHeight = 20;
        const badgePadding = 16;
        const badgeGap = 10;
        
        const badgeWidths = pokemonTypes.map(type => {
            const typeInfo = POKEMON_TYPES[type];
            const typeName = typeInfo ? typeInfo.name : type;
            tempCtx.font = 'bold 14px Arial';
            return tempCtx.measureText(typeName).width + badgePadding;
        });
        
        const totalWidth = badgeWidths.reduce((sum, width) => sum + width, 0) + 
                          (badgeGap * (pokemonTypes.length - 1));
        
        let currentX = textX - totalWidth / 2;
        
        pokemonTypes.forEach((type, index) => {
            const typeInfo = POKEMON_TYPES[type];
            const typeName = typeInfo ? typeInfo.name : type;
            const typeColor = typeInfo ? typeInfo.color : '#999999';
            const badgeWidth = badgeWidths[index];
            
            tempCtx.fillStyle = typeColor;
            tempCtx.strokeStyle = 'white';
            tempCtx.lineWidth = 2;
            
            const cornerRadius = badgeHeight / 2;
            tempCtx.beginPath();
            tempCtx.roundRect(currentX, badgeY - badgeHeight, badgeWidth, badgeHeight, cornerRadius);
            tempCtx.fill();
            tempCtx.stroke();
            
            tempCtx.fillStyle = 'white';
            tempCtx.strokeStyle = 'rgba(0,0,0,0.5)';
            tempCtx.lineWidth = 1;
            tempCtx.font = 'bold 14px Arial';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            
            const textCenterX = currentX + badgeWidth / 2;
            const textCenterY = badgeY - badgeHeight / 2;
            
            tempCtx.strokeText(typeName, textCenterX, textCenterY);
            tempCtx.fillText(typeName, textCenterX, textCenterY);
            
            currentX += badgeWidth + badgeGap;
        });
    }
    
    return tempCanvas;
};

const copyPokemonImage = async (index) => {
    const originalCanvas = document.getElementById(`canvas-${index}`);
    const pokemonUrl = originalCanvas.dataset.pokemonUrl;
    
    try {
        if (pokemonUrl) {
            // Cloudinary URLがある場合はmarkdown形式でコピー
            const markdownText = `![LGTM](${pokemonUrl})`;
            await navigator.clipboard.writeText(markdownText);
            showCopyFeedback(index);
        } else {
            // URLがない場合は画像をクリップボードにコピー
            const lgtmCanvas = await createLGTMImage(originalCanvas);
            const blob = await new Promise(resolve => lgtmCanvas.toBlob(resolve));
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showCopyFeedback(index);
        }
    } catch (err) {
        console.error('クリップボードへのコピーに失敗しました:', err);
        alert('クリップボードへのコピーに失敗しました');
    }
};