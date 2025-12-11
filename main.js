// ========================================
// 設定オブジェクト（座標などを調整可能）
// ========================================
const config = {
    // OCR対象領域（図番が印刷されている右上の領域）
    // ユーザーの実際の図面サイズに合わせて調整
    ocrRegion: {
        x: 2060,        // 左上のX座標（図番の位置）
        y: 25,          // 左上のY座標
        width: 400,     // 幅（広めに設定）
        height: 90      // 高さ（広めに設定）
    },

    // QRコードを配置する□枠の領域（ユーザー調整値を反映）
    qrFrame: {
        x: 2228,        // 左上のX座標（ユーザー調整値）
        y: 132,         // 左上のY座標（ユーザー調整値）
        width: 105,     // 枠のサイズ（ユーザー調整値）
        height: 105     // 枠のサイズ（ユーザー調整値）
    },

    // 図番の正規表現パターン（様々な形式に対応）
    // 例: LW12345-A2-11, TS1234-00-1, AB12345-BC-123 など
    drawingNumberPattern: /[A-Z]{2}\d{4,5}-[A-Z0-9]{1,2}-\d{1,3}/,

    // Tesseract.js の言語設定
    ocrLanguage: 'eng',

    // OCR の認識精度向上のための設定
    ocrConfig: {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
    }
};

// ========================================
// グローバル変数
// ========================================
let selectedFiles = [];
let processedResults = [];
let errorFiles = [];
let tesseractWorker = null;
let currentFileIndex = 0;
let currentImage = null;
let currentQRCanvas = null;
let currentDrawingNumber = '';

// QRコードの位置（ユーザーが調整可能）
let qrPosition = {
    x: config.qrFrame.x,
    y: config.qrFrame.y,
    size: config.qrFrame.width  // デフォルト105px
};

// ドラッグ関連
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let canvasScale = 1;

// ========================================
// DOM要素の取得
// ========================================
const folderInput = document.getElementById('folder-input');
const fileInput = document.getElementById('file-input');
const fileCount = document.getElementById('file-count');
const processBtn = document.getElementById('process-btn');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const currentFileText = document.getElementById('current-file');
const resultSection = document.getElementById('result-section');
const successCount = document.getElementById('success-count');
const errorCount = document.getElementById('error-count');
const downloadBtn = document.getElementById('download-btn');
const errorSection = document.getElementById('error-section');
const errorList = document.getElementById('error-list');
const logContainer = document.getElementById('log-container');
const hiddenCanvas = document.getElementById('hidden-canvas');

// プレビューモーダル関連
const previewModal = document.getElementById('preview-modal');
const modalFileInfo = document.getElementById('modal-file-info');
const previewCanvas = document.getElementById('preview-canvas');
const qrOverlay = document.getElementById('qr-overlay');
const ocrOverlay = document.getElementById('ocr-overlay');
const drawingNumberInput = document.getElementById('drawing-number-input');
const ocrStatus = document.getElementById('ocr-status');
const qrXSlider = document.getElementById('qr-x-slider');
const qrYSlider = document.getElementById('qr-y-slider');
const qrSizeSlider = document.getElementById('qr-size-slider');
const qrXValue = document.getElementById('qr-x-value');
const qrYValue = document.getElementById('qr-y-value');
const qrSizeValue = document.getElementById('qr-size-value');
const resetPositionBtn = document.getElementById('reset-position-btn');
const updatePreviewBtn = document.getElementById('update-preview-btn');
const skipBtn = document.getElementById('skip-btn');
const approveBtn = document.getElementById('approve-btn');

// ========================================
// イベントリスナー設定
// ========================================

// ファイル選択
folderInput.addEventListener('change', handleFileSelect);
fileInput.addEventListener('change', handleFileSelect);

// 処理開始
processBtn.addEventListener('click', startProcessing);

// ダウンロード
downloadBtn.addEventListener('click', downloadZip);

