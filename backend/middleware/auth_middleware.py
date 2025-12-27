from fastapi import Header, HTTPException
import jwt
from config import settings
from db import get_user_by_id, get_pool

async def get_user_by_email(email: str):
    """Get user by email - for Better Auth tokens"""
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1",
            email
        )
        return dict(row) if row else None

async def create_better_auth_user(email: str, name: str = None):
    """Create a minimal user for Better Auth users"""
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO users (email, google_id, channel_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) DO UPDATE SET channel_name = EXCLUDED.channel_name
            RETURNING *
        """, email, f"better_auth_{email}", name or email.split('@')[0])
        return dict(row) if row else None

async def get_current_user(authorization: str = Header(None)):
    """Verify JWT token and get current user"""
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    
    try:
        # Extract token
        token = authorization.replace("Bearer ", "")
        
        # Decode JWT
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        
        # Check if this is a Better Auth token (has 'source' field)
        if payload.get('source') == 'better_auth':
            email = payload.get('email')
            name = payload.get('name')
            
            if not email:
                raise HTTPException(401, "Invalid Better Auth token - no email")
            
            # Get user by email
            user = await get_user_by_email(email)
            
            if not user:
                # Auto-create user for Better Auth
                user = await create_better_auth_user(email, name)
            
            if not user:
                raise HTTPException(401, "Could not create user")
            
            return user
        else:
            # Traditional token with user_id
            user_id = payload.get("user_id") or payload.get("sub")
            
            if not user_id:
                raise HTTPException(401, "Invalid token payload")
            
            # Convert to int if string
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                except ValueError:
                    pass
            
            # Get user from database
            user = await get_user_by_id(user_id)
            
            if not user:
                raise HTTPException(401, "User not found")
            
            return user
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")
