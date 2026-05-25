import os
import tempfile
from typing import Tuple, Optional

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False


class PDFParser:
    """PDF文本解析服务"""
    
    def __init__(self):
        self.use_pdfplumber = PDFPLUMBER_AVAILABLE
        self.use_pypdf2 = PYPDF2_AVAILABLE
    
    def _clean_text(self, text: str) -> str:
        """清理提取的文本"""
        if not text:
            return ""
        
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            if stripped:
                cleaned_lines.append(stripped)
        
        text = '\n'.join(cleaned_lines)
        
        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')
        
        text = text.replace('\r', '')
        text = text.replace('\t', ' ')
        
        while '  ' in text:
            text = text.replace('  ', ' ')
        
        return text.strip()
    
    def _parse_with_pdfplumber(self, file_path: str) -> Tuple[str, int]:
        """使用pdfplumber解析PDF"""
        text_parts = []
        page_count = 0
        
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text() or ''
                if page_text.strip():
                    text_parts.append(page_text)
        
        return '\n\n'.join(text_parts), page_count
    
    def _parse_with_pypdf2(self, file_path: str) -> Tuple[str, int]:
        """使用PyPDF2解析PDF（备用方案）"""
        text_parts = []
        page_count = 0
        
        reader = PdfReader(file_path)
        page_count = len(reader.pages)
        
        for page in reader.pages:
            page_text = page.extract_text() or ''
            if page_text.strip():
                text_parts.append(page_text)
        
        return '\n\n'.join(text_parts), page_count
    
    def parse_bytes(self, file_bytes: bytes, filename: str = "document.pdf") -> Tuple[str, int]:
        """从字节流解析PDF"""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(file_bytes)
            tmp_path = tmp_file.name
        
        try:
            text, page_count = self.parse_file(tmp_path)
        finally:
            os.unlink(tmp_path)
        
        return text, page_count
    
    def parse_file(self, file_path: str) -> Tuple[str, int]:
        """解析PDF文件"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        text = ""
        page_count = 0
        
        if self.use_pdfplumber:
            try:
                text, page_count = self._parse_with_pdfplumber(file_path)
            except Exception as e:
                print(f"pdfplumber解析失败，尝试PyPDF2: {e}")
                if self.use_pypdf2:
                    text, page_count = self._parse_with_pypdf2(file_path)
        elif self.use_pypdf2:
            text, page_count = self._parse_with_pypdf2(file_path)
        else:
            raise ImportError("没有可用的PDF解析库，请安装pdfplumber或PyPDF2")
        
        cleaned_text = self._clean_text(text)
        return cleaned_text, page_count
    
    def get_parser_info(self) -> dict:
        """获取解析器信息"""
        return {
            'pdfplumber_available': PDFPLUMBER_AVAILABLE,
            'pypdf2_available': PYPDF2_AVAILABLE,
            'active_parser': 'pdfplumber' if self.use_pdfplumber else 'pypdf2'
        }


pdf_parser = PDFParser()


def parse_pdf(file_bytes: bytes, filename: str) -> Tuple[str, int]:
    """便捷函数：解析PDF"""
    return pdf_parser.parse_bytes(file_bytes, filename)
