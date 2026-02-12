import { toast } from 'svelte-sonner';

const WARN_SERVICE_AUTH = 'OntoGit memory-service auth missing/mismatch';
const WARN_USER_ID_MISSING = 'User id not propagated; usage will be aggregated';
const WARN_QUOTA_EXCEEDED = 'Quota exceeded';
const WARN_RATE_LIMITED = 'Rate limited';

const WARN_TTL_MS = 60_000;
const LIMIT_WARN_TTL_MS = 60_000;
const LIMIT_DISMISS_MS = 10 * 60_000;

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

const parseUsd = (value: string | null) => {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const formatUsd = (value: number | null) => (value === null ? '?' : value.toFixed(1));

const shouldShowLimitWarn = (warn: string, role: string) => {
	try {
		const now = Date.now();
		const dismissKey = `ontogit_limit_dismissed_until::${warn}::${role}`;
		const dismissedUntil = Number.parseInt(localStorage.getItem(dismissKey) ?? '0', 10);
		if (dismissedUntil > now) return false;

		const throttleKey = `ontogit_limit_warn_last::${warn}::${role}`;
		const last = Number.parseInt(sessionStorage.getItem(throttleKey) ?? '0', 10);
		if (now - last < LIMIT_WARN_TTL_MS) return false;

		sessionStorage.setItem(throttleKey, String(now));
		return true;
	} catch {
		return true;
	}
};

const dismissLimitWarn = (warn: string, role: string) => {
	try {
		const key = `ontogit_limit_dismissed_until::${warn}::${role}`;
		localStorage.setItem(key, String(Date.now() + LIMIT_DISMISS_MS));
	} catch {
		// Ignore storage errors in private mode or restricted contexts.
	}
};

export const handleOntogitLimitHeaders = (res: Response): void => {
	try {
		const warn = (res.headers.get('X-Ontogit-Limit-Warn') ?? '').trim().toLowerCase();
		if (warn !== '90' && warn !== 'exceeded') return;

		const role = (res.headers.get('X-Ontogit-Limit-Role') ?? 'unknown').trim() || 'unknown';
		if (!shouldShowLimitWarn(warn, role)) return;

		const usedUsd = parseUsd(res.headers.get('X-Ontogit-Limit-Used-Usd'));
		const limitUsd = parseUsd(res.headers.get('X-Ontogit-Limit-Limit-Usd'));
		const summary = `Role ${role}: ${formatUsd(usedUsd)} / ${formatUsd(limitUsd)} USD`;

		const action = {
			label: 'Hide 10m',
			onClick: () => dismissLimitWarn(warn, role)
		};

		if (warn === 'exceeded') {
			toast.error(`OntoGit limit exceeded. ${summary}`, { action });
			return;
		}

		toast.warning(`OntoGit limit warning (90%). ${summary}`, { action });
	} catch {
		// Never throw from response warning helpers.
	}
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
