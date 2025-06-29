export function balanceNanoseconds(nanoseconds: number) {
	const microseconds = Math.floor(nanoseconds / 1000);
	const milliseconds = Math.floor(microseconds / 1000);
	const seconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(seconds / 60);
	return [
		Math.floor(minutes / 60),
		minutes % 60,
		seconds % 60,
		milliseconds % 1000,
		microseconds % 1000,
		nanoseconds % 1000,
	] as [
		hours: number,
		minutes: number,
		seconds: number,
		milliseconds: number,
		microseconds: number,
		nanoseconds: number,
	];
}
