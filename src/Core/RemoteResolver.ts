import { Iterator, Option } from "@rbxts/rust-classes";

import {
	NetBuilderConfiguration,
	Remote,
	Definition,
	DefinitionMembers,
	DefinitionNamespace,
} from "../definitions";

import NamespaceId from "../Symbol/NamespaceId";
import NamespaceParent from "../Symbol/NamespaceParent";

import netBuilderWarn from "../Util/netBuilderWarn";
import getRemoteInstanceKind from "../Util/getRemoteInstanceKind";
import definitionInfo from "../Util/definitionInfo";
import netBuilderDebug from "../Util/netBuilderDebug";
import netBuilderError from "../Util/netBuilderError";
import symbolDictionary from "../Util/symbolDictionary";
import getConfiguration from "../Util/getConfiguration";
import { Timeout } from "../Util/constants";

interface TreeNode {
	Name: string;
	Remote: Option<Remote>;
}

interface Entry {
	Members: DefinitionMembers;
	Manager: RemoteResolver<Callback>;
	IsSender: boolean;
	Tree: ReadonlyArray<TreeNode>;
}

const ReplicatedStorage = game.GetService("ReplicatedStorage");

/** @internal */
class RemoteResolver<F extends Callback> {
	private static readonly entries = new Array<Entry>();

	private static defaultRootName = "NetBuilderRemotes";

	private static root: Instance;

	private constructor(private readonly remote: Remote<F>) {}

	private static generate(
		parent: Instance,
		tree: ReadonlyArray<TreeNode>,
		definition: Definition,
		isFirstCall = true,
	) {
		if (isFirstCall === true) {
			netBuilderDebug(
				definition,
				`Generating instances from object tree for ${definitionInfo(definition)}.`,
			);
		}

		const wasFound = Iterator.fromItems(...tree)
			.findMap<Remote<Callback>>((node) =>
				node.Remote.isSome() && parent.Name === node.Name ? node.Remote : Option.none(),
			)
			.andWith((remote) => {
				remote.Parent = parent;

				return Option.some(true);
			})
			.unwrapOr(false);

		if (!wasFound) {
			const newTree = [...tree];
			newTree.shift();

			const first = newTree[0];

			if (first) {
				const dir =
					parent.FindFirstChild(first.Name) ??
					this.createDirectory(first.Name, parent, definition);

				this.generate(dir as Folder, newTree, definition, false);
			}
		}

		return tree;
	}

	private static createTree(remote: Remote, definition: Definition) {
		const { root } = this;

		function visitNamespaces(tree: TreeNode[], namespace: DefinitionNamespace, first?: true) {
			const symbols = symbolDictionary(namespace);
			const name = symbols[NamespaceId] as string | undefined;
			const parent = symbols[NamespaceParent] as DefinitionNamespace | undefined;

			tree.unshift({
				Name: name ?? root.Name,
				Remote: first ? Option.some(remote) : Option.none(),
			});

			if (parent) visitNamespaces(tree, parent);

			return tree;
		}

		netBuilderDebug(definition, `Creating object tree for ${definitionInfo(definition)}.`);

		return visitNamespaces([], (definition as unknown as DefinitionMembers).Namespace, true);
	}

	private static createDirectory(name: string, parent: Instance, definition: Definition) {
		const folder = new Instance("Folder");
		folder.Parent = parent;
		folder.Name = name;

		netBuilderDebug(definition, `Created "${name}" directory.`);

		return folder;
	}

	private static findRootInstance(definition: DefinitionMembers) {
		return Option.wrap(this.root)
			.or(Option.wrap(ReplicatedStorage.FindFirstChild(this.getRootName(definition))))
			.or(Option.wrap(this.getRootInstance(definition)));
	}

	private static getRootName(definition: DefinitionMembers) {
		const config = getConfiguration(definition);

		return config.RootName ?? this.defaultRootName;
	}

	private static getRootInstance(definition: DefinitionMembers) {
		return getConfiguration(definition).RootInstance;
	}

	// Server
	public static For<F extends Callback>(definition: Definition, isSender: boolean) {
		const def = definition as unknown as DefinitionMembers;

		this.root = this.findRootInstance(def).unwrapOrElse(() =>
			this.createDirectory(this.getRootName(def), ReplicatedStorage, definition),
		);

		const { entries } = this;
		const { Id, Kind } = def;

		return Iterator.fromItems(...entries)
			.find(({ Members, IsSender }) => Members.Id === Id && IsSender === isSender)
			.andWith(({ Members, Manager, Tree }) => {
				if ((Members as unknown as Definition) === definition) {
					netBuilderError(
						definition,
						`Detected a duplicated server dispatcher of ${[
							...Tree.map(({ Name }) => Name),
							Id,
						].join(".")}. A new instance will not be created.`,
					);
				} else {
					netBuilderWarn(
						definition,
						`"${Id}" is conflicting with an existing ${getRemoteInstanceKind(
							Kind,
						)}.\n\nPath: ${[
							...Tree.map(({ Name }) => Name),
							Tree[0].Remote ? definitionInfo(def) : Id,
						].join(" -> ")}`,
					);
				}

				return Option.some(Manager);
			})
			.unwrapOrElse(() => {
				const Remote = new Instance(getRemoteInstanceKind(Kind)) as Remote<F>;
				Remote.Name = Id;

				const Manager = new RemoteResolver(Remote);

				entries.push({
					Tree: this.generate(this.root, this.createTree(Remote, definition), definition),
					Members: definition as unknown as DefinitionMembers,
					IsSender: isSender,
					Manager,
				});

				return Manager;
			})
			.GetInstance() as Remote<F>;
	}

	// Client
	public static Request<F extends Callback>(definition: DefinitionMembers) {
		const root = (
			this.findRootInstance(definition) as Option<{
				Name: string;
				Parent?: Instance;
			}>
		).expect("Could not reference root directory.");

		const parent = root.Parent!;

		return Promise.retryWithDelay(
			() =>
				Promise.defer((res, rej) => {
					const remote = parent.WaitForChild(root.Name).FindFirstChild(definition.Id, true);

					remote ? res(remote) : rej();
				}),
			math.huge,
			math.pi / 100,
		)
			.timeout(Timeout.Remote)
			.catch(() =>
				netBuilderWarn(definition, `Could not find ${definitionInfo(definition)} in the tree.`),
			)
			.await()[1] as Remote<F> | undefined;
	}

	public GetInstance() {
		return this.remote;
	}
}

export = RemoteResolver;
