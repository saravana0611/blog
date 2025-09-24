"""
Report model
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.database import Base

class Report(Base):
    """Report model"""
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reported_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"))
    comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"))
    reason = Column(String(100), nullable=False)
    description = Column(String(255))
    status = Column(String(20), default="pending")
    moderator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        CheckConstraint(
            "(reported_user_id IS NOT NULL) OR (post_id IS NOT NULL) OR (comment_id IS NOT NULL)",
            name="check_report_target"
        ),
    )
    
    def __repr__(self):
        return f"<Report(reason='{self.reason}', status='{self.status}')>"



