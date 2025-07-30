import { goto } from "$app/navigation";


type ParamInput =
  | string
  | [string, string][]
  | Record<string, string>
  | URLSearchParams
  ;

type GotoPlusOpts = {
  path?                   : string;
  params?                 : ParamInput;
  preferRedirectParam?    : boolean;
  preserveExistingParams? : boolean;
  addRedirectParam?       : boolean;
};

export function capitalizeFirstLetter(text : string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isUrl(url: string) : boolean {
  if (!url) {
    return false;
  }

  // Handle basic protocols explicitly (including mailto)
  if (/^(https?|ftp|file|mailto):\/\//i.test(url)) {
    return true;
  }

  // Handle domain-only URLs
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?/i;

  // Check if it's an IP address
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?([\/\?].*)?$/;

  return domainRegex.test(url) || ipRegex.test(url);
}

export function handleEnterKey(fn : ((event: Event, ...args: Array<unknown>) => void)) : ((this: unknown, event: Event, ...args: unknown[]) => void) {
	return function(this: unknown, ...args) {
		const event : Event = args[0];

		if ((event as KeyboardEvent).key === 'Enter') {
			fn?.apply(this, args);
		}
	};
}

// Alias for backward compatibility
export const HEK = handleEnterKey;

export function preventDefault(fn : ((event: Event, ...args: Array<unknown>) => void)) : (this: unknown, event: Event, ...args: unknown[]) => void {
	return function(this: unknown, ...args) {
		const event : Event = args[0];

		event.preventDefault();

		return fn?.apply(this, args);
	};
}

export function stopPropagation(fn : ((event: Event, ...args: Array<unknown>) => void)) : (this: unknown, event: Event, ...args: unknown[]) => void {
	return function(this: unknown, ...args) {
		const event : Event = args[0];

		event.stopPropagation();

		return fn?.apply(this, args);
	};
}

export function getRedirectUrl(newPath: string): string {
  const redirectUrl = new URL(window.location.href);

  redirectUrl.searchParams.set("redirect", redirectUrl.pathname + redirectUrl.search);

  redirectUrl.pathname = newPath.startsWith('/') ? newPath : `/${newPath}`;

  return redirectUrl.toString();
}

function addParamsToUrl(url: URL, params: ParamInput, additionalParams? : ParamInput): void {
  new URLSearchParams(params).forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (additionalParams) {
    addParamsToUrl(url, additionalParams);
  }
}

export function gotoPlus({ path, params, preserveExistingParams = true, preferRedirectParam, addRedirectParam} : GotoPlusOpts): Promise<void> {
  const url = new URL(window.location.href);

  let redirect : {path : string, search? : string} | undefined;

  if (preferRedirectParam) {
    if (addRedirectParam) {
      throw new Error(`"addRedirectParam" cannot be true when "preferRedirectParam" is true. It's not possible to set a redirect param of the current URL and navigate to a destination from a current redirect param, at the same time.`);
    }

    const param = url.searchParams.get('redirect');

    if (param) {
      const [path, search] = param.split('?');

      redirect = { path, search };

      url.searchParams.delete('redirect');
    }
  }

  if (preserveExistingParams === false) {
    url.search = '';
  }

  if (params || redirect?.search) {
    addParamsToUrl(url, params ?? '', redirect?.search);
  }

  if (addRedirectParam) {
    if (!path) {
      throw new Error(`"path" is required when "addRedirectParam" is true`);
    }

    url.searchParams.set('redirect', url.pathname + url.search);
  }

  if (redirect?.path) {
    url.pathname = redirect.path.startsWith('/') ? redirect.path : `/${redirect.path}`;
  } else if (path) {
    url.pathname = path.startsWith('/') ? path : `/${path}`;
  }

  return goto(url);
}
