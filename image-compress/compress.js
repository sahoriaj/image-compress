// Compressor Tool Functionality
let originalFile = null;
let compressedBlob = null;
let selectedFormat = 'jpeg';
let originalImageData = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const compressBtn = document.getElementById('compressBtn');
const previewArea = document.getElementById('previewArea');
const status = document.getElementById('status');
const formatBtns = document.querySelectorAll('.format-btn');
const resetBtn = document.getElementById('resetBtn');

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// Theme Toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeIcon.className = isDark ? "fas fa-sun" : "fas fa-moon";
});

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    }
});

formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = btn.dataset.format;
    });
});

compressBtn.addEventListener('click', compressImage);
document.getElementById('downloadBtn').addEventListener('click', downloadImage);
resetBtn.addEventListener('click', resetTool);

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showStatus('Please select a valid image file', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showStatus('File size must be less than 10MB', 'error');
        return;
    }

    originalFile = file;
    controls.style.display = 'block';
    previewArea.style.display = 'none';

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        document.getElementById('originalPreview').src = dataUrl;
        
        const img = new Image();
        img.onload = () => {
            originalImageData = { img, dataUrl };
            document.getElementById('originalSize').textContent = formatFileSize(file.size);
            document.getElementById('originalDimensions').textContent = `${img.width} x ${img.height}`;
            document.getElementById('originalFormat').textContent = file.type.split('/')[1].toUpperCase();
        };
        img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    showStatus('Image loaded! Set target size and click compress.', 'success');
}

async function compressImage() {
    if (!originalFile || !originalImageData) {
        showStatus('Please upload an image first', 'error');
        return;
    }

    const targetSizeKB = parseInt(document.getElementById('targetSize').value);
    if (!targetSizeKB || targetSizeKB < 1) {
        showStatus('Please enter a valid target size', 'error');
        return;
    }

    showStatus('Compressing image...', 'processing');
    compressBtn.disabled = true;

    try {
        const targetSizeBytes = targetSizeKB * 1024;
        const result = await compressToSize(originalImageData.img, targetSizeBytes, selectedFormat);
        
        if (!result) {
            throw new Error('Compression failed');
        }

        compressedBlob = result.blob;

        const compressedUrl = URL.createObjectURL(compressedBlob);
        document.getElementById('compressedPreview').src = compressedUrl;

        document.getElementById('compressedSize').textContent = formatFileSize(compressedBlob.size);
        document.getElementById('compressedDimensions').textContent = `${result.width} x ${result.height}`;
        document.getElementById('compressedFormat').textContent = selectedFormat.toUpperCase();
        
        const reduction = ((1 - compressedBlob.size / originalFile.size) * 100).toFixed(1);
        document.getElementById('reduction').textContent = `${reduction}%`;

        previewArea.style.display = 'block';
        
        if (compressedBlob.size <= targetSizeBytes) {
            showStatus(`✓ Success! Image compressed to ${formatFileSize(compressedBlob.size)}`, 'success');
        } else {
            showStatus(`Compressed to ${formatFileSize(compressedBlob.size)} (best possible)`, 'success');
        }

    } catch (error) {
        console.error('Compression error:', error);
        showStatus('Error: ' + error.message, 'error');
    } finally {
        compressBtn.disabled = false;
    }
}

function compressToSize(img, targetSize, format) {
    return new Promise((resolve) => {
        const mimeType = format === 'png' ? 'image/png' : 
                       format === 'webp' ? 'image/webp' : 'image/jpeg';

        let quality = 0.9;
        let scale = 1.0;
        let attempts = 0;
        const maxAttempts = 20;

        function tryCompress() {
            if (attempts >= maxAttempts) {
                finalCompress();
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            
            canvas.width = w;
            canvas.height = h;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }

                if (blob.size <= targetSize) {
                    resolve({ blob, width: w, height: h });
                    return;
                }

                attempts++;

                const ratio = blob.size / targetSize;
                if (ratio > 2) {
                    scale *= 0.8;
                    quality -= 0.1;
                } else if (ratio > 1.5) {
                    scale *= 0.9;
                    quality -= 0.08;
                } else {
                    quality -= 0.05;
                }

                quality = Math.max(0.05, quality);
                scale = Math.max(0.1, scale);

                setTimeout(tryCompress, 10);
            }, mimeType, quality);
        }

        function finalCompress() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            
            canvas.width = w;
            canvas.height = h;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            
            canvas.toBlob((blob) => {
                resolve(blob ? { blob, width: w, height: h } : null);
            }, mimeType, quality);
        }

        tryCompress();
    });
}

function downloadImage() {
    if (!compressedBlob) return;

    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    const ext = selectedFormat === 'jpeg' ? 'jpg' : selectedFormat;
    a.href = url;
    a.download = `compressed_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetTool() {
    originalFile = null;
    compressedBlob = null;
    originalImageData = null;
    fileInput.value = '';
    controls.style.display = 'none';
    previewArea.style.display = 'none';
    status.style.display = 'none';
    document.getElementById('targetSize').value = '50';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
}
