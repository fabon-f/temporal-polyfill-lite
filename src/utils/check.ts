export const isObject = (item: unknown) => {
	return (
		(typeof item === "object" || typeof item === "function") && item !== null
	);
};
