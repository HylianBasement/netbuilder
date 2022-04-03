declare function newproxy(x: true): object;

export = (name: string) => {
	const symbol = newproxy(true);

	(getmetatable(symbol) as LuaMetatable<never>).__tostring = () => name;

	return symbol as unknown as symbol;
};