// モーダル内のコントロール
drawingNumberInput.addEventListener('input', handleDrawingNumberChange);
qrXSlider.addEventListener('input', handleSliderChange);
qrYSlider.addEventListener('input', handleSliderChange);
qrSizeSlider.addEventListener('input', handleSliderChange);
resetPositionBtn.addEventListener('click', resetQRPosition);
updatePreviewBtn.addEventListener('click', updatePreview);
skipBtn.addEventListener('click', skipCurrentFile);
approveBtn.addEventListener('click', approveCurrentFile);

// QRオーバーレイのドラッグ
qrOverlay.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', endDrag);

// ========================================
// ファイル選択処理
// ========================================
function handleFileSelect(event) {
    const files = Array.from(event.target.files);

    // PNGファイルのみをフィルタリング
    selectedFiles = files.filter(file =>
        file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
    );

    // ファイル数を表示
    fileCount.textContent = `選択されたファイル: ${selectedFiles.length}個`;

    // 処理開始ボタンを有効化
    if (selectedFiles.length > 0) {
        processBtn.disabled = false;
        addLog('info', `${selectedFiles.length}個のPNGファイルが選択されました`);
    } else {
        processBtn.disabled = true;
        addLog('error', 'PNGファイルが見つかりませんでした');
    }
}

// ========================================
// ログ表示関数
// ========================================
function addLog(type, message) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;

    const time = new Date().toLocaleTimeString('ja-JP');
    logEntry.innerHTML = `<span class="log-time">[${time}]</span>${message}`;

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// ========================================
// 処理開始
// ========================================
async function startProcessing() {
    // ボタンを無効化
    processBtn.disabled = true;
    processBtn.textContent = '処理中...';

    // 初期化
    processedResults = [];
    errorFiles = [];
    currentFileIndex = 0;

    // UIの表示切り替え
    progressSection.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    downloadBtn.style.display = 'none';

    addLog('info', '=== 処理を開始します ===');

    try {
        // Tesseract Worker の初期化
        addLog('info', 'OCRエンジンを初期化中...');
        tesseractWorker = await Tesseract.createWorker(config.ocrLanguage);
        await tesseractWorker.setParameters(config.ocrConfig);
        addLog('success', 'OCRエンジンの初期化が完了しました');

        // 最初のファイルを処理
        await processNextFile();

    } catch (error) {
        addLog('error', `処理中にエラーが発生しました: ${error.message}`);
        alert('処理中にエラーが発生しました。詳細はログを確認してください。');
        processBtn.disabled = false;
        processBtn.textContent = '🚀 処理を開始';
    }
}

// ========================================
// 次のファイルを処理
// ========================================
async function processNextFile() {
    if (currentFileIndex >= selectedFiles.length) {
        // すべてのファイルの処理が完了
        await finishProcessing();
        return;
    }

    const file = selectedFiles[currentFileIndex];
    const progress = ((currentFileIndex + 1) / selectedFiles.length) * 100;

    // 進捗表示を更新
    updateProgress(progress, currentFileIndex + 1, selectedFiles.length, file.name);

    addLog('info', `処理中: ${file.name}`);

    try {
        // 1. 画像を読み込む
        currentImage = await loadImage(file);

        // 2. 図番をOCRで読み取る
        currentDrawingNumber = await extractDrawingNumber(currentImage);

        // 3. プレビューモーダルを表示
        await showPreviewModal(file, currentImage, currentDrawingNumber);

    } catch (error) {
        addLog('error', `エラー: ${file.name} - ${error.message}`);
        errorFiles.push({
            originalName: file.name,
            error: error.message
        });

        // 次のファイルへ
        currentFileIndex++;
        await processNextFile();
    }
}

// ========================================
// プレビューモーダルを表示
// ========================================
async function showPreviewModal(file, image, drawingNumber) {
    // モーダル情報を設定
    modalFileInfo.textContent = `ファイル ${currentFileIndex + 1}/${selectedFiles.length}: ${file.name}`;

    // 図番入力フィールドを設定
    drawingNumberInput.value = drawingNumber || '';

    // OCRステータスを表示
    if (drawingNumber) {
        ocrStatus.textContent = `✅ OCRで図番を検出しました: ${drawingNumber}`;
        ocrStatus.className = 'ocr-status success';
    } else {
        ocrStatus.textContent = `⚠️ 図番を検出できませんでした。手動で入力してください。`;
        ocrStatus.className = 'ocr-status error';
    }

    // QR位置をリセット
    resetQRPosition();

    // プレビューを更新
    await updatePreview();

    // モーダルを表示
    previewModal.style.display = 'flex';
}

