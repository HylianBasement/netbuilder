declare function newproxy(b: true): object;

const NamespaceId = newproxy(true);

(getmetatable(NamespaceId) as LuaMetatable<never>).__tostring = () => "NetBuilder.Namespace.Id";

export = NamespaceId as unknown as symbol;
