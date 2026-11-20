"""Authentication Router - Mock Auth for Development"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Mock database of users (Persistent across requests)
MOCK_USERS = {
    "demo@smarterp.com": {
        "id": "user-1",
        "email": "demo@smarterp.com",
        "password": "demo123",
        "name": "Demo User",
        "created_at": datetime.now()
    },
    "test@smarterp.com": {
        "id": "user-2",
        "email": "test@smarterp.com",
        "password": "test123",
        "name": "Test User",
        "created_at": datetime.now()
    }
}

# Mock tokens storage
ACTIVE_TOKENS = {}

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    message: str

class SignupResponse(BaseModel):
    id: str
    email: str
    name: str
    message: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

# Login Endpoint
@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """Login with email and password"""

    # Normalize email (lowercase)
    email = payload.email.lower().strip()
    password = payload.password.strip()

    # Debug logging
    print(f"🔍 Login attempt: {email}")
    print(f"📋 Available users: {list(MOCK_USERS.keys())}")

    # Check if user exists
    if email not in MOCK_USERS:
        print(f"❌ User not found: {email}")
        raise HTTPException(
            status_code=401,
            detail=f"User not found: {email}"
        )

    user = MOCK_USERS[email]

    # Check password (mock - no hashing for demo)
    if user["password"] != password:
        print(f"❌ Password mismatch for {email}")
        print(f"   Expected: {user['password']}")
        print(f"   Got: {password}")
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    # Generate mock token
    token = str(uuid.uuid4())
    ACTIVE_TOKENS[token] = {
        "user_id": user["id"],
        "email": user["email"],
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)
    }

    print(f"✅ Login successful for {email}")

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        },
        message="Login successful"
    )

# Signup Endpoint
@router.post("/signup", response_model=SignupResponse)
async def signup(payload: SignupRequest):
    """Create new account"""

    # Normalize email (lowercase)
    email = payload.email.lower().strip()
    name = payload.name.strip()
    password = payload.password.strip()

    print(f"📝 Signup attempt: {email}")

    # Check if email already exists
    if email in MOCK_USERS:
        print(f"⚠️  Email already exists: {email}")
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    # Create new user
    user_id = f"user-{len(MOCK_USERS) + 1}"
    new_user = {
        "id": user_id,
        "email": email,
        "password": password,
        "name": name,
        "created_at": datetime.now()
    }

    MOCK_USERS[email] = new_user

    print(f"✅ Account created: {email}")
    print(f"📋 Total users: {len(MOCK_USERS)}")
    print(f"📋 All users: {list(MOCK_USERS.keys())}")

    return SignupResponse(
        id=user_id,
        email=email,
        name=name,
        message="Account created successfully! You can now login."
    )

# Verify Token Endpoint
@router.get("/verify", response_model=UserResponse)
async def verify_token(token: str):
    """Verify authentication token"""

    if token not in ACTIVE_TOKENS:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    token_data = ACTIVE_TOKENS[token]

    # Check if token expired
    if datetime.now() > token_data["expires_at"]:
        del ACTIVE_TOKENS[token]
        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )

    user_email = token_data["email"]
    user = MOCK_USERS[user_email]

    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"]
    )

# Logout Endpoint
@router.post("/logout")
async def logout(token: str):
    """Logout user"""

    if token in ACTIVE_TOKENS:
        del ACTIVE_TOKENS[token]

    return {"message": "Logged out successfully"}

# Demo Credentials Endpoint
@router.get("/demo-credentials")
async def get_demo_credentials():
    """Get demo credentials for testing"""

    return {
        "email": "demo@smarterp.com",
        "password": "demo123",
        "message": "Use these credentials to login"
    }

# Debug Endpoint - Shows all users
@router.get("/debug/users")
async def debug_users():
    """DEBUG: Show all registered users"""
    users_list = []
    for email, user in MOCK_USERS.items():
        users_list.append({
            "id": user["id"],
            "email": email,
            "password": user["password"],
            "name": user["name"]
        })

    return {
        "total_users": len(MOCK_USERS),
        "users": users_list,
        "message": "DEBUG: All registered users"
    }

# Test Login Endpoint - Always works
@router.post("/test-login")
async def test_login():
    """TEST: Always returns success (for debugging)"""

    token = str(uuid.uuid4())
    ACTIVE_TOKENS[token] = {
        "user_id": "test-user",
        "email": "test@example.com",
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)
    }

    print(f"✅ TEST LOGIN: Token generated: {token}")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": "test-user",
            "email": "test@example.com",
            "name": "Test User"
        },
        "message": "TEST LOGIN - Always succeeds"
    }

__all__ = ["router"]
