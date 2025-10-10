from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .security import decode_token

auth_scheme = HTTPBearer()

class UserClaims:
    def __init__(self, sub: str, role: str):
        self.sub = sub
        self.role = role

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> UserClaims:
    try:
        data = decode_token(creds.credentials)
        return UserClaims(sub=data["sub"], role=data.get("role", "user"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_role(*roles: str):
    def _check(user: UserClaims = Depends(get_current_user)) -> UserClaims:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _check
