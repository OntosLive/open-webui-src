import logging
from typing import Optional


from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from open_webui.socket.main import sio

from open_webui.models.users import Users, UserResponse
from open_webui.models.notes import (
    NoteForm,
    NoteListResponse,
    NoteModel,
    NoteUserResponse,
    Notes,
)

from open_webui.constants import ERROR_MESSAGES


from open_webui.utils.auth import get_verified_user
from open_webui.utils.access_control import has_permission
from open_webui.utils.ui_profile import KELIA_PROFILE_NAME, get_user_ui_profile

log = logging.getLogger(__name__)

router = APIRouter()


def _ensure_notes_access(request: Request, user):
    if get_user_ui_profile(user.id) == KELIA_PROFILE_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
        )

    if user.role != "admin" and not has_permission(
        user.id, "features.notes", request.app.state.config.USER_PERMISSIONS
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.UNAUTHORIZED,
        )

############################
# GetNotes
############################


class NoteItemResponse(BaseModel):
    id: str
    title: str
    data: Optional[dict]
    updated_at: int
    created_at: int
    user: Optional[UserResponse] = None


@router.get("/", response_model=list[NoteItemResponse])
async def get_notes(
    request: Request, page: Optional[int] = None, user=Depends(get_verified_user)
):
    _ensure_notes_access(request, user)

    limit = None
    skip = None
    if page is not None:
        limit = 60
        skip = (page - 1) * limit

    notes = [
        NoteUserResponse(
            **{
                **note.model_dump(),
                "user": UserResponse(**Users.get_user_by_id(note.user_id).model_dump()),
            }
        )
        for note in Notes.get_notes_by_owner_user_id(user.id, skip=skip, limit=limit)
    ]
    return notes


@router.get("/search", response_model=NoteListResponse)
async def search_notes(
    request: Request,
    query: Optional[str] = None,
    view_option: Optional[str] = None,
    permission: Optional[str] = None,
    order_by: Optional[str] = None,
    direction: Optional[str] = None,
    page: Optional[int] = 1,
    user=Depends(get_verified_user),
):
    _ensure_notes_access(request, user)

    limit = None
    skip = None
    if page is not None:
        limit = 60
        skip = (page - 1) * limit

    filter = {}
    if query:
        filter["query"] = query
    if view_option:
        filter["view_option"] = view_option
    if permission:
        filter["permission"] = permission
    if order_by:
        filter["order_by"] = order_by
    if direction:
        filter["direction"] = direction

    return Notes.search_notes_by_owner(user.id, filter, skip=skip, limit=limit)


############################
# CreateNewNote
############################


@router.post("/create", response_model=Optional[NoteModel])
async def create_new_note(
    request: Request, form_data: NoteForm, user=Depends(get_verified_user)
):
    _ensure_notes_access(request, user)

    try:
        form_data.access_control = {}
        note = Notes.insert_new_note(form_data, user.id)
        return note
    except Exception as e:
        log.exception(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.DEFAULT()
        )


############################
# GetNoteById
############################


class NoteResponse(NoteModel):
    write_access: bool = False


@router.get("/{id}", response_model=Optional[NoteResponse])
async def get_note_by_id(request: Request, id: str, user=Depends(get_verified_user)):
    _ensure_notes_access(request, user)

    note = Notes.get_note_by_id_and_owner(id, user.id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=ERROR_MESSAGES.NOT_FOUND
        )

    write_access = user.id == note.user_id

    return NoteResponse(**note.model_dump(), write_access=write_access)


############################
# UpdateNoteById
############################


@router.post("/{id}/update", response_model=Optional[NoteModel])
async def update_note_by_id(
    request: Request, id: str, form_data: NoteForm, user=Depends(get_verified_user)
):
    _ensure_notes_access(request, user)

    note = Notes.get_note_by_id_and_owner(id, user.id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=ERROR_MESSAGES.NOT_FOUND
        )

    form_data.access_control = {}

    try:
        note = Notes.update_note_by_id_and_owner(id, user.id, form_data)
        await sio.emit(
            "note-events",
            note.model_dump(),
            to=f"note:{note.id}",
        )

        return note
    except Exception as e:
        log.exception(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.DEFAULT()
        )


############################
# DeleteNoteById
############################


@router.delete("/{id}/delete", response_model=bool)
async def delete_note_by_id(request: Request, id: str, user=Depends(get_verified_user)):
    _ensure_notes_access(request, user)

    note = Notes.get_note_by_id_and_owner(id, user.id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=ERROR_MESSAGES.NOT_FOUND
        )

    try:
        note = Notes.delete_note_by_id_and_owner(id, user.id)
        return True
    except Exception as e:
        log.exception(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.DEFAULT()
        )
