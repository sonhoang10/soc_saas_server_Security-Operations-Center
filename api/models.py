from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from api.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255))
    password_hash = Column(String(255))
    google_id = Column(String(255), unique=True)
    phone = Column(String(50))
    is_superadmin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Team(Base):
    __tablename__ = "teams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    unique_name = Column(String(255), unique=True, index=True, nullable=False)
    company_email = Column(String(255))
    company_phone = Column(String(50))
    
    industry = Column(String(100))
    company_size = Column(String(50))
    timezone_region = Column(String(100))
    use_case = Column(String(100))
    tax_id = Column(String(100))
    description = Column(Text)
    
    plan_tier = Column(String(50), default="standard")
    max_servers = Column(Integer, default=3)
    
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    assets = relationship("MonitoredAsset", back_populates="team", cascade="all, delete-orphan")
    log_sources = relationship("LogSource", back_populates="team", cascade="all, delete-orphan")
    servers = relationship("Server", back_populates="team", cascade="all, delete-orphan")
    incident_reports = relationship("IncidentReport", back_populates="team", cascade="all, delete-orphan")

class MonitoredAsset(Base):
    __tablename__ = "monitored_assets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(50), nullable=False)
    asset_value = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="assets")

class LogSource(Base):
    __tablename__ = "log_sources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="log_sources")

class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    role = Column(String(50), nullable=False, default="member")
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="members")

class Server(Base):
    __tablename__ = "servers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    ip_address = Column(String(50), nullable=False)
    agent_token = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), default='offline')

    monitor_status = Column(String(50), default='pending') 
    defender_status = Column(String(50), default='pending')
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    team = relationship("Team", back_populates="servers")
    incident_reports = relationship("IncidentReport", back_populates="server", cascade="all, delete-orphan")

class FirewallRule(Base):
    __tablename__ = "firewall_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    server_id = Column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"), nullable=True) 
    ip_address = Column(String(50), nullable=False)
    rule_type = Column(String(50), nullable=False)
    reason = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True) 

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    server_id = Column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    attacker_ip = Column(String(50), nullable=False)
    attack_type = Column(String(100), nullable=False)
    severity = Column(String(50))
    status = Column(String(50), default='new')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

# Bảng CSDL lưu trữ Báo cáo Sự cố từ Client gửi cho Admin
class IncidentReport(Base):
    __tablename__ = "incident_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    server_id = Column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    
    title = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False) # critical, high, medium, low
    description = Column(Text, nullable=False)
    
    status = Column(String(50), default='pending') # pending, investigating, resolved
    admin_notes = Column(Text, nullable=True) # Phản hồi từ Super Admin
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="incident_reports")
    server = relationship("Server", back_populates="incident_reports")