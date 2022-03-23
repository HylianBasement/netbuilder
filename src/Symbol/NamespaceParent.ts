declare function newproxy(b: true): object;

const NamespaceParent = newproxy(true);

(getmetatable(NamespaceParent) as LuaMetatable<never>).__tostring = () => "NetBuilder.Namespace.Parent";

export = NamespaceParent as unknown as symbol;
