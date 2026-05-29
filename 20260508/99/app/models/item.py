from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False, index=True)
    description = Column(String(2000), default="")
    price = Column(Float, nullable=False)
    category = Column(String(50), index=True)
    image_url = Column(String(255), default="")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_sold = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", backref="items")
