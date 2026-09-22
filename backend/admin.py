"""
Superadmin user management. There is no self-service signup: the superadmin creates
accounts here, and revoking one takes effect on the next request the user makes.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from auth import USERNAME_RE, generate_password, get_current_admin, get_password_hash, normalize_username
from database import get_db
from db_models import User

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(get_current_admin)])


class NewUser(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, v: str) -> str:
        v = normalize_username(v)
        if not USERNAME_RE.fullmatch(v):
            raise ValueError("username must be 3-32 characters: letters, digits, '.', '_' or '-'")
        return v


class AccountOut(BaseModel):
    username: str
    is_admin: bool
    is_active: bool
    created_at: Optional[datetime]
    last_login_at: Optional[datetime]


class AccountWithPassword(AccountOut):
    """Returned once, when the password is generated. It is never stored in readable form."""

    password: str


def _as_account(user: User) -> AccountOut:
    return AccountOut(username=user.username, is_admin=user.is_admin, is_active=user.is_active,
                      created_at=user.created_at, last_login_at=user.last_login_at)


def _load(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == normalize_username(username)).first()
    if user is None:
        raise HTTPException(status_code=404, detail="No such user.")
    return user


def _refuse_self(user: User, admin: User, action: str) -> None:
    if user.username == admin.username:
        raise HTTPException(status_code=400, detail=f"You cannot {action} your own account.")


@router.get("/users", response_model=list[AccountOut])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.is_admin.desc(), User.username.asc()).all()
    return [_as_account(u) for u in users]


@router.post("/users", response_model=AccountWithPassword, status_code=status.HTTP_201_CREATED)
def create_user(new_user: NewUser, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == new_user.username).first():
        raise HTTPException(status_code=409, detail="That username is already taken.")

    password = generate_password()
    user = User(username=new_user.username, hashed_password=get_password_hash(password),
                is_admin=False, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return AccountWithPassword(**_as_account(user).model_dump(), password=password)


@router.post("/users/{username}/password", response_model=AccountWithPassword)
def reset_password(username: str, db: Session = Depends(get_db)):
    user = _load(db, username)
    password = generate_password()
    user.hashed_password = get_password_hash(password)
    user.token_version = (user.token_version or 0) + 1  # old tokens stop working
    db.commit()
    db.refresh(user)
    return AccountWithPassword(**_as_account(user).model_dump(), password=password)


@router.post("/users/{username}/revoke", response_model=AccountOut)
def revoke_access(username: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _load(db, username)
    _refuse_self(user, admin, "revoke")
    user.is_active = False
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    db.refresh(user)
    return _as_account(user)


@router.post("/users/{username}/restore", response_model=AccountOut)
def restore_access(username: str, db: Session = Depends(get_db)):
    user = _load(db, username)
    user.is_active = True
    db.commit()
    db.refresh(user)
    return _as_account(user)


@router.delete("/users/{username}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(username: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _load(db, username)
    _refuse_self(user, admin, "delete")
    db.delete(user)
    db.commit()
