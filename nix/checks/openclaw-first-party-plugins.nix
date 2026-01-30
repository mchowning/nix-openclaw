{ lib, pkgs, home-manager }:

let
  eval = home-manager.lib.homeManagerConfiguration {
    pkgs = pkgs;
    modules = [
      ../modules/home-manager/openclaw.nix
      ({ lib, options, ... }: {
        config = {
          home.homeDirectory = "/tmp";
          home.username = "openclaw";
          home.stateVersion = "24.11";
          programs.git.enable = false;
          programs.openclaw = {
            enable = true;
            launchd.enable = false;
            systemd.enable = false;
            instances.default = {};
            firstParty = lib.mapAttrs (_: _: { enable = true; }) options.programs.openclaw.firstParty;
          };
        };
      })
    ];
  };
  evalKey = builtins.deepSeq eval.config.home.file "ok";
in
pkgs.stdenvNoCC.mkDerivation {
  name = "openclaw-first-party-plugins-${evalKey}";
  dontUnpack = true;
  installPhase = "${../scripts/empty-install.sh}";
}
