class SqlEditor {
  constructor(options = {}) {
    this.inputElement = options.inputElement || null;
    this.outputElement = options.outputElement || null;
    this.dialect = options.dialect || 'mysql';
    this.hljs = options.hljs || null;
    this.onInput = options.onInput || null;
    this.debounceTimer = null;
    this.debounceDelay = options.debounceDelay || 300;

    this._init();
  }

  _init() {
    if (this.inputElement) {
      this.inputElement.addEventListener('input', () => this._handleInput());
      this.inputElement.addEventListener('keydown', (e) => this._handleKeydown(e));
      this.inputElement.addEventListener('scroll', () => this._syncScroll());
    }
  }

  _handleInput() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      if (this.onInput) {
        this.onInput(this.getValue());
      }
    }, this.debounceDelay);
  }

  _handleKeydown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.inputElement.selectionStart;
      const end = this.inputElement.selectionEnd;
      const value = this.inputElement.value;
      const indent = '  ';
      this.inputElement.value = value.substring(0, start) + indent + value.substring(end);
      this.inputElement.selectionStart = this.inputElement.selectionEnd = start + indent.length;
      this._handleInput();
    }
  }

  _syncScroll() {
    if (this.outputElement && this.inputElement) {
      this.outputElement.scrollTop = this.inputElement.scrollTop;
      this.outputElement.scrollLeft = this.inputElement.scrollLeft;
    }
  }

  getValue() {
    return this.inputElement ? this.inputElement.value : '';
  }

  setValue(value) {
    if (this.inputElement) {
      this.inputElement.value = value;
      this._handleInput();
    }
  }

  setOutput(value, format = true) {
    if (!this.outputElement) return;

    if (this.hljs && format) {
      try {
        const language = this.dialect === 'postgresql' ? 'pgsql' : 'sql';
        const highlighted = this.hljs.highlight(value, { language, ignoreIllegals: true }).value;
        this.outputElement.innerHTML = highlighted;
      } catch (e) {
        this.outputElement.textContent = value;
      }
    } else {
      this.outputElement.textContent = value;
    }
  }

  setDialect(dialect) {
    this.dialect = dialect;
    this._handleInput();
  }

  clear() {
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    if (this.outputElement) {
      this.outputElement.innerHTML = '';
    }
  }

  copy() {
    const value = this.getValue();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SqlEditor;
}
