import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated() && user) {
      // Initialize socket connection
      socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Socket event listeners
      socketRef.current.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      socketRef.current.on('new-post', (data) => {
        toast.success(`New post: ${data.title}`, {
          duration: 5000,
          onClick: () => {
            // Navigate to the new post
            window.location.href = `/post/${data.slug}`;
          }
        });
      });

      socketRef.current.on('new-comment', (data) => {
        toast.success(`New comment on: ${data.postTitle}`, {
          duration: 5000,
          onClick: () => {
            // Navigate to the post with the comment
            window.location.href = `/post/${data.postSlug}`;
          }
        });
      });

      socketRef.current.on('comment-updated', (data) => {
        // Handle comment updates (could trigger a refetch)
        console.log('Comment updated:', data);
      });

      socketRef.current.on('comment-deleted', (data) => {
        // Handle comment deletion (could trigger a refetch)
        console.log('Comment deleted:', data);
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error('Connection error. Trying to reconnect...');
      });

      // Cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user, isAuthenticated]);

  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const value = {
    socket: socketRef.current,
    emit,
    on,
    off,
    connected: socketRef.current?.connected || false,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};











