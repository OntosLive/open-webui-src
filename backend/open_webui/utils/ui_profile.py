from open_webui.models.groups import Groups

KELIA_PROFILE_NAME = "kelia"
KELIA_GROUP_NAMES = {"келья", "kelia"}


def get_user_ui_profile(user_id: str | None) -> str | None:
    if not user_id:
        return None

    groups = Groups.get_groups_by_member_id(user_id) or []
    group_names = {
        str(group.name or "").strip().lower()
        for group in groups
        if str(group.name or "").strip()
    }

    if group_names.intersection(KELIA_GROUP_NAMES):
        return KELIA_PROFILE_NAME

    return None
