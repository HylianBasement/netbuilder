declare function newproxy(b: true): object;

const Configuration = newproxy(true);

(getmetatable(Configuration) as LuaMetatable<never>).__tostring = () => "NetBuilder.Configuration";

export = Configuration as unknown as symbol;
