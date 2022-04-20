// Source from: https://github.com/osyrisrblx/t/blob/master/lib/t.d.ts
// utility types

interface t {
	// lua types
	/** checks to see if `value` is a boolean */
	boolean: t.check<boolean>;
	/** checks to see if `value` is a string */
	string: t.check<string>;
}

declare namespace t {
	/** creates a static type from a t-defined type */
	export type static<T> = T extends t.check<infer U> ? U : never;

	/** checks to see if `value` is a T */
	export type check<T> = (value: unknown) => value is T;
}

declare const t: t;
export { t };
