"""
Like model
"""

from sqlalchemy import Column, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.database import Base

class Like(Base):
    """Like model"""
    __tablename__ = "likes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"))
    comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        CheckConstraint(
            "(post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)",
            name="check_like_target"
        ),
    )
    
    def __repr__(self):
        return f"<Like(user_id='{self.user_id}', post_id='{self.post_id}', comment_id='{self.comment_id}')>"



