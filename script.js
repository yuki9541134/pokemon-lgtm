// 定数定義
const CONFIG = {
    POKEMON_COUNT: 9,
    CANVAS_SIZE: 150,
    FEEDBACK_DURATION: 2000,
    LOAD_DELAY: 100,
    POKEMON_SCALE: 0.8,
    LGTM_TEXT: 'LGTM',
    LGTM_FONT: 'bold 30px Arial',
    LGTM_FILL_COLOR: 'rgba(255, 255, 255, 0.3)',
    LGTM_STROKE_COLOR: 'rgba(0, 0, 0, 0.5)',
    LGTM_LINE_WIDTH: 2,
    POKEMON_API_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
    BATCH_SIZE: 3,  // 一度に読み込む画像の数
    LOAD_INTERVAL: 100  // バッチ間の遅延時間（ミリ秒）
};

// グローバル変数
let pokemonList = [{ id: 25, name: "ピカチュウ" }];
let currentGeneration = 0;  // 0 = 全て, 1-9 = 各世代

// 世代ごとのポケモンID範囲
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

// ローディング表示
const showLoading = () => {
    const grid = document.getElementById('pokemon-grid');
    grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>ポケモンを読み込んでいます...</p></div>';
};

// ローディング非表示
const hideLoading = () => {
    const grid = document.getElementById('pokemon-grid');
    const loading = grid.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
};

// ポケモンデータの読み込み
const loadPokemonData = () => {
    showLoading();
    
    const script = document.createElement('script');
    script.src = 'pokemon-data.js';
    script.async = true;  // 非同期読み込み
    
    script.onload = () => {
        if (typeof allPokemonList !== 'undefined') {
            pokemonList = allPokemonList;
        }
        hideLoading();
        generateMultiplePokemon();
    };
    
    script.onerror = () => {
        hideLoading();
        const grid = document.getElementById('pokemon-grid');
        grid.innerHTML = '<div class="loading"><p style="color: #e74c3c;">ポケモンデータの読み込みに失敗しました。<br>ページを再読み込みしてください。</p></div>';
    };
    
    document.head.appendChild(script);
};

// 初期化処理
const init = () => {
    // データ読み込み開始
    loadPokemonData();
};

// DOMContentLoadedで早期初期化（画像などの読み込み完了を待たない）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // すでにDOMContentLoadedが発火済みの場合
    init();
}

// 世代でフィルタリングされたポケモンリストを取得
const getFilteredPokemonList = () => {
    if (currentGeneration === 0) {
        return pokemonList;
    }
    
    const range = GENERATION_RANGES[currentGeneration];
    return pokemonList.filter(pokemon => 
        pokemon.id >= range.start && pokemon.id <= range.end
    );
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
    return `
        <canvas id="canvas-${index}" width="${CONFIG.CANVAS_SIZE}" height="${CONFIG.CANVAS_SIZE}"
                data-pokemon-id="${pokemon.id}" data-pokemon-name="${pokemon.name}"></canvas>
        <button onclick="copyPokemonImage(${index})">画像をコピー</button>
        <div class="copy-feedback" id="feedback-${index}">コピーしました！</div>
    `;
};

// 複数のポケモンを生成・表示（バッチ処理）
function generateMultiplePokemon() {
    const grid = document.getElementById('pokemon-grid');
    grid.innerHTML = '';
    
    const selectedPokemon = selectRandomPokemon(CONFIG.POKEMON_COUNT);
    
    // まず全てのカードを作成（画像なし）
    selectedPokemon.forEach((pokemon, index) => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.innerHTML = createPokemonCardHTML(pokemon, index);
        grid.appendChild(card);
    });
    
    // バッチで画像を読み込む
    loadImagesInBatches(selectedPokemon);
}

// バッチで画像を読み込む
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

// キャンバスにポケモン画像を描画（LGTMなし）
const drawPokemonImage = (pokemon, canvasId) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // プレースホルダー表示
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
        
        // ポケモン画像を描画
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * CONFIG.POKEMON_SCALE;
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        // 図鑑番号と名前を追加
        ctx.font = '12px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const infoText = `No.${pokemon.id} ${pokemon.name}`;
        ctx.fillText(infoText, canvas.width / 2, canvas.height - 5);
    };
    
    let retryCount = 0;
    const maxRetries = 2;
    
    img.onerror = () => {
        if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
                img.src = `${CONFIG.POKEMON_API_URL}/${pokemon.id}.png?retry=${retryCount}`;
            }, 1000 * retryCount);  // リトライ間隔を増やす
        } else {
            // エラー時の表示
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

// フィードバック表示
const showCopyFeedback = (index) => {
    const feedback = document.getElementById(`feedback-${index}`);
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, CONFIG.FEEDBACK_DURATION);
};

// 世代フィルターボタンのクリック処理
function filterByGeneration(generation) {
    currentGeneration = generation;
    
    // アクティブボタンの更新
    const buttons = document.querySelectorAll('#generation-buttons button');
    buttons.forEach((button, index) => {
        if (index === generation) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // ポケモンを再生成
    generateMultiplePokemon();
}

// LGTMテキストを追加した画像を生成
const createLGTMImage = async (originalCanvas) => {
    // ポケモン情報を取得
    const pokemonId = originalCanvas.dataset.pokemonId;
    const pokemonName = originalCanvas.dataset.pokemonName;
    
    // 新しいキャンバスを作成（サイズを2倍に）
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width * 2;
    tempCanvas.height = originalCanvas.height * 2;
    const tempCtx = tempCanvas.getContext('2d');
    
    // スケーリングの品質を向上
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // 背景を白で塗りつぶす（図鑑番号・名前の背景が透過しないように）
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // 元の画像を2倍サイズでコピー
    tempCtx.drawImage(originalCanvas, 0, 0, originalCanvas.width, originalCanvas.height, 
                      0, 0, tempCanvas.width, tempCanvas.height);
    
    // LGTMテキストを追加（サイズも2倍に調整）
    tempCtx.font = 'bold 60px Arial';  // 30px → 60px
    tempCtx.fillStyle = CONFIG.LGTM_FILL_COLOR;
    tempCtx.strokeStyle = CONFIG.LGTM_STROKE_COLOR;
    tempCtx.lineWidth = CONFIG.LGTM_LINE_WIDTH * 2;  // 線幅も2倍
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    
    const textX = tempCanvas.width / 2;
    const textY = tempCanvas.height / 2;
    
    tempCtx.strokeText(CONFIG.LGTM_TEXT, textX, textY);
    tempCtx.fillText(CONFIG.LGTM_TEXT, textX, textY);
    
    // 図鑑番号と名前を追加（2倍サイズに調整）
    tempCtx.font = '24px Arial';  // 12px → 24px
    tempCtx.fillStyle = '#333';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'bottom';
    const infoText = `No.${pokemonId} ${pokemonName}`;
    tempCtx.fillText(infoText, tempCanvas.width / 2, tempCanvas.height - 10);
    
    return tempCanvas;
};

// ポケモン画像をクリップボードにコピー
const copyPokemonImage = async (index) => {
    const originalCanvas = document.getElementById(`canvas-${index}`);
    
    try {
        // LGTM付きの画像を生成
        const lgtmCanvas = await createLGTMImage(originalCanvas);
        
        // Blobに変換してクリップボードにコピー
        const blob = await new Promise(resolve => lgtmCanvas.toBlob(resolve));
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showCopyFeedback(index);
    } catch (err) {
        console.error('クリップボードへのコピーに失敗しました:', err);
        alert('クリップボードへのコピーに失敗しました');
    }
};