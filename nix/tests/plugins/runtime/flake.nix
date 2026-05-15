{
  outputs =
    { self }:
    {
      openclawPlugin = {
        name = "runtime";
        skills = [ ];
        packages = [ ];
        needs = { };
        plugins = [
          {
            id = "runtime-test";
            path = "${self.outPath}/plugin";
          }
          {
            id = "runtime-disabled";
            path = "${self.outPath}/disabled-plugin";
            enabled = false;
          }
        ];
      };
    };
}
