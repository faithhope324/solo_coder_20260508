import re
import uuid
from dataclasses import dataclass, field

from .sql_engine import QueryContext


@dataclass
class Message:
    role: str
    content: str
    sql: str = ""
    timestamp: float = 0


@dataclass
class Conversation:
    conv_id: str
    table_id: str
    messages: list[Message] = field(default_factory=list)
    query_context: QueryContext = field(default_factory=QueryContext)

    def add_user(self, content: str):
        self.messages.append(Message(role="user", content=content))

    def add_assistant(self, content: str, sql: str = ""):
        self.messages.append(Message(role="assistant", content=content, sql=sql))


class ConversationManager:
    def __init__(self):
        self._convs: dict[str, Conversation] = {}

    def create(self, table_id: str) -> str:
        conv_id = str(uuid.uuid4())[:8]
        self._convs[conv_id] = Conversation(conv_id=conv_id, table_id=table_id)
        return conv_id

    def get(self, conv_id: str) -> Conversation | None:
        return self._convs.get(conv_id)

    def remove(self, conv_id: str):
        self._convs.pop(conv_id, None)

    def list_by_table(self, table_id: str) -> list[dict]:
        return [
            {"conv_id": c.conv_id, "messages": [m.__dict__ for m in c.messages]}
            for c in self._convs.values() if c.table_id == table_id
        ]


manager = ConversationManager()
