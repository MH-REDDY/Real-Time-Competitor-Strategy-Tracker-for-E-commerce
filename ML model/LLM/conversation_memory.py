"""
Multi-turn conversation memory management
Tracks context across messages for follow-up questions
"""
from typing import Dict, List
from datetime import datetime, timedelta

class ConversationMemory:
    def __init__(self, max_history: int = 10, ttl_hours: int = 24):
        """
        Args:
            max_history: Maximum number of messages to keep per session
            ttl_hours: Time-to-live for sessions in hours
        """
        self.sessions: Dict[str, List[Dict]] = {}
        self.max_history = max_history
        self.ttl_hours = ttl_hours
        self.last_context: Dict[str, Dict] = {}  # Store entities mentioned
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Dict = None):
        """Add message to conversation history"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        self.sessions[session_id].append(message)
        
        # Keep only last N messages
        if len(self.sessions[session_id]) > self.max_history:
            self.sessions[session_id] = self.sessions[session_id][-self.max_history:]
    
    def get_history(self, session_id: str) -> List[Dict]:
        """Get conversation history for session"""
        return self.sessions.get(session_id, [])
    
    def get_context(self, session_id: str) -> str:
        """Get formatted context for LLM"""
        history = self.get_history(session_id)
        if not history:
            return ""
        
        # Format last few messages as context
        context_messages = history[-5:]  # Last 5 messages
        formatted = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in context_messages
        ])
        return formatted
    
    def store_entity(self, session_id: str, entity_type: str, entity_data: Dict):
        """Store mentioned entities (products, brands, etc.) for context"""
        if session_id not in self.last_context:
            self.last_context[session_id] = {}
        
        self.last_context[session_id][entity_type] = {
            "data": entity_data,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_entity(self, session_id: str, entity_type: str) -> Dict:
        """Retrieve last mentioned entity of given type"""
        if session_id in self.last_context:
            entity = self.last_context[session_id].get(entity_type)
            if entity:
                # Check if entity is still fresh (within 10 minutes)
                timestamp = datetime.fromisoformat(entity["timestamp"])
                if datetime.now() - timestamp < timedelta(minutes=10):
                    return entity["data"]
        return None
    
    def clear_session(self, session_id: str):
        """Clear conversation history for session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self.last_context:
            del self.last_context[session_id]
    
    def cleanup_old_sessions(self):
        """Remove sessions older than TTL"""
        cutoff = datetime.now() - timedelta(hours=self.ttl_hours)
        
        sessions_to_remove = []
        for session_id, messages in self.sessions.items():
            if messages:
                last_message_time = datetime.fromisoformat(messages[-1]["timestamp"])
                if last_message_time < cutoff:
                    sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            self.clear_session(session_id)
