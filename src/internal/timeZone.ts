import { asciiCapitalize, asciiLowerCase, asciiUpperCase } from "./string.ts";

/** normalize upper/lower case of IANA time zone IDs */
export function normalizeIanaTimeZoneId(id: string) {
	return asciiLowerCase(id).replace(/[^/]+/g, (part) => {
		if (/^(?!etc|yap).{1,3}$|\d/.test(part)) {
			return asciiUpperCase(part);
		}
		return part.replace(/baja|mc|comod|[a-z]+/g, (word) => {
			if (/^(su|gb|nz|in|chat)$/.test(word)) {
				return asciiUpperCase(word);
			}
			if (/^(of|au|es)$/.test(word)) {
				return word;
			}
			return asciiCapitalize(word).replace(/du(?=r)|n(?=or)|i(?=slan)/, asciiUpperCase);
		});
	});
}
