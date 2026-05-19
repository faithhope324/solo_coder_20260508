class MathRecognitionApp {
    constructor() {
        this.canvas = new DrawingCanvas('drawingCanvas');
        this.recognizer = new MathRecognizer();
        this.renderer = new LatexRenderer('mathOutput');
        this.latexCodeElement = document.getElementById('latexCode');
        this.debugOutput = document.getElementById('debugOutput');
        this.init();
    }

    init() {
        this.attachEvents();
    }

    attachEvents() {
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearCanvas();
        });

        document.getElementById('recognizeBtn').addEventListener('click', () => {
            this.recognize();
        });

        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.canvas.setBrushSize(parseInt(e.target.value));
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyLatex();
        });

        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const latex = e.target.getAttribute('data-latex');
                this.showLatex(latex, true);
            });
        });
    }

    clearCanvas() {
        this.canvas.clear();
        this.latexCodeElement.textContent = '点击"识别公式"或选择示例...';
        this.renderer.render('');
    }

    recognize() {
        const strokes = this.canvas.getStrokes();
        
        if (strokes.length === 0) {
            this.latexCodeElement.textContent = '请先在画板上绘制公式！';
            this.debugOutput.textContent = '没有检测到笔画，请先在画板上绘制公式。';
            this.showToast('请先绘制公式');
            return;
        }

        const result = this.recognizer.recognize(
            strokes,
            this.canvas.canvas.width,
            this.canvas.canvas.height
        );

        this.showLatex(result.latex);
        
        if (result.debug) {
            this.debugOutput.textContent = result.debug;
        }
        
        const confidence = Math.round(result.confidence * 100);
        if (confidence < 50) {
            this.showToast(`识别完成，置信度: ${confidence}%。建议尝试示例或重新绘制。`);
        } else {
            this.showToast(`识别完成！置信度: ${confidence}%`);
        }
    }

    showLatex(latex, fromExample = false) {
        this.latexCodeElement.textContent = latex;
        this.renderer.render(latex);
        if (fromExample) {
            this.debugOutput.textContent = '已加载示例公式。请在左侧画板手写公式后点击"识别公式"按钮进行手写识别。';
        }
    }

    async copyLatex() {
        const latex = this.latexCodeElement.textContent;
        if (!latex || latex.includes('点击') || latex.includes('请先')) {
            this.showToast('没有可复制的内容');
            return;
        }

        try {
            await navigator.clipboard.writeText(latex);
            this.showToast('LaTeX 代码已复制到剪贴板！');
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = latex;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('LaTeX 代码已复制！');
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes slideUp {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    window.app = new MathRecognitionApp();
});
