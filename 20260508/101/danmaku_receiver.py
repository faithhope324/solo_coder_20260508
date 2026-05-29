import random
import time
from PyQt5.QtCore import QThread, pyqtSignal
from datetime import datetime


class Danmaku:
    def __init__(self, username, content, timestamp=None):
        self.username = username
        self.content = content
        self.timestamp = timestamp or datetime.now()
        self.id = int(self.timestamp.timestamp() * 1000000)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'content': self.content,
            'timestamp': self.timestamp.strftime('%H:%M:%S')
        }


class DanmakuReceiverThread(QThread):
    danmaku_received = pyqtSignal(object)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.running = False
        self.simulated_usernames = [
            '追风少年', '月光下的猫', '电竞小王子', '深夜食堂', '快乐肥宅',
            '代码搬运工', '游戏达人', '音乐爱好者', '旅行者', '美食家',
            '科技宅', '动漫迷', '运动健将', '读书人', '摄影师',
            '设计师', '程序员小王', '产品经理', '运营小姐姐', '客服小李'
        ]
        self.simulated_contents = [
            '666', '主播好厉害', '来了来了', '前排占座', '哈哈哈哈',
            '太强了', '学到了', '主播唱首歌吧', '今天天气真好', '支持主播',
            '点赞点赞', '666666', '主播加油', '笑死我了', '这个操作秀',
            '萌新求带', '老粉报道', '主播几点下播', '礼物走一波', '感谢主播',
            '主播今天状态不错', '这个游戏好玩吗', '求链接', '主播多大了',
            '冲冲冲', '奥利给', '太真实了', '我裂开了', '爷青回',
            '有道理', '主播说的对', '涨知识了', '精彩精彩', '绝了'
        ]

    def run(self):
        self.running = True
        while self.running:
            danmaku = self._generate_simulated_danmaku()
            self.danmaku_received.emit(danmaku)
            sleep_time = random.uniform(0.3, 2.0)
            time.sleep(sleep_time)

    def _generate_simulated_danmaku(self):
        username = random.choice(self.simulated_usernames)
        content = random.choice(self.simulated_contents)
        return Danmaku(username, content)

    def stop(self):
        self.running = False
        self.wait()
