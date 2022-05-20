import { NetBuilderLogger } from "../definitions";
import { DEFAULT_CONFIGURATION } from "../Util/constants";

class ConfigurationBuilder<O extends keyof ConfigurationBuilder = never> {
	private configuration = DEFAULT_CONFIGURATION;

	private toString() {
		return "NetBuilder.ConfigurationBuilder";
	}

	/** Changes the logger to all of the namespace's definitions. */
	public SetLogger(logger: NetBuilderLogger) {
		this.configuration.Logger = logger;

		return this as unknown as Omit<ConfigurationBuilder<O | "SetLogger">, O | "SetLogger">;
	}

	/** Changes the root directory default name. */
	public SetRootName(rootName: string) {
		this.configuration.RootName = rootName;

		return this as unknown as Omit<ConfigurationBuilder<O | "SetRootName">, O | "SetRootName">;
	}

	/** Sets the root instance of the remotes from the namespace. */
	public SetRootInstance(root: Instance) {
		this.configuration.RootInstance = root;

		return this as unknown as Omit<
			ConfigurationBuilder<O | "SetRootInstance">,
			O | "SetRootInstance"
		>;
	}

	/**
	 * Changes the warning/error messages text between brackets.
	 * e.g: `[netbuilder] Could not find remote instance.`
	 */
	public SetLabel(label: string) {
		this.configuration.Label = label;

		return this as unknown as Omit<ConfigurationBuilder<O | "SetLabel">, O | "SetLabel">;
	}

	/** Disables the warnings emitted from the namespace. */
	public SuppressWarnings(value = true) {
		this.configuration.SuppressWarnings = value;

		return this as unknown as Omit<
			ConfigurationBuilder<O | "SuppressWarnings">,
			O | "SuppressWarnings"
		>;
	}

	/** If set to true, functions will always return their latest successful value instead of throwing an error when a middleware fails. */
	public CacheFunctions(value = true) {
		this.configuration.CacheFunctions = value;

		return this as unknown as Omit<ConfigurationBuilder<O | "CacheFunctions">, O | "CacheFunctions">;
	}

	/** Generates remotes for all the registered definitions, regardless if they are being used or not. */
	public PreGenerateRemotes(value = true) {
		this.configuration.PreGeneration = value;

		return this as unknown as Omit<
			ConfigurationBuilder<O | "PreGenerateRemotes">,
			O | "PreGenerateRemotes"
		>;
	}

	/** Activates debug mode. */
	public Debug(value = true) {
		this.configuration.Debug = value;

		return this as unknown as Omit<ConfigurationBuilder<O | "Debug">, O | "Debug">;
	}

	private Build() {
		return this.configuration;
	}
}

export = ConfigurationBuilder;
