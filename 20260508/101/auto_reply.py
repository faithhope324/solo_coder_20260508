import re
import time
from PyQt5.QtCore import QThread, pyqtSignal, QMutex, QMutexLocker
from collections import defaultdict


class ReplyRule:
    def __init__(self, trigger, reply, case_sensitive=False, mode='contains', cooldown=5):
        self.trigger = trigger
        self.reply = reply
        self.case_sensitive = case_sensitive
        self.mode = mode
        self.cooldown = cooldown
        self.last_triggered = 0

    def matches(self, content):
        trigger = self.trigger if self.case_sensitive else self.trigger.lower()
        text = content if self.case_sensitive else content.lower()

        if self.mode == 'exact':
            return text == trigger
        elif self.mode == 'startswith':
            return text.startswith(trigger)
        elif self.mode == 'endswith':
            return text.endswith(trigger)
        elif self.mode == 'regex':
            flags = 0 if self.case_sensitive else re.IGNORECASE
            return bool(re.search(trigger, text, flags))
        else:
            return trigger in text

    def can_trigger(self):
        current_time = time.time()
        return current_time - self.last_triggered >= self.cooldown

    def trigger_reply(self):
        self.last_triggered = time.time()
        return self.reply


class AutoReplySender(QThread):
    reply_sent = pyqtSignal(str, str, str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.running = False
        self.mutex = QMutex()
        self.pending_danmakus = []
        self.reply_rules = []
        self._init_default_rules()

    def _init_default_rules(self):
        default_rules = [
            ReplyRule('666', '感谢@{username} 的666！感谢支持！', cooldown=3),
            ReplyRule('666666', '感谢@{username} 的支持！爱你哦！', cooldown=3),
            ReplyRule('哈哈', '@{username} 笑什么呢这么开心~', cooldown=5),
            ReplyRule('主播加油', '谢谢@{username} 的鼓励！我会继续努力的！', cooldown=10),
            ReplyRule('感谢主播', '@{username} 不客气哦，喜欢就点个关注吧~', cooldown=10),
            ReplyRule('来了', '欢迎@{username} 来到直播间！', cooldown=5),
            ReplyRule('早上好', '早上好@{username}！今天也要元气满满哦~', cooldown=10),
            ReplyRule('晚上好', '晚上好@{username}！欢迎来到直播间~', cooldown=10),
        ]
        self.reply_rules = default_rules

    def run(self):
        self.running = True
        while self.running:
            danmaku = None
            with QMutexLocker(self.mutex):
                if self.pending_danmakus:
                    danmaku = self.pending_danmakus.pop(0)

            if danmaku:
                self._process_danmaku(danmaku)
            else:
                self.msleep(100)

    def _process_danmaku(self, danmaku):
        for rule in self.reply_rules:
            if rule.matches(danmaku.content) and rule.can_trigger():
                reply = rule.trigger_reply()
                reply = reply.format(username=danmaku.username)
                self.reply_sent.emit(danmaku.username, danmaku.content, reply)
                self.msleep(500)

    def add_danmaku(self, danmaku):
        with QMutexLocker(self.mutex):
            self.pending_danmakus.append(danmaku)

    def add_rule(self, trigger, reply, case_sensitive=False, mode='contains', cooldown=5):
        rule = ReplyRule(trigger, reply, case_sensitive, mode, cooldown)
        self.reply_rules.append(rule)
        return True

    def remove_rule(self, index):
        if 0 <= index < len(self.reply_rules):
            self.reply_rules.pop(index)
            return True
        return False

    def update_rule(self, index, trigger=None, reply=None, case_sensitive=None, mode=None, cooldown=None):
        if 0 <= index < len(self.reply_rules):
            rule = self.reply_rules[index]
            if trigger is not None:
                rule.trigger = trigger
            if reply is not None:
                rule.reply = reply
            if case_sensitive is not None:
                rule.case_sensitive = case_sensitive
            if mode is not None:
                rule.mode = mode
            if cooldown is not None:
                rule.cooldown = cooldown
            return True
        return False

    def get_rules(self):
        return [(r.trigger, r.reply, r.mode, r.cooldown) for r in self.reply_rules]

    def clear_rules(self):
        self.reply_rules.clear()
        self._init_default_rules()

    def stop(self):
        self.running = False
        self.wait()
