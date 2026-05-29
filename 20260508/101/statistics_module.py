import time
import re
from collections import defaultdict, Counter
from PyQt5.QtCore import QThread, pyqtSignal, QMutex, QMutexLocker
from datetime import datetime, timedelta

try:
    import jieba
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False


class StatisticsModule(QThread):
    stats_updated = pyqtSignal(dict)
    wordcloud_updated = pyqtSignal(list)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.running = False
        self.mutex = QMutex()

        self.total_danmakus = 0
        self.per_minute_counts = defaultdict(int)
        self.hourly_counts = defaultdict(int)
        self.word_counter = Counter()

        self.pending_danmakus = []

        self.max_per_minute_data = 15
        self.max_wordcloud_words = 50
        self.start_time = None

        self.stop_words = set([
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要',
            '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们', '来', '这个', '那个',
            '啊', '呀', '哦', '嗯', '哈', '哈哈', '哈哈哈', '吧', '呢', '吗', '啦', '呗', '嘛',
            '被', '把', '给', '让', '对', '为', '以', '及', '等', '等等',
        ])

    def run(self):
        self.running = True
        if self.start_time is None:
            self.start_time = datetime.now()
        last_update_time = 0
        update_interval = 2

        while self.running:
            current_time = time.time()

            with QMutexLocker(self.mutex):
                while self.pending_danmakus:
                    danmaku = self.pending_danmakus.pop(0)
                    self._process_danmaku(danmaku)

            if current_time - last_update_time >= update_interval:
                self._emit_stats()
                self._emit_wordcloud()
                last_update_time = current_time

            self.msleep(100)

    def _process_danmaku(self, danmaku):
        self.total_danmakus += 1

        minute_key = danmaku.timestamp.strftime('%H:%M')
        self.per_minute_counts[minute_key] += 1

        hour_key = danmaku.timestamp.strftime('%H:00')
        self.hourly_counts[hour_key] += 1

        words = self._extract_words(danmaku.content)
        for word in words:
            if word and len(word) >= 2 and word not in self.stop_words:
                self.word_counter[word] += 1

    def _extract_words(self, content):
        content = re.sub(r'[^\w\u4e00-\u9fff]', ' ', content)

        if JIEBA_AVAILABLE:
            words = jieba.cut(content)
        else:
            words = content.split()

        return [w.strip() for w in words if w.strip()]

    def _emit_stats(self):
        now = datetime.now()
        per_minute_data = []

        if self.start_time is None:
            minutes_to_show = 1
        else:
            elapsed = (now - self.start_time).total_seconds() / 60
            minutes_to_show = min(max(1, int(elapsed) + 2), self.max_per_minute_data)

        for i in range(minutes_to_show - 1, -1, -1):
            dt = now - timedelta(minutes=i)
            key = dt.strftime('%H:%M')
            count = self.per_minute_counts.get(key, 0)
            per_minute_data.append((key, count))

        stats = {
            'total': self.total_danmakus,
            'per_minute': per_minute_data,
            'current_minute_rate': per_minute_data[-1][1] if per_minute_data else 0,
            'avg_rate': self.total_danmakus / max(1, minutes_to_show),
        }

        self.stats_updated.emit(stats)

    def _emit_wordcloud(self):
        top_words = self.word_counter.most_common(self.max_wordcloud_words)
        self.wordcloud_updated.emit(top_words)

    def add_danmaku(self, danmaku):
        with QMutexLocker(self.mutex):
            self.pending_danmakus.append(danmaku)

    def get_top_words(self, n=20):
        return self.word_counter.most_common(n)

    def get_per_minute_data(self, minutes=60):
        now = datetime.now()
        data = []
        for i in range(minutes - 1, -1, -1):
            dt = now - timedelta(minutes=i)
            key = dt.strftime('%H:%M')
            data.append((key, self.per_minute_counts.get(key, 0)))
        return data

    def reset_stats(self):
        with QMutexLocker(self.mutex):
            self.total_danmakus = 0
            self.per_minute_counts.clear()
            self.hourly_counts.clear()
            self.word_counter.clear()
            self.pending_danmakus.clear()
            self.start_time = datetime.now()

        self._emit_stats()
        self._emit_wordcloud()

    def stop(self):
        self.running = False
        self.wait()
