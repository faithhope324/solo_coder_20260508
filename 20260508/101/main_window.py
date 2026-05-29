import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QListWidget, QListWidgetItem, QLabel, QPushButton, QLineEdit,
                             QComboBox, QCheckBox, QSpinBox, QTextEdit, QTabWidget,
                             QGroupBox, QFormLayout, QSplitter, QTableWidget, QTableWidgetItem,
                             QHeaderView, QColorDialog, QMessageBox, QAbstractItemView)
from PyQt5.QtGui import QColor, QFont, QTextCursor, QBrush, QIcon
from PyQt5.QtCore import Qt, QTimer
from datetime import datetime

import matplotlib
matplotlib.use('Qt5Agg')
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib.pyplot as plt
from matplotlib import rcParams

rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
rcParams['axes.unicode_minus'] = False

from danmaku_receiver import DanmakuReceiverThread, Danmaku
from keyword_matcher import KeywordMatcher
from auto_reply import AutoReplySender
from statistics_module import StatisticsModule


class DanmakuListWidget(QListWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setSelectionMode(QAbstractItemView.NoSelection)
        self.setVerticalScrollMode(QAbstractItemView.ScrollPerPixel)
        self.setWordWrap(True)
        self.max_items = 500

    def add_danmaku(self, danmaku, highlighted_content):
        item = QListWidgetItem()
        item.setData(Qt.UserRole, danmaku)

        display_text = (
            f'<span style="color: #888;">[{danmaku.timestamp.strftime("%H:%M:%S")}]</span> '
            f'<span style="color: #4A90D9; font-weight: bold;">{danmaku.username}</span>: '
            f'<span style="color: #333;">{highlighted_content}</span>'
        )

        item.setData(Qt.DisplayRole, display_text)
        self.addItem(item)

        if self.count() > self.max_items:
            self.takeItem(0)

        self.scrollToBottom()


class StatsCanvas(FigureCanvas):
    def __init__(self, parent=None, width=8, height=3, dpi=100):
        self.fig = Figure(figsize=(width, height), dpi=dpi)
        self.axes = self.fig.add_subplot(111)
        super().__init__(self.fig)
        self.setParent(parent)
        self._setup_style()

    def _setup_style(self):
        self.axes.set_facecolor('#f5f5f5')
        self.fig.patch.set_facecolor('#f5f5f5')
        self.axes.grid(True, linestyle='--', alpha=0.7)
        for spine in self.axes.spines.values():
            spine.set_color('#ccc')

    def update_line_chart(self, per_minute_data):
        self.axes.clear()
        self._setup_style()

        if not per_minute_data:
            return

        times = [d[0] for d in per_minute_data]
        counts = [d[1] for d in per_minute_data]

        self.axes.plot(times, counts, marker='o', markersize=3,
                       linewidth=2, color='#4A90D9', markerfacecolor='#FF6B6B')
        self.axes.fill_between(times, counts, alpha=0.3, color='#4A90D9')

        self.axes.set_ylabel('弹幕数/分钟', fontsize=10)
        self.axes.set_title('每分钟弹幕数量趋势', fontsize=12, fontweight='bold')

        step = max(1, len(times) // 10)
        self.axes.set_xticks(range(0, len(times), step))
        self.axes.set_xticklabels([times[i] for i in range(0, len(times), step)],
                                  rotation=45, ha='right', fontsize=8)

        self.fig.tight_layout()
        self.draw()


class WordCloudCanvas(FigureCanvas):
    def __init__(self, parent=None, width=8, height=3, dpi=100):
        self.fig = Figure(figsize=(width, height), dpi=dpi)
        self.axes = self.fig.add_subplot(111)
        super().__init__(self.fig)
        self.setParent(parent)
        self._setup_style()

    def _setup_style(self):
        self.axes.set_facecolor('#f5f5f5')
        self.fig.patch.set_facecolor('#f5f5f5')
        for spine in self.axes.spines.values():
            spine.set_visible(False)
        self.axes.set_xticks([])
        self.axes.set_yticks([])

    def update_wordcloud(self, word_data):
        self.axes.clear()
        self._setup_style()

        if not word_data:
            self.axes.text(0.5, 0.5, '暂无数据', ha='center', va='center',
                           fontsize=14, color='#888', transform=self.axes.transAxes)
            self.draw()
            return

        top_words = word_data[:20]
        max_count = max(w[1] for w in top_words) if top_words else 1

        import random
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
                  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']

        for i, (word, count) in enumerate(reversed(top_words)):
            font_size = 8 + (count / max_count) * 20
            color = random.choice(colors)
            x = 0.1 + random.uniform(-0.05, 0.05)
            y = (i + 0.5) / len(top_words)
            self.axes.text(x, y, f'{word} ({count})', fontsize=font_size,
                           color=color, fontweight='bold', va='center')

        self.axes.set_title('热门词汇', fontsize=12, fontweight='bold')
        self.axes.set_xlim(0, 1)
        self.axes.set_ylim(0, 1)
        self.draw()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('直播弹幕监视器')
        self.resize(1400, 900)

        self.danmaku_receiver = None
        self.auto_reply_sender = None
        self.statistics_module = None
        self.keyword_matcher = KeywordMatcher()

        self.is_running = False
        self.auto_reply_enabled = True
        self.auto_scroll_enabled = True

        self._init_modules()
        self._init_ui()
        self._connect_signals()

    def _init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(10)

        control_bar = self._create_control_bar()
        main_layout.addWidget(control_bar)

        stats_bar = self._create_stats_bar()
        main_layout.addWidget(stats_bar)

        splitter = QSplitter(Qt.Horizontal)

        left_panel = self._create_left_panel()
        right_panel = self._create_right_panel()

        splitter.addWidget(left_panel)
        splitter.addWidget(right_panel)
        splitter.setStretchFactor(0, 2)
        splitter.setStretchFactor(1, 1)

        main_layout.addWidget(splitter, 1)

    def _create_control_bar(self):
        group = QGroupBox('控制面板')
        layout = QHBoxLayout(group)

        self.btn_start = QPushButton('▶ 开始接收')
        self.btn_start.setStyleSheet('background-color: #4CAF50; color: white; font-weight: bold; padding: 8px 16px;')
        self.btn_start.clicked.connect(self.toggle_receiver)

        self.btn_stop = QPushButton('⏹ 停止接收')
        self.btn_stop.setStyleSheet('background-color: #f44336; color: white; font-weight: bold; padding: 8px 16px;')
        self.btn_stop.clicked.connect(self.toggle_receiver)
        self.btn_stop.setEnabled(False)

        self.chk_auto_reply = QCheckBox('启用自动回复')
        self.chk_auto_reply.setChecked(True)
        self.chk_auto_reply.stateChanged.connect(self.toggle_auto_reply)

        self.chk_auto_scroll = QCheckBox('自动滚动')
        self.chk_auto_scroll.setChecked(True)
        self.chk_auto_scroll.stateChanged.connect(self.toggle_auto_scroll)

        self.btn_clear = QPushButton('清空列表')
        self.btn_clear.clicked.connect(self.clear_danmaku_list)

        self.btn_reset_stats = QPushButton('重置统计')
        self.btn_reset_stats.clicked.connect(self.reset_statistics)

        layout.addWidget(self.btn_start)
        layout.addWidget(self.btn_stop)
        layout.addSpacing(20)
        layout.addWidget(self.chk_auto_reply)
        layout.addWidget(self.chk_auto_scroll)
        layout.addStretch()
        layout.addWidget(self.btn_clear)
        layout.addWidget(self.btn_reset_stats)

        return group

    def _create_stats_bar(self):
        group = QGroupBox('实时统计')
        layout = QHBoxLayout(group)

        self.lbl_total = QLabel('总弹幕数: 0')
        self.lbl_total.setFont(QFont('Arial', 12, QFont.Bold))
        self.lbl_total.setStyleSheet('color: #4A90D9;')

        self.lbl_rate = QLabel('当前速率: 0 条/分钟')
        self.lbl_rate.setFont(QFont('Arial', 12, QFont.Bold))
        self.lbl_rate.setStyleSheet('color: #FF6B6B;')

        self.lbl_avg = QLabel('平均速率: 0 条/分钟')
        self.lbl_avg.setFont(QFont('Arial', 12, QFont.Bold))
        self.lbl_avg.setStyleSheet('color: #4ECDC4;')

        self.lbl_replies = QLabel('自动回复: 0 条')
        self.lbl_replies.setFont(QFont('Arial', 12, QFont.Bold))
        self.lbl_replies.setStyleSheet('color: #9C27B0;')

        self.reply_count = 0

        layout.addWidget(self.lbl_total)
        layout.addSpacing(30)
        layout.addWidget(self.lbl_rate)
        layout.addSpacing(30)
        layout.addWidget(self.lbl_avg)
        layout.addSpacing(30)
        layout.addWidget(self.lbl_replies)
        layout.addStretch()

        return group

    def _create_left_panel(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)

        tabs = QTabWidget()

        danmaku_tab = QWidget()
        danmaku_layout = QVBoxLayout(danmaku_tab)

        danmaku_header = QHBoxLayout()
        danmaku_header.addWidget(QLabel('<b>弹幕列表</b>'))
        danmaku_header.addStretch()
        danmaku_layout.addLayout(danmaku_header)

        self.danmaku_list = DanmakuListWidget()
        danmaku_layout.addWidget(self.danmaku_list)

        reply_tab = QWidget()
        reply_layout = QVBoxLayout(reply_tab)
        reply_layout.addWidget(QLabel('<b>自动回复记录</b>'))

        self.reply_list = QTextEdit()
        self.reply_list.setReadOnly(True)
        self.reply_list.setFont(QFont('Consolas', 10))
        reply_layout.addWidget(self.reply_list)

        tabs.addTab(danmaku_tab, '弹幕列表')
        tabs.addTab(reply_tab, '回复记录')

        layout.addWidget(tabs)

        return widget

    def _create_right_panel(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)

        tabs = QTabWidget()

        stats_tab = QWidget()
        stats_layout = QVBoxLayout(stats_tab)

        self.stats_canvas = StatsCanvas()
        stats_layout.addWidget(self.stats_canvas)

        self.wordcloud_canvas = WordCloudCanvas()
        stats_layout.addWidget(self.wordcloud_canvas)

        keyword_tab = QWidget()
        keyword_layout = QVBoxLayout(keyword_tab)

        keyword_form = QFormLayout()
        self.keyword_input = QLineEdit()
        self.keyword_input.setPlaceholderText('输入关键词，按回车添加')
        self.keyword_input.returnPressed.connect(self.add_keyword)

        self.btn_add_keyword = QPushButton('添加关键词')
        self.btn_add_keyword.clicked.connect(self.add_keyword)

        self.btn_color = QPushButton('选择高亮颜色')
        self.btn_color.clicked.connect(self.choose_highlight_color)

        self.keyword_list = QListWidget()
        self.keyword_list.setSelectionMode(QAbstractItemView.SingleSelection)

        self.btn_remove_keyword = QPushButton('删除选中关键词')
        self.btn_remove_keyword.clicked.connect(self.remove_keyword)

        self.btn_clear_keywords = QPushButton('清空所有关键词')
        self.btn_clear_keywords.clicked.connect(self.clear_keywords)

        keyword_form.addRow('关键词:', self.keyword_input)
        keyword_form.addRow('', self.btn_add_keyword)
        keyword_form.addRow('高亮颜色:', self.btn_color)
        keyword_layout.addLayout(keyword_form)
        keyword_layout.addWidget(QLabel('<b>已添加的关键词:</b>'))
        keyword_layout.addWidget(self.keyword_list)

        btn_row = QHBoxLayout()
        btn_row.addWidget(self.btn_remove_keyword)
        btn_row.addWidget(self.btn_clear_keywords)
        keyword_layout.addLayout(btn_row)

        default_keywords = ['666', '主播', '感谢', '加油', '哈哈']
        for kw in default_keywords:
            self.keyword_matcher.add_keyword(kw)
            self.keyword_list.addItem(kw)

        reply_rules_tab = QWidget()
        reply_rules_layout = QVBoxLayout(reply_rules_tab)

        self.rules_table = QTableWidget(0, 4)
        self.rules_table.setHorizontalHeaderLabels(['触发词', '回复内容', '匹配模式', '冷却(秒)'])
        self.rules_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.rules_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.rules_table.setEditTriggers(QAbstractItemView.AllEditTriggers)

        self._load_rules_to_table()

        btn_layout = QHBoxLayout()
        self.btn_add_rule = QPushButton('添加规则')
        self.btn_add_rule.clicked.connect(self.add_rule)
        self.btn_remove_rule = QPushButton('删除规则')
        self.btn_remove_rule.clicked.connect(self.remove_rule)
        self.btn_save_rules = QPushButton('保存规则')
        self.btn_save_rules.clicked.connect(self.save_rules)

        btn_layout.addWidget(self.btn_add_rule)
        btn_layout.addWidget(self.btn_remove_rule)
        btn_layout.addWidget(self.btn_save_rules)

        reply_rules_layout.addWidget(QLabel('<b>自动回复规则 (回复内容中可用 {username} 代替用户名)</b>'))
        reply_rules_layout.addWidget(self.rules_table)
        reply_rules_layout.addLayout(btn_layout)

        tabs.addTab(stats_tab, '统计图表')
        tabs.addTab(keyword_tab, '关键词设置')
        tabs.addTab(reply_rules_tab, '回复规则')

        layout.addWidget(tabs)

        return widget

    def _init_modules(self):
        self.danmaku_receiver = DanmakuReceiverThread()
        self.auto_reply_sender = AutoReplySender()
        self.statistics_module = StatisticsModule()

    def _connect_signals(self):
        self.danmaku_receiver.danmaku_received.connect(self.on_danmaku_received)
        self.auto_reply_sender.reply_sent.connect(self.on_reply_sent)
        self.statistics_module.stats_updated.connect(self.on_stats_updated)
        self.statistics_module.wordcloud_updated.connect(self.on_wordcloud_updated)

    def _load_rules_to_table(self):
        rules = self.auto_reply_sender.get_rules()
        self.rules_table.setRowCount(len(rules))
        for row, (trigger, reply, mode, cooldown) in enumerate(rules):
            self.rules_table.setItem(row, 0, QTableWidgetItem(trigger))
            self.rules_table.setItem(row, 1, QTableWidgetItem(reply))

            mode_combo = QComboBox()
            mode_combo.addItems(['包含', '完全匹配', '开头', '结尾', '正则'])
            mode_map = {'contains': 0, 'exact': 1, 'startswith': 2, 'endswith': 3, 'regex': 4}
            mode_combo.setCurrentIndex(mode_map.get(mode, 0))
            self.rules_table.setCellWidget(row, 2, mode_combo)

            cooldown_spin = QSpinBox()
            cooldown_spin.setRange(0, 3600)
            cooldown_spin.setValue(cooldown)
            self.rules_table.setCellWidget(row, 3, cooldown_spin)

    def toggle_receiver(self):
        if not self.is_running:
            if self.statistics_module.start_time is None:
                self.statistics_module.start_time = datetime.now()
            self.danmaku_receiver.start()
            self.auto_reply_sender.start()
            self.statistics_module.start()
            self.is_running = True
            self.btn_start.setEnabled(False)
            self.btn_stop.setEnabled(True)
        else:
            self.danmaku_receiver.stop()
            self.auto_reply_sender.stop()
            self.statistics_module.stop()
            self.is_running = False
            self.btn_start.setEnabled(True)
            self.btn_stop.setEnabled(False)

    def on_danmaku_received(self, danmaku):
        highlighted = self.keyword_matcher.highlight_content(danmaku.content)
        self.danmaku_list.add_danmaku(danmaku, highlighted)

        if self.auto_reply_enabled:
            self.auto_reply_sender.add_danmaku(danmaku)

        self.statistics_module.add_danmaku(danmaku)

    def on_reply_sent(self, username, original_content, reply):
        self.reply_count += 1
        self.lbl_replies.setText(f'自动回复: {self.reply_count} 条')

        log_text = (
            f'[{self._current_time()}] '
            f'<span style="color: #4A90D9;">回复 @{username}</span>: '
            f'原内容: "{original_content}" → '
            f'<span style="color: #4CAF50;">{reply}</span><br>'
        )
        self.reply_list.moveCursor(QTextCursor.End)
        self.reply_list.insertHtml(log_text)
        self.reply_list.moveCursor(QTextCursor.End)

    def on_stats_updated(self, stats):
        self.lbl_total.setText(f'总弹幕数: {stats["total"]}')
        self.lbl_rate.setText(f'当前速率: {stats["current_minute_rate"]} 条/分钟')
        self.lbl_avg.setText(f'平均速率: {stats["avg_rate"]:.1f} 条/分钟')
        self.stats_canvas.update_line_chart(stats['per_minute'])

    def on_wordcloud_updated(self, word_data):
        self.wordcloud_canvas.update_wordcloud(word_data)

    def toggle_auto_reply(self, state):
        self.auto_reply_enabled = (state == Qt.Checked)

    def toggle_auto_scroll(self, state):
        self.auto_scroll_enabled = (state == Qt.Checked)

    def clear_danmaku_list(self):
        self.danmaku_list.clear()

    def reset_statistics(self):
        reply = QMessageBox.question(self, '确认', '确定要重置所有统计数据吗？',
                                     QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            self.statistics_module.reset_stats()
            self.reply_count = 0
            self.lbl_replies.setText('自动回复: 0 条')
            self.lbl_total.setText('总弹幕数: 0')
            self.lbl_rate.setText('当前速率: 0 条/分钟')
            self.lbl_avg.setText('平均速率: 0 条/分钟')

    def add_keyword(self):
        keyword = self.keyword_input.text().strip()
        if keyword and self.keyword_matcher.add_keyword(keyword):
            self.keyword_list.addItem(keyword)
            self.keyword_input.clear()

    def remove_keyword(self):
        current_item = self.keyword_list.currentItem()
        if current_item:
            keyword = current_item.text()
            self.keyword_matcher.remove_keyword(keyword)
            self.keyword_list.takeItem(self.keyword_list.row(current_item))

    def clear_keywords(self):
        self.keyword_matcher.clear_keywords()
        self.keyword_list.clear()

    def choose_highlight_color(self):
        color = QColorDialog.getColor(self.keyword_matcher.highlight_color, self, '选择高亮颜色')
        if color.isValid():
            self.keyword_matcher.set_highlight_color(color)

    def add_rule(self):
        row = self.rules_table.rowCount()
        self.rules_table.insertRow(row)
        self.rules_table.setItem(row, 0, QTableWidgetItem(''))
        self.rules_table.setItem(row, 1, QTableWidgetItem(''))

        mode_combo = QComboBox()
        mode_combo.addItems(['包含', '完全匹配', '开头', '结尾', '正则'])
        self.rules_table.setCellWidget(row, 2, mode_combo)

        cooldown_spin = QSpinBox()
        cooldown_spin.setRange(0, 3600)
        cooldown_spin.setValue(5)
        self.rules_table.setCellWidget(row, 3, cooldown_spin)

    def remove_rule(self):
        current_row = self.rules_table.currentRow()
        if current_row >= 0:
            self.rules_table.removeRow(current_row)

    def save_rules(self):
        mode_reverse_map = {0: 'contains', 1: 'exact', 2: 'startswith', 3: 'endswith', 4: 'regex'}
        rules = []

        for row in range(self.rules_table.rowCount()):
            trigger_item = self.rules_table.item(row, 0)
            reply_item = self.rules_table.item(row, 1)
            mode_combo = self.rules_table.cellWidget(row, 2)
            cooldown_spin = self.rules_table.cellWidget(row, 3)

            if trigger_item and reply_item and trigger_item.text().strip():
                trigger = trigger_item.text().strip()
                reply = reply_item.text().strip()
                mode = mode_reverse_map.get(mode_combo.currentIndex(), 'contains')
                cooldown = cooldown_spin.value()
                rules.append((trigger, reply, mode, cooldown))

        self.auto_reply_sender.reply_rules.clear()
        for trigger, reply, mode, cooldown in rules:
            self.auto_reply_sender.add_rule(trigger, reply, mode=mode, cooldown=cooldown)

        QMessageBox.information(self, '成功', f'已保存 {len(rules)} 条规则！')

    def _current_time(self):
        from datetime import datetime
        return datetime.now().strftime('%H:%M:%S')

    def closeEvent(self, event):
        if self.danmaku_receiver and self.danmaku_receiver.isRunning():
            self.danmaku_receiver.stop()
        if self.auto_reply_sender and self.auto_reply_sender.isRunning():
            self.auto_reply_sender.stop()
        if self.statistics_module and self.statistics_module.isRunning():
            self.statistics_module.stop()
        event.accept()
