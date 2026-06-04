export interface LruCacheMap<K, V> {
	$get(key: K): V | undefined;
	/** Returns `value` which is set, not `LruCacheMap` */
	$set(key: K, value: V): V;
	$getOrInsertComputed(key: K, callback: () => V): V;
}

export function createLruCache<K, V>(limit: number): LruCacheMap<K, V> {
	const map = new Map<K, V>();
	return {
		$get(key: K): V | undefined {
			const value = map.get(key);
			if (value !== undefined) {
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
			return value;
		},
		$getOrInsertComputed(key, callback) {
			return this.$get(key) ?? this.$set(key, callback());
		},
	};
}
