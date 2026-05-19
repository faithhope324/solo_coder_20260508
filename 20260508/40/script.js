const ImageLoader = {
    loadFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('请选择有效的图片文件'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => this.loadFromUrl(e.target.result).then(resolve).catch(reject);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    },

    loadFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败，请检查URL是否正确'));
            img.src = url;
        });
    },

    getImageData(img, maxSize = 200) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round(height * (maxSize / width));
                width = maxSize;
            } else {
                width = Math.round(width * (maxSize / height));
                height = maxSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        return ctx.getImageData(0, 0, width, height);
    }
};

const ColorQuantizer = {
    kmeans(pixels, k = 5, maxIterations = 20) {
        const centroids = this.initializeCentroids(pixels, k);
        let assignments = new Array(pixels.length).fill(0);
        let changed = true;
        let iterations = 0;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (let i = 0; i < pixels.length; i++) {
                const pixel = pixels[i];
                let minDist = Infinity;
                let bestCluster = 0;

                for (let j = 0; j < k; j++) {
                    const dist = this.colorDistance(pixel, centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        bestCluster = j;
                    }
                }

                if (assignments[i] !== bestCluster) {
                    assignments[i] = bestCluster;
                    changed = true;
                }
            }

            for (let j = 0; j < k; j++) {
                const clusterPixels = pixels.filter((_, i) => assignments[i] === j);
                if (clusterPixels.length > 0) {
                    centroids[j] = this.averageColor(clusterPixels);
                }
            }
        }

        const clusters = [];
        for (let j = 0; j < k; j++) {
            const clusterPixels = pixels.filter((_, i) => assignments[i] === j);
            const count = clusterPixels.length;
            const representativeColor = this.findRepresentativeColor(clusterPixels, centroids[j]);
            clusters.push({
                color: representativeColor,
                count: count,
                percentage: (count / pixels.length * 100).toFixed(1)
            });
        }

        return clusters.sort((a, b) => b.count - a.count);
    },

    findRepresentativeColor(clusterPixels, centroid) {
        if (clusterPixels.length === 0) return centroid;
        
        let bestColor = centroid;
        let bestScore = -Infinity;
        
        for (const pixel of clusterPixels) {
            const saturation = this.getSaturation(pixel[0], pixel[1], pixel[2]);
            const distToCentroid = Math.sqrt(this.colorDistance(pixel, centroid));
            const score = saturation * 100 - distToCentroid * 0.5;
            
            if (score > bestScore) {
                bestScore = score;
                bestColor = pixel;
            }
        }
        
        return bestColor;
    },

    getSaturation(r, g, b) {
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;
        
        if (max === min) return 0;
        
        const d = max - min;
        return l > 0.5 ? d / (2 - max - min) : d / (max + min);
    },

    initializeCentroids(pixels, k) {
        const centroids = [];
        const step = Math.floor(pixels.length / k);
        for (let i = 0; i < k; i++) {
            const index = Math.min(i * step + Math.floor(Math.random() * step), pixels.length - 1);
            centroids.push([...pixels[index]]);
        }
        return centroids;
    },

    colorDistance(c1, c2) {
        const dr = c1[0] - c2[0];
        const dg = c1[1] - c2[1];
        const db = c1[2] - c2[2];
        return dr * dr + dg * dg + db * db;
    },

    averageColor(pixels) {
        let r = 0, g = 0, b = 0;
        for (const pixel of pixels) {
            r += pixel[0];
            g += pixel[1];
            b += pixel[2];
        }
        const n = pixels.length;
        return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    },

    extractPixels(imageData) {
        const pixels = [];
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 128) {
                pixels.push([r, g, b]);
            }
        }
        
        return pixels;
    }
};

