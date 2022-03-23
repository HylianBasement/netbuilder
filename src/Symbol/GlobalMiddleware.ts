declare function newproxy(b: true): object;

const GlobalMiddleware = newproxy(true);

(getmetatable(GlobalMiddleware) as LuaMetatable<never>).__tostring = () =>
	"NetBuilder.Global.Middleware";

export = GlobalMiddleware as unknown as symbol;
