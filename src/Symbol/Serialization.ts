declare function newproxy(b: true): object;

const Serialization = newproxy(true);

(getmetatable(Serialization) as LuaMetatable<never>).__tostring = () => "NetBuilder.Serialization";

export = Serialization as unknown as symbol;
