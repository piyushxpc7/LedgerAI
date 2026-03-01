"""FastAPI route: client management (CRUD for taxpayer records)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from db.database import get_db
from db import models, schemas
from core.auth import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[schemas.ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    clients = db.query(models.Client).filter(
        models.Client.firm_id == current_user.firm_id,
        models.Client.is_active == True
    ).all()

    result = []
    for c in clients:
        notice_count = db.query(func.count(models.Notice.id)).filter(
            models.Notice.client_id == c.id
        ).scalar()
        out = schemas.ClientOut.model_validate(c)
        out.notice_count = notice_count
        result.append(out)
    return result


@router.post("", response_model=schemas.ClientOut)
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check duplicate PAN in same firm
    existing = db.query(models.Client).filter(
        models.Client.firm_id == current_user.firm_id,
        models.Client.pan == payload.pan.upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Client with PAN {payload.pan} already exists")

    client = models.Client(
        firm_id=current_user.firm_id,
        name=payload.name,
        pan=payload.pan.upper(),
        dob=payload.dob,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return schemas.ClientOut.model_validate(client)


@router.get("/{client_id}", response_model=schemas.ClientOut)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.firm_id == current_user.firm_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    out = schemas.ClientOut.model_validate(client)
    out.notice_count = len(client.notices)
    return out


@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(
    client_id: str,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.firm_id == current_user.firm_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return schemas.ClientOut.model_validate(client)


@router.delete("/{client_id}")
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.firm_id == current_user.firm_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_active = False
    db.commit()
    return {"message": "Client deactivated"}