// ========================================
// プレビューを更新
// ========================================
async function updatePreview() {
    if (!currentImage) return;

    const ctx = previewCanvas.getContext('2d');

    // キャンバスサイズを画像に合わせる
    previewCanvas.width = currentImage.width;
    previewCanvas.height = currentImage.height;

    // 画像を描画
    ctx.drawImage(currentImage, 0, 0);

    // 図番が入力されている場合、QRコードを生成して描画
    const drawingNum = drawingNumberInput.value.trim();
    if (drawingNum) {
        try {
            // QRコードを生成
            currentQRCanvas = document.createElement('canvas');
            await QRCode.toCanvas(currentQRCanvas, drawingNum, {
                width: qrPosition.size,
                margin: 0,
                errorCorrectionLevel: 'M'
            });

            // 背景を白で塗りつぶし
            ctx.fillStyle = 'white';
            ctx.fillRect(qrPosition.x, qrPosition.y, qrPosition.size, qrPosition.size);

            // QRコードを描画
            ctx.drawImage(currentQRCanvas, qrPosition.x, qrPosition.y);

            addLog('info', 'プレビューを更新しました');
        } catch (error) {
            addLog('error', `QRコード生成エラー: ${error.message}`);
        }
    }

    // QRオーバーレイを更新
    updateQROverlay();
}

// ========================================
// QRオーバーレイの位置とサイズを更新
// ========================================
function updateQROverlay() {
    // キャンバスの表示サイズを取得
    const rect = previewCanvas.getBoundingClientRect();
    canvasScale = rect.width / previewCanvas.width;

    // QRオーバーレイの位置とサイズを計算
    const overlayX = qrPosition.x * canvasScale;
    const overlayY = qrPosition.y * canvasScale;
    const overlaySize = qrPosition.size * canvasScale;

    qrOverlay.style.left = `${overlayX}px`;
    qrOverlay.style.top = `${overlayY}px`;
    qrOverlay.style.width = `${overlaySize}px`;
    qrOverlay.style.height = `${overlaySize}px`;

    // OCR領域オーバーレイの位置とサイズを計算
    const ocrX = config.ocrRegion.x * canvasScale;
    const ocrY = config.ocrRegion.y * canvasScale;
    const ocrWidth = config.ocrRegion.width * canvasScale;
    const ocrHeight = config.ocrRegion.height * canvasScale;

    ocrOverlay.style.left = `${ocrX}px`;
    ocrOverlay.style.top = `${ocrY}px`;
    ocrOverlay.style.width = `${ocrWidth}px`;
    ocrOverlay.style.height = `${ocrHeight}px`;
}

// ========================================
// 図番入力の変更ハンドラ
// ========================================
function handleDrawingNumberChange() {
    const value = drawingNumberInput.value.trim();

    if (value) {
        if (config.drawingNumberPattern.test(value)) {
            ocrStatus.textContent = `✅ 有効な図番形式です: ${value}`;
            ocrStatus.className = 'ocr-status success';
        } else {
            ocrStatus.textContent = `⚠️ 図番の形式が標準と異なります（処理は可能です）`;
            ocrStatus.className = 'ocr-status';
        }
    } else {
        ocrStatus.textContent = `❌ 図番を入力してください`;
        ocrStatus.className = 'ocr-status error';
    }
}

// ========================================
// スライダー変更ハンドラ
// ========================================
function handleSliderChange(event) {
    const slider = event.target;
    const value = parseInt(slider.value);

    if (slider.id === 'qr-x-slider') {
        qrPosition.x = value;
        qrXValue.textContent = value;
    } else if (slider.id === 'qr-y-slider') {
        qrPosition.y = value;
        qrYValue.textContent = value;
    } else if (slider.id === 'qr-size-slider') {
        qrPosition.size = value;
        qrSizeValue.textContent = value;
    }

    updateQROverlay();
}

