import { toast } from 'svelte-sonner';

const WARN_SERVICE_AUTH = 'OntoGit memory-service auth missing/mismatch';
const WARN_USER_ID_MISSING = 'User id not propagated; usage will be aggregated';
const WARN_QUOTA_EXCEEDED = 'Quota exceeded';
const WARN_RATE_LIMITED = 'Rate limited';

const WARN_TTL_MS = 60_000;

const shouldWarn = (key: string) => {
	try {
		const now = Date.now();
		const storageKey = `ontogit_warn_${key}`;
		const last = parseInt(sessionStorage.getItem(storageKey) ?? '0', 10);
		if (now - last < WARN_TTL_MS) return false;
		sessionStorage.setItem(storageKey, String(now));
		return true;
	} catch {
		return true;
	}
};

export const warnServiceAuth = () => {
	if (shouldWarn('service_auth')) toast.warning(WARN_SERVICE_AUTH);
};

export const warnUserIdMissing = () => {
	if (shouldWarn('user_id_missing')) toast.warning(WARN_USER_ID_MISSING);
};

export const warnQuotaExceeded = () => {
	if (shouldWarn('quota_exceeded')) toast.warning(WARN_QUOTA_EXCEEDED);
};

export const warnRateLimited = () => {
	if (shouldWarn('rate_limited')) toast.warning(WARN_RATE_LIMITED);
};

export const handleOntogitResponse = async (res: Response) => {
	const warnHeader = res.headers.get('X-Ontogit-Warn') ?? '';
	if (warnHeader.includes('user_id_missing')) warnUserIdMissing();
	if (warnHeader.includes('quota_exceeded')) warnQuotaExceeded();

	let data: any = null;
	try {
		data = await res.clone().json();
	} catch {
		data = null;
	}

	if (!res.ok) {
		if (res.status === 401) warnServiceAuth();
		if (res.status === 429) {
			if (data?.error === 'quota_exceeded') warnQuotaExceeded();
			else warnRateLimited();
		}
		if (res.status === 403) warnQuotaExceeded();
	}
};
