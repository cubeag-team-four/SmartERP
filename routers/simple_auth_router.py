"""Unified Auth Router - Signup & Login Work Together"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory user database (persists during app runtime)
USERS_DB = {
    "demo@smarterp.com": {
        "id": "demo-1",
        "email": "demo@smarterp.com",
        "password": "demo123",
        "name": "Demo User"
    }
}

# Active tokens
TOKENS_DB = {}

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    message: str

# ============================================
# SIGNUP ENDPOINT
# ============================================
@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest):
    """Create account and login immediately"""

    email = payload.email.strip().lower()
    password = payload.password.strip()
    name = payload.name.strip()

    print(f"\n📝 SIGNUP REQUEST")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    print(f"   Name: {name}")

    # Check if email already exists
    if email in USERS_DB:
        print(f"❌ Email already exists: {email}")
        raise HTTPException(status_code=400, detail="Email already exists")

    # Create new user
    user_id = f"user-{len(USERS_DB) + 1}"
    new_user = {
        "id": user_id,
        "email": email,
        "password": password,
        "name": name
    }

    # Save to database
    USERS_DB[email] = new_user

    print(f"✅ User created and saved to database")
    print(f"   Total users: {len(USERS_DB)}")
    print(f"   All emails: {list(USERS_DB.keys())}")

    # Generate token
    token = str(uuid.uuid4())
    TOKENS_DB[token] = {
        "user_id": user_id,
        "email": email,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(days=7)
    }

    print(f"✅ Token generated: {token[:20]}...")

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user_id,
            "email": email,
            "name": name
        },
        message="Account created successfully! You are now logged in."
    )

# ============================================
# LOGIN ENDPOINT
# ============================================
@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    """Login with email and password"""

    email = payload.email.strip().lower()
    password = payload.password.strip()

    print(f"\n🔑 LOGIN REQUEST")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    print(f"   Stored users: {list(USERS_DB.keys())}")

    # Check if user exists
    if email not in USERS_DB:
        print(f"❌ User not found: {email}")
        print(f"   Available users: {list(USERS_DB.keys())}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = USERS_DB[email]

    # Check password
    if user["password"] != password:
        print(f"❌ Password incorrect for {email}")
        print(f"   Expected: '{user['password']}'")
        print(f"   Got: '{password}'")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    print(f"✅ Password correct!")

    # Generate token
    token = str(uuid.uuid4())
    TOKENS_DB[token] = {
        "user_id": user["id"],
        "email": email,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(days=7)
    }

    print(f"✅ Token generated: {token[:20]}...")
    print(f"✅ LOGIN SUCCESS for {email}")

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user["id"],
            "email": email,
            "name": user["name"]
        },
        message="Login successful!"
    )

# ============================================
# UTILITY ENDPOINTS
# ============================================

@router.get("/me")
async def get_me(token: str):
    """Get current user info"""

    if token not in TOKENS_DB:
        raise HTTPException(status_code=401, detail="Invalid token")

    token_data = TOKENS_DB[token]
    email = token_data["email"]
    user = USERS_DB[email]

    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"]
    }

@router.post("/logout")
async def logout(token: str):
    """Logout and invalidate token"""

    if token in TOKENS_DB:
        del TOKENS_DB[token]

    return {"message": "Logged out successfully"}

@router.get("/debug/users")
async def debug_users():
    """DEBUG: Show all users"""

    users_list = []
    for email, user in USERS_DB.items():
        users_list.append({
            "id": user["id"],
            "email": email,
            "password": user["password"],
            "name": user["name"]
        })

    return {
        "total_users": len(USERS_DB),
        "users": users_list
    }

@router.get("/debug/tokens")
async def debug_tokens():
    """DEBUG: Show all tokens"""

    return {
        "total_tokens": len(TOKENS_DB),
        "tokens": list(TOKENS_DB.keys())[:5]
    }

__all__ = ["router"]
