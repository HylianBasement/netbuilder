-- Source from: https://github.com/osyrisrblx/t/blob/master/lib/ts.lua
-- t: a runtime typechecker for Roblox
-- Reduced version of t to remove unused checkers.
-- If the full library is what you want, use the npm version.

local t = {}

function t.typeof(typeName)
	return function(value)
		local valueType = typeof(value)
		if valueType == typeName then
			return true
		else
			return false, string.format("%s expected, got %s", typeName, valueType)
		end
	end
end

--[[**
	ensures Lua primitive boolean type

	@param value The value to check against

	@returns True iff the condition is satisfied, false otherwise
**--]]
t.boolean = t.typeof("boolean")

--[[**
	ensures Lua primitive string type
	@param value The value to check against
	@returns True iff the condition is satisfied, false otherwise
**--]]
t.string = t.typeof("string")

return { t = t }