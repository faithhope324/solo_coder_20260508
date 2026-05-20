from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./data_lineage.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Table(Base):
    __tablename__ = "tables"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    database = Column(String(100))
    schema = Column(String(100))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    columns = relationship("TableColumn", back_populates="table", cascade="all, delete-orphan")
    quality_checks = relationship("DataQualityCheck", back_populates="table", cascade="all, delete-orphan")


class TableColumn(Base):
    __tablename__ = "table_columns"
    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"))
    name = Column(String(255))
    data_type = Column(String(100))
    is_nullable = Column(String(10), default="YES")
    description = Column(Text)
    table = relationship("Table", back_populates="columns")


class ETLPipeline(Base):
    __tablename__ = "etl_pipelines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    task_type = Column(String(100))
    source_code = Column(Text)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run = Column(DateTime)
    status = Column(String(50), default="active")


class LineageRelationship(Base):
    __tablename__ = "lineage_relationships"
    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String(50))
    source_id = Column(Integer)
    target_type = Column(String(50))
    target_id = Column(Integer)
    relationship_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class DataQualityCheck(Base):
    __tablename__ = "data_quality_checks"
    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"))
    check_type = Column(String(100))
    check_name = Column(String(255))
    result = Column(String(50))
    score = Column(Float)
    details = Column(Text)
    checked_at = Column(DateTime, default=datetime.utcnow)
    table = relationship("Table", back_populates="quality_checks")


Base.metadata.create_all(bind=engine)
