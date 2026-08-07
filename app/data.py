from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.auth import get_current_user_id
from app.db import load_data, save_data

router = APIRouter(prefix="/data", tags=["data"])


class WorkbenchDataOut(BaseModel):
    data: Dict[str, Any]


class WorkbenchDataIn(BaseModel):
    data: Dict[str, Any]


def create_empty_data() -> Dict[str, Any]:
    return {
        "schemaVersion": 5,
        "classes": [],
        "currentClassId": None,
        "students": {},
        "schedule": {},
        "recitation": {},
        "exams": {},
        "grades": {},
        "homework": {},
        "violations": {},
        "seating": {},
        "conversations": {},
        "communications": {},
        "lessonPlans": [],
        "workRecords": [],
        "todos": [],
        "notes": [],
        "resources": [],
        "news": [],
        "classSwaps": [],
        "customKitQA": [],
        "examDates": {"midterm": "", "final": ""},
    }


@router.get("", response_model=WorkbenchDataOut)
async def get_data(user_id: int = Depends(get_current_user_id)):
    data = await load_data(user_id)
    if data is None:
        data = create_empty_data()
        await save_data(user_id, data)
    return {"data": data}


@router.post("", response_model=WorkbenchDataOut)
async def update_data(body: WorkbenchDataIn, user_id: int = Depends(get_current_user_id)):
    await save_data(user_id, body.data)
    return {"data": body.data}
