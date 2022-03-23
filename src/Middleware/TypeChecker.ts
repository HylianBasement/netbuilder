import ServerMiddlewareBuilder from "../Builders/ServerMiddlewareBuilder";

import definitionInfo from "../Util/definitionInfo";

type NetBuilderTypeChecker = (value: unknown) => boolean;

/** Checks, on the server, the type of all the values that are sent or received. */
function TypeChecker(...checks: NetBuilderTypeChecker[]) {
	return new ServerMiddlewareBuilder()
		.Label("TypeChecker")
		.SetCallback((definition, processNext, drop) => (_player, ...args) => {
			for (let i = 0; i < args.size(); i++) {
				const [success, message] = checks[i](args[i]) as unknown as LuaTuple<[boolean, string?]>;

				if (!success) {
					drop(
						`${definitionInfo(definition)} has failed typechecking.${
							message ? `\n\nCode: ${message}` : ""
						}`,
					);
				}
			}

			processNext(args, (r) => r);
		})
		.Build();
}

export = TypeChecker;