// ========================================
// QR位置をリセット
// ========================================
function resetQRPosition() {
    qrPosition.x = config.qrFrame.x;
    qrPosition.y = config.qrFrame.y;
    qrPosition.size = config.qrFrame.width;  // デフォルト105px

    qrXSlider.value = qrPosition.x;
    qrYSlider.value = qrPosition.y;
    qrSizeSlider.value = qrPosition.size;

    qrXValue.textContent = qrPosition.x;
    qrYValue.textContent = qrPosition.y;
    qrSizeValue.textContent = qrPosition.size;

    updateQROverlay();
    addLog('info', 'QRコード位置をリセットしました');
}

// ========================================
// ドラッグ開始
// ========================================
function startDrag(event) {
    isDragging = true;

    const rect = previewCanvas.getBoundingClientRect();
    const overlayRect = qrOverlay.getBoundingClientRect();

    dragOffset.x = event.clientX - overlayRect.left;
    dragOffset.y = event.clientY - overlayRect.top;

    event.preventDefault();
}

// ========================================
// ドラッグ中
// ========================================
function drag(event) {
    if (!isDragging) return;

    const rect = previewCanvas.getBoundingClientRect();

    // 新しい位置を計算（キャンバス上の座標に変換）
    const newX = (event.clientX - rect.left - dragOffset.x) / canvasScale;
    const newY = (event.clientY - rect.top - dragOffset.y) / canvasScale;

    // 範囲チェック
    qrPosition.x = Math.max(0, Math.min(newX, previewCanvas.width - qrPosition.size));
    qrPosition.y = Math.max(0, Math.min(newY, previewCanvas.height - qrPosition.size));

    // スライダーの値を更新
    qrXSlider.value = Math.round(qrPosition.x);
    qrYSlider.value = Math.round(qrPosition.y);
    qrXValue.textContent = Math.round(qrPosition.x);
    qrYValue.textContent = Math.round(qrPosition.y);

    updateQROverlay();

    event.preventDefault();
}

// ========================================
// ドラッグ終了
// ========================================
function endDrag(event) {
    if (isDragging) {
        isDragging = false;
        addLog('info', `QRコード位置を変更: (${Math.round(qrPosition.x)}, ${Math.round(qrPosition.y)})`);
    }
}

// ========================================
// スキップボタン
// ========================================
async function skipCurrentFile() {
    const file = selectedFiles[currentFileIndex];
    addLog('info', `スキップ: ${file.name}`);

    errorFiles.push({
        originalName: file.name,
        error: 'ユーザーによってスキップされました'
    });

    // モーダルを閉じる
    previewModal.style.display = 'none';

    // 次のファイルへ
    currentFileIndex++;
    await processNextFile();
}

// ========================================
// OKボタン（処理を確定）
// ========================================
async function approveCurrentFile() {
    const file = selectedFiles[currentFileIndex];
    const drawingNum = drawingNumberInput.value.trim();

    // 図番チェック
    if (!drawingNum) {
        alert('図番を入力してください。');
        return;
    }

    addLog('info', `確定: ${file.name} → ${drawingNum}.png`);

    try {
        // 最終的な画像を生成
        const ctx = hiddenCanvas.getContext('2d');
        hiddenCanvas.width = currentImage.width;
        hiddenCanvas.height = currentImage.height;
        ctx.drawImage(currentImage, 0, 0);

        // QRコードを生成（まだ生成されていない場合は新規生成）
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, drawingNum, {
            width: qrPosition.size,
            margin: 0,
            errorCorrectionLevel: 'M'
        });

        // 背景を白で塗りつぶしてQRコードを描画
        ctx.fillStyle = 'white';
        ctx.fillRect(qrPosition.x, qrPosition.y, qrPosition.size, qrPosition.size);
        ctx.drawImage(qrCanvas, qrPosition.x, qrPosition.y);

        // Blobに変換
        const blob = await canvasToBlob(hiddenCanvas);

        // 結果を保存
        processedResults.push({
            originalName: file.name,
            newFileName: `${drawingNum}.png`,
            drawingNumber: drawingNum,
            blob: blob
        });

        addLog('success', `✅ 処理完了: ${drawingNum}.png`);

    } catch (error) {
        addLog('error', `処理エラー: ${error.message}`);
        errorFiles.push({
            originalName: file.name,
            error: error.message
        });
    }

    // モーダルを閉じる
    previewModal.style.display = 'none';

    // 次のファイルへ
    currentFileIndex++;
    await processNextFile();
}

