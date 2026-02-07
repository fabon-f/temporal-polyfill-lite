export interface LruCacheMap<K, V> {
	$get(key: K): V | undefined;
	$set(key: K, value: V): void;
}

export function createLruCache<K, V>(limit: number): LruCacheMap<K, V> {
	const map = new Map<K, V>();
	return {
		$get(key: K): V | undefined {
			if (map.has(key)) {
				const value = map.get(key) as V;
				map.delete(key);
				map.set(key, value);
				return value;
			}
			return undefined;
		},
		$set(key: K, value: V) {
			if (map.size >= limit) {
				map.delete(map.keys().next().value!);
			}
			map.set(key, value);
		},
	};
}
