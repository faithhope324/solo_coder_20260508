class LatexRenderer {
    constructor(outputId) {
        this.outputElement = document.getElementById(outputId);
        this.currentLatex = '';
    }

    render(latex) {
        this.currentLatex = latex;
        
        if (!latex || latex.trim() === '') {
            this.outputElement.innerHTML = '\\[\\text{公式将在这里显示}\\]';
            this.typeset();
            return;
        }

        const safeLatex = this.escapeLatex(latex);
        this.outputElement.innerHTML = `\\[${safeLatex}\\]`;
        this.typeset();
    }

    escapeLatex(latex) {
        return latex
            .replace(/\\(?!frac|sqrt|sum|int|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|infty|text)/g, '\\\\')
            .replace(/\$/g, '\\$')
            .replace(/%/g, '\\%')
            .replace(/#/g, '\\#')
            .replace(/&/g, '\\&');
    }

    typeset() {
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([this.outputElement]).catch(err => {
                console.warn('MathJax typeset error:', err);
            });
        }
    }

    getCurrentLatex() {
        return this.currentLatex;
    }
}

window.LatexRenderer = LatexRenderer;
