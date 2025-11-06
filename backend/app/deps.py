from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError

from .security import decode_token

auth_scheme = HTTPBearer()

@dataclass
class UserClaims:
    sub: str
    role: Optional[str] = None
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> UserClaims:
    token = creds.credentials
    try:
        payload = decode_token(token)
        return UserClaims(sub=str(payload.get("sub")), role=payload.get("role"))
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login expired, please log out and log in again")
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_role(*roles: str):
    def _check(user: UserClaims = Depends(get_current_user)) -> UserClaims:
        if roles and (user.role not in roles):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _check
