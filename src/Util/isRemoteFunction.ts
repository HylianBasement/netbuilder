export = (value: Instance): value is RemoteFunction => value.ClassName === "RemoteFunction";