const PaletteGenerator = {
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    },

    isLightColor(r, g, b) {
        return this.getLuminance(r, g, b) > 0.5;
    },

    getContrastColor(r, g, b) {
        return this.isLightColor(r, g, b) ? [26, 32, 44] : [255, 255, 255];
    },

    generateTheme(colors) {
        const sortedColors = [...colors].sort((a, b) => b.count - a.count);
        
        const dominant = sortedColors[0].color;
        const secondary = sortedColors[1]?.color || sortedColors[0].color;
        const accent = sortedColors.find((c, i) => i > 0 && this.isColorAccent(c.color, dominant))?.color || 
                       sortedColors[2]?.color || sortedColors[1]?.color || sortedColors[0].color;
        
        const isLightBg = this.isLightColor(dominant[0], dominant[1], dominant[2]);
        
        const bgColor = dominant;
        const textColor = this.getContrastColor(dominant[0], dominant[1], dominant[2]);
        const headingColor = this.isLightColor(secondary[0], secondary[1], secondary[2]) ? 
            this.darkenColor(secondary, 0.3) : this.lightenColor(secondary, 0.2);
        const accentColor = accent;
        const accentText = this.getContrastColor(accent[0], accent[1], accent[2]);
        const borderColor = this.isLightBg ? 
            this.darkenColor(bgColor, 0.15) : this.lightenColor(bgColor, 0.15);

        return {
            bgColor,
            textColor,
            headingColor,
            accentColor,
            accentText,
            borderColor,
            isLightBg
        };
    },

    isColorAccent(color1, color2) {
        const dist = ColorQuantizer.colorDistance(color1, color2);
        return dist > 15000;
    },

    lightenColor(rgb, amount) {
        return rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount)));
    },

    darkenColor(rgb, amount) {
        return rgb.map(c => Math.max(0, Math.round(c * (1 - amount))));
    }
};

const CSSOutput = {
    generateCSSVars(theme) {
        return `:root {
    --color-bg: ${PaletteGenerator.rgbToHex(...theme.bgColor)};
    --color-text: ${PaletteGenerator.rgbToHex(...theme.textColor)};
    --color-heading: ${PaletteGenerator.rgbToHex(...theme.headingColor)};
    --color-accent: ${PaletteGenerator.rgbToHex(...theme.accentColor)};
    --color-accent-text: ${PaletteGenerator.rgbToHex(...theme.accentText)};
    --color-border: ${PaletteGenerator.rgbToHex(...theme.borderColor)};
}`;
    },

    generateFullCSS(theme) {
        return `:root {
    --color-bg: ${PaletteGenerator.rgbToHex(...theme.bgColor)};
    --color-text: ${PaletteGenerator.rgbToHex(...theme.textColor)};
    --color-heading: ${PaletteGenerator.rgbToHex(...theme.headingColor)};
    --color-accent: ${PaletteGenerator.rgbToHex(...theme.accentColor)};
    --color-accent-text: ${PaletteGenerator.rgbToHex(...theme.accentText)};
    --color-border: ${PaletteGenerator.rgbToHex(...theme.borderColor)};
}

body {
    background-color: var(--color-bg);
    color: var(--color-text);
}

h1, h2, h3, h4, h5, h6 {
    color: var(--color-heading);
}

a {
    color: var(--color-accent);
}

.btn-primary {
    background-color: var(--color-accent);
    color: var(--color-accent-text);
    border: none;
}

.border {
    border-color: var(--color-border);
}`;
    }
};

