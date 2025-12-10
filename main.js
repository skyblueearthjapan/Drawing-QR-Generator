// ========================================
// 設定オブジェクト（座標などを調整可能）
// ========================================
const config = {
    // OCR対象領域（図番が印刷されている右上の領域）
    // 画像サイズが 2048 × 1447 px の場合の想定座標
    ocrRegion: {
        x: 1650,        // 左上のX座標
        y: 50,          // 左上のY座標
        width: 350,     // 幅
        height: 80      // 高さ
    },

    // QRコードを配置する□枠の領域
    // 30mm × 30mm の枠を想定
    qrFrame: {
        x: 1700,        // 左上のX座標
        y: 150,         // 左上のY座標
        width: 240,     // 枠の幅（ピクセル）
        height: 240     // 枠の高さ（ピクセル）
    },

    // 図番の正規表現パターン
    drawingNumberPattern: /(LW|TS)\d{5}-\d{2}-\d{3}/,

    // QRコードのサイズ計算（20mm × 20mm = 枠の 2/3）
    qrSizeRatio: 2 / 3,

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

// ========================================
// イベントリスナー設定
// ========================================

// フォルダ選択時
folderInput.addEventListener('change', handleFileSelect);

// 複数ファイル選択時
fileInput.addEventListener('change', handleFileSelect);

// 処理開始ボタンクリック時
processBtn.addEventListener('click', startProcessing);

// ダウンロードボタンクリック時
downloadBtn.addEventListener('click', downloadZip);

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

        // 各ファイルを処理
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progress = ((i + 1) / selectedFiles.length) * 100;

            // 進捗表示を更新
            updateProgress(progress, i + 1, selectedFiles.length, file.name);

            addLog('info', `処理中: ${file.name}`);

            try {
                // ファイルを処理
                const result = await processDrawingFile(file);
                processedResults.push(result);
                addLog('success', `✅ 成功: ${file.name} → ${result.newFileName}`);
            } catch (error) {
                errorFiles.push({
                    originalName: file.name,
                    error: error.message
                });
                addLog('error', `❌ エラー: ${file.name} - ${error.message}`);
            }
        }

        // Tesseract Worker の終了
        await tesseractWorker.terminate();
        addLog('info', 'OCRエンジンを終了しました');

        // 結果を表示
        showResults();

    } catch (error) {
        addLog('error', `処理中にエラーが発生しました: ${error.message}`);
        alert('処理中にエラーが発生しました。詳細はログを確認してください。');
    } finally {
        // ボタンを元に戻す
        processBtn.disabled = false;
        processBtn.textContent = '🚀 処理を開始';
    }
}

// ========================================
// 進捗表示の更新
// ========================================
function updateProgress(percentage, current, total, fileName) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${current} / ${total} 枚処理完了 (${Math.round(percentage)}%)`;
    currentFileText.textContent = `現在処理中: ${fileName}`;
}

// ========================================
// 図面ファイルの処理
// ========================================
async function processDrawingFile(file) {
    // 1. 画像を読み込む
    const image = await loadImage(file);

    // 2. キャンバスに描画
    const ctx = hiddenCanvas.getContext('2d');
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    // 3. 図番をOCRで読み取る
    const drawingNumber = await extractDrawingNumber(ctx);

    if (!drawingNumber) {
        throw new Error('図番を読み取れませんでした');
    }

    // 4. QRコードを生成して合成
    await drawQRCode(ctx, drawingNumber);

    // 5. 結果の画像をBlobに変換
    const blob = await canvasToBlob(hiddenCanvas);

    // 6. 新しいファイル名を作成
    const newFileName = `${drawingNumber}.png`;

    return {
        originalName: file.name,
        newFileName: newFileName,
        drawingNumber: drawingNumber,
        blob: blob
    };
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
async function extractDrawingNumber(ctx) {
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

    // コントラスト強調（OCR精度向上のため）
    enhanceContrast(tempCtx, tempCanvas.width, tempCanvas.height);

    // Tesseract.js でOCR実行
    const result = await tesseractWorker.recognize(tempCanvas);
    const text = result.data.text;

    // 正規表現で図番を抽出
    const match = text.match(config.drawingNumberPattern);

    if (match) {
        return match[0];
    }

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
// QRコードを生成してキャンバスに描画
// ========================================
async function drawQRCode(ctx, drawingNumber) {
    // QRコードのサイズを計算（枠の 2/3）
    const qrSize = Math.round(config.qrFrame.width * config.qrSizeRatio);

    // QRコードを一時キャンバスに生成
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, drawingNumber, {
        width: qrSize,
        margin: 0,
        errorCorrectionLevel: 'M'
    });

    // QRコードを□枠の中央に配置
    const qrX = config.qrFrame.x + (config.qrFrame.width - qrSize) / 2;
    const qrY = config.qrFrame.y + (config.qrFrame.height - qrSize) / 2;

    // 背景を白で塗りつぶし（QRコードの背景）
    ctx.fillStyle = 'white';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);

    // QRコードを描画
    ctx.drawImage(qrCanvas, qrX, qrY);
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
            <p>エラー内容: ${errorFile.error}</p>
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
