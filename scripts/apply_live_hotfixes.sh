#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${OPEN_WEBUI_CONTAINER:-open-webui}"

if ! docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  echo "FAIL: container '${CONTAINER_NAME}' is not available" >&2
  exit 1
fi

docker exec -i "${CONTAINER_NAME}" python - <<'PY'
from pathlib import Path

JS_ROOTS = [
    Path('/app/build/_app/immutable/chunks'),
    Path('/app/build/_app/immutable/nodes'),
]

def all_js_files():
    files = []
    for root in JS_ROOTS:
        if root.exists():
            files.extend(sorted(root.glob('*.js')))
    return files

def find_file(old: str, new: str):
    old_match = None
    new_match = None
    for path in all_js_files():
        text = path.read_text()
        if new in text and new_match is None:
            new_match = path
        if old in text and old_match is None:
            old_match = path
    return old_match, new_match

def apply_patch(name: str, old: str, new: str):
    old_path, new_path = find_file(old, new)
    if new_path is not None:
        print(f'OK: {name} already present in {new_path}')
        return
    if old_path is None:
        raise SystemExit(f'FAIL: patch target not found for {name}')
    text = old_path.read_text()
    old_count = text.count(old)
    if old_count != 1:
        raise SystemExit(f'FAIL: expected 1 match for {name}, found {old_count} in {old_path}')
    old_path.write_text(text.replace(old, new, 1))
    print(f'PATCHED: {name} -> {old_path}')

patches = [
    (
        'first_chat_send_guard',
        'if(e($).length===0)tt.error(b().t("Model not selected"));else{',
        'let Qe=P().filter(qe=>!(((qe==null?void 0:qe.info)?.meta?.hidden)??!1)).map(qe=>qe.id),Ze=e($).filter(qe=>qe&&Qe.includes(qe));if(Ze.length===0){const qe=((K()==null?void 0:K().default_models)||"").split(",").map(it=>it.trim()).filter(it=>it&&Qe.includes(it))[0]??Qe[0]??"";qe&&(s($,[qe]),Ze=[qe])}if(Ze.length===0)tt.error(b().t("Model not selected"));else{'
    ),
    (
        'kelya_murashki_passive_reaction',
        'ye("click",Zt,async()=>{await ze(1),await Ne(),window.setTimeout(()=>{var ut;(ut=document.getElementById(`message-feedback-${e(s).id}`))==null||ut.scrollIntoView()},0)}),a(qt,Zt)',
        'ye("click",Zt,async()=>{await Ne()}),a(qt,Zt)'
    ),
    (
        'kelya_hide_token_usage',
        'g(Ot,Ct=>{e(s),t(()=>e(s).usage)&&Ct(da)})',
        'g(Ot,Ct=>{e(M),e(s),t(()=>!e(M)&&e(s).usage)&&Ct(da)})'
    ),
    (
        'kelya_disable_her_greeting',
        'if(await wt(),document.documentElement.classList.contains("her")&&document.getElementById("progress-bar"))',
        'if(await wt(),document.documentElement.classList.contains("her")&&document.getElementById("progress-bar")&&(((Mt()==null?void 0:Mt().ui_profile)??((b()==null?void 0:b().ui_profile)??null))!=="kelia"))'
    ),
    (
        'kelya_safari_mic_message_dictation_error',
        'tt.error(r().t("Permission denied when accessing microphone: {{error}}",{error:Ne}))',
        'tt.error(r().t("Microphone access is needed for voice input. In Safari on iPhone, open aA -> Website Settings -> Microphone -> Allow, then try again."))'
    ),
    (
        'kelya_safari_mic_message_dictation_catch',
        'tt.error(r().t("Permission denied when accessing microphone"))',
        'tt.error(r().t("Please allow microphone access to use voice input. In Safari on iPhone, open aA -> Website Settings -> Microphone -> Allow, then try again."))'
    ),
    (
        'kelya_safari_mic_message_voice_mode',
        'tt.error(r().t("Permission denied when accessing media devices"))',
        'tt.error(r().t("Microphone access is needed for voice mode. In Safari on iPhone, open aA -> Website Settings -> Microphone -> Allow, then try again."))'
    ),
    (
        'kelya_safari_mic_message_voice_recording',
        'Gn.error(s().t("Error accessing media devices."))',
        'Gn.error(s().t("Microphone access is needed for voice input. In Safari on iPhone, open aA -> Website Settings -> Microphone -> Allow, then try again."))'
    ),
]

for patch in patches:
    apply_patch(*patch)
PY
