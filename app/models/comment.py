"""
Comment model
"""

from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class Comment(Base):
    """Comment model"""
    __tablename__ = "comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"))
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True))
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    author = relationship("User")
    post = relationship("Post", back_populates="comments")
    parent = relationship("Comment", remote_side=[id])
    
    def __repr__(self):
        return f"<Comment(id='{self.id}', content='{self.content[:50]}...')>"