const UIController = {
    elements: {},
    currentColors: [],
    currentTheme: null,

    init() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            uploadBox: document.getElementById('uploadBox'),
            fileInput: document.getElementById('fileInput'),
            urlInput: document.getElementById('urlInput'),
            urlLoadBtn: document.getElementById('urlLoadBtn'),
            previewSection: document.getElementById('previewSection'),
            previewImage: document.getElementById('previewImage'),
            paletteSection: document.getElementById('paletteSection'),
            paletteContainer: document.getElementById('paletteContainer'),
            cssSection: document.getElementById('cssSection'),
            cssCode: document.getElementById('cssCode'),
            copyCssBtn: document.getElementById('copyCssBtn'),
            themePreview: document.getElementById('themePreview'),
            toast: document.getElementById('toast')
        };
    },

    bindEvents() {
        this.elements.uploadBox.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.urlLoadBtn.addEventListener('click', () => this.handleUrlLoad());
        this.elements.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUrlLoad();
        });
        this.elements.copyCssBtn.addEventListener('click', () => this.copyCSS());

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.elements.uploadBox.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.elements.uploadBox.addEventListener(eventName, () => {
                this.elements.uploadBox.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.elements.uploadBox.addEventListener(eventName, () => {
                this.elements.uploadBox.classList.remove('drag-over');
            });
        });

        this.elements.uploadBox.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processImageFile(files[0]);
            }
        });
    },

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            await this.processImageFile(file);
        }
    },

    async handleUrlLoad() {
        const url = this.elements.urlInput.value.trim();
        if (!url) {
            this.showToast('请输入图片URL');
            return;
        }
        await this.processImageUrl(url);
    },

    async processImageFile(file) {
        try {
            this.showToast('正在处理图片...');
            const img = await ImageLoader.loadFromFile(file);
            await this.processImage(img);
        } catch (error) {
            this.showToast(error.message);
        }
    },

    async processImageUrl(url) {
        try {
            this.showToast('正在加载图片...');
            const img = await ImageLoader.loadFromUrl(url);
            await this.processImage(img);
        } catch (error) {
            this.showToast(error.message);
        }
    },

    async processImage(img) {
        this.elements.previewImage.src = img.src;
        this.elements.previewSection.style.display = 'block';

        const imageData = ImageLoader.getImageData(img);
        const pixels = ColorQuantizer.extractPixels(imageData);
        
        this.showToast('正在提取颜色...');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const clusters = ColorQuantizer.kmeans(pixels, 5);
        this.currentColors = clusters;
        
        this.renderPalette(clusters);
        
        const theme = PaletteGenerator.generateTheme(clusters);
        this.currentTheme = theme;
        
        this.renderTheme(theme);
        this.renderCSS(theme);
        
        this.elements.paletteSection.style.display = 'block';
        this.elements.cssSection.style.display = 'block';
        
        this.showToast('颜色提取完成！');
    },

    renderPalette(colors) {
        this.elements.paletteContainer.innerHTML = colors.map((c, index) => {
            const hex = PaletteGenerator.rgbToHex(...c.color);
            return `
                <div class="color-card" data-hex="${hex}" onclick="UIController.copyColor('${hex}')">
                    <div class="color-swatch" style="background-color: ${hex};">
                        <span class="copy-tooltip">点击复制</span>
                    </div>
                    <div class="color-info">
                        <div class="color-hex">${hex}</div>
                        <div class="color-percent">${c.percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderTheme(theme) {
        const bgHex = PaletteGenerator.rgbToHex(...theme.bgColor);
        const textHex = PaletteGenerator.rgbToHex(...theme.textColor);
        const headingHex = PaletteGenerator.rgbToHex(...theme.headingColor);
        const accentHex = PaletteGenerator.rgbToHex(...theme.accentColor);
        const accentTextHex = PaletteGenerator.rgbToHex(...theme.accentText);

        this.elements.themePreview.style.backgroundColor = bgHex;
        this.elements.themePreview.style.color = textHex;
        this.elements.themePreview.style.display = 'block';
        
        const titleEl = this.elements.themePreview.querySelector('.theme-title');
        const textEl = this.elements.themePreview.querySelector('.theme-text');
        const btnEl = this.elements.themePreview.querySelector('.theme-btn');
        
        if (titleEl) {
            titleEl.style.color = headingHex;
            titleEl.style.display = 'block';
        }
        if (textEl) {
            textEl.style.color = textHex;
            textEl.style.display = 'block';
        }
        if (btnEl) {
            btnEl.style.backgroundColor = accentHex;
            btnEl.style.color = accentTextHex;
            btnEl.style.display = 'inline-block';
            btnEl.onclick = () => {
                navigator.clipboard.writeText(accentHex).then(() => {
                    this.showToast(`强调色已复制: ${accentHex}`);
                }).catch(() => {
                    this.showToast('复制失败，请手动复制');
                });
            };
        }
    },

    renderCSS(theme) {
        this.elements.cssCode.textContent = CSSOutput.generateFullCSS(theme);
    },

    copyColor(hex) {
        navigator.clipboard.writeText(hex).then(() => {
            this.showToast(`已复制: ${hex}`);
        }).catch(() => {
            this.showToast('复制失败，请手动复制');
        });
    },

    copyCSS() {
        const css = this.elements.cssCode.textContent;
        navigator.clipboard.writeText(css).then(() => {
            this.elements.copyCssBtn.classList.add('copied');
            this.elements.copyCssBtn.innerHTML = '<span class="copy-icon">✅</span>已复制';
            this.showToast('CSS变量已复制到剪贴板');
            
            setTimeout(() => {
                this.elements.copyCssBtn.classList.remove('copied');
                this.elements.copyCssBtn.innerHTML = '<span class="copy-icon">📋</span>复制CSS';
            }, 2000);
        }).catch(() => {
            this.showToast('复制失败，请手动复制');
        });
    },

    showToast(message) {
        this.elements.toast.textContent = message;
        this.elements.toast.classList.add('show');
        
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 2000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UIController.init();
});