// ========================================
// 処理完了
// ========================================
async function finishProcessing() {
    // Tesseract Worker の終了
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        addLog('info', 'OCRエンジンを終了しました');
    }

    // 結果を表示
    showResults();

    // ボタンを元に戻す
    processBtn.disabled = false;
    processBtn.textContent = '🚀 処理を開始';
}

// ========================================
// 進捗表示の更新
// ========================================
function updateProgress(percentage, current, total, fileName) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${current} / ${total} 枚確認中 (${Math.round(percentage)}%)`;
    currentFileText.textContent = `現在確認中: ${fileName}`;
}

// ========================================
// 画像を読み込む
// ========================================
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsDataURL(file);
    });
}

// ========================================
// 図番をOCRで読み取る
// ========================================
async function extractDrawingNumber(image) {
    // キャンバスに描画
    const ctx = hiddenCanvas.getContext('2d');
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    // OCR対象領域を切り出す
    const imageData = ctx.getImageData(
        config.ocrRegion.x,
        config.ocrRegion.y,
        config.ocrRegion.width,
        config.ocrRegion.height
    );

    // 一時キャンバスに描画（前処理のため）
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = config.ocrRegion.width;
    tempCanvas.height = config.ocrRegion.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    // 複数の前処理方法でOCRを試行
    const preprocessMethods = [
        { name: '標準（コントラスト強調）', fn: enhanceContrast },
        { name: '反転（白黒反転）', fn: invertColors },
        { name: 'シャープ化', fn: sharpenImage },
        { name: '適応的二値化', fn: adaptiveThreshold }
    ];

    let bestResult = null;
    let bestConfidence = 0;

    for (const method of preprocessMethods) {
        // 前処理用のキャンバスをコピー
        const processCanvas = document.createElement('canvas');
        processCanvas.width = tempCanvas.width;
        processCanvas.height = tempCanvas.height;
        const processCtx = processCanvas.getContext('2d');
        processCtx.drawImage(tempCanvas, 0, 0);

        // 前処理を適用
        method.fn(processCtx, processCanvas.width, processCanvas.height);

        // デバッグ用：処理後の画像を表示（開発者ツールで確認可能）
        console.log(`OCR試行: ${method.name}`);
        console.log('処理後の画像:', processCanvas.toDataURL());

        try {
            // Tesseract.js でOCR実行
            const result = await tesseractWorker.recognize(processCanvas);
            const text = result.data.text.trim();
            const confidence = result.data.confidence;

            console.log(`  検出テキスト: "${text}"`);
            console.log(`  信頼度: ${confidence.toFixed(2)}%`);

            // 正規表現で図番を抽出
            const match = text.match(config.drawingNumberPattern);

            if (match && confidence > bestConfidence) {
                bestResult = match[0];
                bestConfidence = confidence;
                console.log(`  ✅ マッチ成功: ${bestResult}`);
            }
        } catch (error) {
            console.error(`  OCRエラー (${method.name}):`, error.message);
        }
    }

    if (bestResult) {
        addLog('success', `OCR成功: ${bestResult} (信頼度: ${bestConfidence.toFixed(1)}%)`);
        return bestResult;
    }

    addLog('warning', 'すべての前処理方法で図番を検出できませんでした');
    return null;
}

// ========================================
// コントラスト強調（OCR精度向上のため）
// ========================================
function enhanceContrast(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // グレースケール化と二値化
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const value = avg > 128 ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);
}

// ========================================
// 色反転（白黒反転）
// ========================================
function invertColors(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // グレースケール化と反転
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const value = 255 - avg; // 反転
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);
}

// ========================================
// シャープ化（エッジ強調）
// ========================================
function sharpenImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);

    // シャープ化カーネル
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    // 畳み込み処理
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += tempData[idx] * kernel[kernelIdx];
                    }
                }
                const idx = (y * width + x) * 4 + c;
                data[idx] = Math.max(0, Math.min(255, sum));
            }
        }
    }

    // グレースケール化と二値化
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const value = avg > 128 ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);
}

// ========================================
// 適応的二値化（局所的な閾値処理）
// ========================================
function adaptiveThreshold(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // グレースケール化
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        grayData[i / 4] = gray;
    }

    // 適応的閾値処理（局所的な平均を使用）
    const windowSize = 15;
    const halfWindow = Math.floor(windowSize / 2);
    const C = 10; // 定数（調整可能）

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // 局所的な平均を計算
            let sum = 0;
            let count = 0;
            for (let wy = Math.max(0, y - halfWindow); wy <= Math.min(height - 1, y + halfWindow); wy++) {
                for (let wx = Math.max(0, x - halfWindow); wx <= Math.min(width - 1, x + halfWindow); wx++) {
                    sum += grayData[wy * width + wx];
                    count++;
                }
            }
            const localMean = sum / count;
            const threshold = localMean - C;

            // 二値化
            const idx = (y * width + x) * 4;
            const value = grayData[y * width + x] > threshold ? 255 : 0;
            data[idx] = value;
            data[idx + 1] = value;
            data[idx + 2] = value;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// ========================================
// キャンバスをBlobに変換
// ========================================
function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });
}

// ========================================
// 結果を表示
// ========================================
function showResults() {
    // 結果セクションを表示
    resultSection.style.display = 'block';
    successCount.textContent = processedResults.length;
    errorCount.textContent = errorFiles.length;

    // ダウンロードボタンを表示（成功したファイルがある場合）
    if (processedResults.length > 0) {
        downloadBtn.style.display = 'block';
    }

    // エラーファイルがある場合、エラーセクションを表示
    if (errorFiles.length > 0) {
        errorSection.style.display = 'block';
        displayErrorFiles();
    }

    addLog('info', '=== 処理が完了しました ===');
    addLog('info', `成功: ${processedResults.length}件、エラー: ${errorFiles.length}件`);
}

// ========================================
// エラーファイルを表示
// ========================================
function displayErrorFiles() {
    errorList.innerHTML = '';

    errorFiles.forEach((errorFile) => {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.innerHTML = `
            <strong>📄 ${errorFile.originalName}</strong>
            <p>理由: ${errorFile.error}</p>
        `;
        errorList.appendChild(errorItem);
    });
}

// ========================================
// ZIPファイルのダウンロード
// ========================================
async function downloadZip() {
    addLog('info', 'ZIPファイルを生成中...');
    downloadBtn.disabled = true;
    downloadBtn.textContent = '生成中...';

    try {
        // JSZip インスタンスを作成
        const zip = new JSZip();

        // 処理済みファイルをZIPに追加
        for (const result of processedResults) {
            zip.file(result.newFileName, result.blob);
        }

        // ZIPファイルを生成
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        // ダウンロードリンクを作成
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing_qr_result_${getTimestamp()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLog('success', 'ZIPファイルのダウンロードを開始しました');

    } catch (error) {
        addLog('error', `ZIPファイルの生成に失敗しました: ${error.message}`);
        alert('ZIPファイルの生成に失敗しました');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '💾 結果をダウンロード (ZIP)';
    }
}

// ========================================
// タイムスタンプを取得
// ========================================
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}_${hour}${minute}${second}`;
}

// ========================================
// 初期化処理
// ========================================
window.addEventListener('DOMContentLoaded', () => {
    addLog('info', 'アプリケーションが起動しました');
    addLog('info', 'フォルダまたはファイルを選択してください');

    // 設定情報をログに出力
    console.log('=== 設定情報 ===');
    console.log('OCR領域:', config.ocrRegion);
    console.log('QRフレーム領域:', config.qrFrame);
    console.log('図番パターン:', config.drawingNumberPattern);
});
