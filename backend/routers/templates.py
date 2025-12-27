from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from pydantic import BaseModel

from middleware.auth_middleware import get_current_user
import database_pg as database

router = APIRouter()

class TemplateCreate(BaseModel):
    template_text: str

@router.get("/", response_model=List[Dict])
async def get_templates(
    current_user: Dict = Depends(get_current_user)
):
    """Get all saved templates for the current user"""
    user_id = current_user['id']
    templates = await database.get_user_templates(user_id)
    return templates

@router.post("/", response_model=Dict)
async def create_template(
    template: TemplateCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Save a new template"""
    user_id = current_user['id']
    if not template.template_text.strip():
        raise HTTPException(status_code=400, detail="Template text cannot be empty")
        
    new_template = await database.create_user_template(user_id, template.template_text)
    return new_template

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a template"""
    user_id = current_user['id']
    success = await database.delete_user_template(user_id, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"status": "success", "message": "Template deleted"}
