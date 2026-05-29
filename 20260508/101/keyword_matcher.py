import re
from PyQt5.QtGui import QColor


class KeywordMatcher:
    def __init__(self):
        self.highlight_keywords = []
        self.highlight_color = QColor(255, 200, 0)

    def set_highlight_keywords(self, keywords):
        self.highlight_keywords = [kw.strip() for kw in keywords if kw.strip()]

    def set_highlight_color(self, color):
        self.highlight_color = color

    def match(self, content):
        matched_keywords = []
        for keyword in self.highlight_keywords:
            if keyword and keyword in content:
                matched_keywords.append(keyword)
        return matched_keywords

    def highlight_content(self, content):
        if not self.highlight_keywords:
            return content

        highlighted = content
        for keyword in self.highlight_keywords:
            if not keyword:
                continue
            pattern = re.compile(re.escape(keyword), re.IGNORECASE)
            color_hex = self.highlight_color.name()
            highlighted = pattern.sub(
                f'<span style="background-color: {color_hex}; color: black; font-weight: bold;">\\g<0></span>',
                highlighted
            )
        return highlighted

    def add_keyword(self, keyword):
        keyword = keyword.strip()
        if keyword and keyword not in self.highlight_keywords:
            self.highlight_keywords.append(keyword)
            return True
        return False

    def remove_keyword(self, keyword):
        keyword = keyword.strip()
        if keyword in self.highlight_keywords:
            self.highlight_keywords.remove(keyword)
            return True
        return False

    def clear_keywords(self):
        self.highlight_keywords.clear()

    def get_keywords(self):
        return self.highlight_keywords.copy()
